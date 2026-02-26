import type { MCPClientManager } from '../mcp/MCPClientManager.js'
import type { ProgressEvent } from './AgentLoop.js'

const SYSTEM_PROMPT = `You are MCP Browser, an AI-powered information browser.
The user has asked a question. Use the available tools to gather accurate, up-to-date information.
After gathering enough information, synthesize a comprehensive answer.

Return your final answer as a complete, self-contained HTML document with the following requirements:
- Start exactly with <!DOCTYPE html>
- Use inline styles only (no external CSS links or <link> tags)
- Use a clean, modern sans-serif font (font-family: system-ui, -apple-system, sans-serif)
- max-width: 820px, margin: 0 auto, comfortable line-height (1.65), padding: 32px 24px
- Use proper headings (h1, h2, h3), paragraphs, lists, blockquotes
- Include source citations as clickable links where applicable
- Color scheme: white background, #1a1a2e headings, #333 body text, #0066cc links
- DO NOT include any JavaScript
- Return ONLY the HTML document as your final response, no other text around it`

const MAX_ITERATIONS = 20

interface OpenAITool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
}

interface OpenAIResponse {
  choices: Array<{
    finish_reason: 'stop' | 'tool_calls' | 'length' | string
    message: {
      role: 'assistant'
      content: string | null
      tool_calls?: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
      }>
    }
  }>
}

export class OllamaAgentLoop {
  private baseUrl: string
  private model: string
  private apiKey: string | null
  private mcpManager: MCPClientManager

  constructor(
    url: string,
    model: string,
    apiKey: string | null,
    mcpManager: MCPClientManager
  ) {
    // Strip trailing slash
    this.baseUrl = url.replace(/\/+$/, '')
    this.model = model
    this.apiKey = apiKey
    this.mcpManager = mcpManager
  }

  async *run(userQuery: string): AsyncGenerator<ProgressEvent> {
    // 1. Gather tools
    let tools: OpenAITool[]
    try {
      const connectedTools = await this.mcpManager.getAllTools()
      tools = connectedTools.map((ct) => ({
        type: 'function' as const,
        function: {
          name: ct.tool.name,
          description: ct.tool.description ?? '',
          parameters: (ct.tool.inputSchema as Record<string, unknown>) ?? { type: 'object', properties: {} }
        }
      }))
    } catch (err) {
      yield { type: 'error', message: `Kon geen MCP-tools laden: ${String(err)}` }
      return
    }

    if (tools.length === 0) {
      const errors = this.mcpManager.getAllConnectionErrors()
      const errorLines = Object.entries(errors)
        .map(([id, msg]) => `• ${id}: ${msg}`)
        .join('\n')
      const message = errorLines
        ? `Geen MCP-servers konden verbinden:\n\n${errorLines}\n\nControleer of Node.js correct is geïnstalleerd en of de servers zijn ingeschakeld.`
        : 'Geen MCP-servers actief. Schakel minstens één server in via ⚙ Instellingen.'
      yield { type: 'error', message }
      return
    }

    // 2. Build message history
    const messages: OpenAIMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userQuery }
    ]

    // 3. Agentic loop
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      let response: OpenAIResponse
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`

        const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: this.model,
            messages,
            tools: tools.length > 0 ? tools : undefined,
            tool_choice: tools.length > 0 ? 'auto' : undefined
          }),
          signal: AbortSignal.timeout(120_000)
        })

        if (!res.ok) {
          const errText = await res.text().catch(() => res.statusText)
          yield { type: 'error', message: `OpenAI API fout ${res.status}: ${errText}` }
          return
        }

        response = (await res.json()) as OpenAIResponse
      } catch (err) {
        yield { type: 'error', message: `Verbindingsfout: ${String(err)}` }
        return
      }

      const choice = response.choices?.[0]
      if (!choice) {
        yield { type: 'error', message: 'Leeg antwoord van API.' }
        return
      }

      const { finish_reason, message } = choice
      const toolCalls = message.tool_calls ?? []
      const textContent = message.content ?? ''

      // Stream reasoning text
      if (textContent.trim()) {
        yield { type: 'thinking', text: textContent }
      }

      // No tool calls → final answer
      if (finish_reason === 'stop' || toolCalls.length === 0) {
        yield { type: 'done', html: extractOrWrapHTML(textContent, userQuery) }
        return
      }

      // Add assistant message to history
      messages.push({
        role: 'assistant',
        content: textContent || null,
        tool_calls: toolCalls
      })

      // Execute tool calls
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name
        const serverId = toolName.split('__')[0]
        let toolInput: Record<string, unknown> = {}
        try {
          toolInput = JSON.parse(toolCall.function.arguments || '{}') as Record<string, unknown>
        } catch {
          // keep empty object
        }

        yield { type: 'tool_call', toolName, serverId, input: toolInput }

        try {
          const result = await this.mcpManager.callTool(toolName, toolInput)
          const resultText = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          yield { type: 'tool_result', toolName, ok: true }
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: resultText
          })
        } catch (err) {
          yield { type: 'tool_result', toolName, ok: false }
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `Fout bij uitvoeren tool: ${String(err)}`
          })
        }
      }
    }

    yield {
      type: 'error',
      message: `Maximaal aantal stappen (${MAX_ITERATIONS}) bereikt zonder definitief antwoord.`
    }
  }
}

function extractOrWrapHTML(text: string, query: string): string {
  const doctypeIdx = text.indexOf('<!DOCTYPE')
  const htmlCloseIdx = text.lastIndexOf('</html>')
  if (doctypeIdx >= 0 && htmlCloseIdx > doctypeIdx) {
    return text.slice(doctypeIdx, htmlCloseIdx + 7)
  }

  const escaped = escapeHTML(query)
  const body = simpleMarkdownToHTML(text)
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escaped}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 820px; margin: 0 auto; padding: 32px 24px; line-height: 1.65; color: #333; background: #fff; }
  h1 { color: #1a1a2e; border-bottom: 2px solid #e8e8e8; padding-bottom: 12px; }
  h2, h3 { color: #1a1a2e; margin-top: 1.5em; }
  a { color: #0066cc; }
  pre { background: #f4f4f4; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 0.9em; }
  code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
  ul, ol { padding-left: 1.5em; }
</style>
</head>
<body>
<h1>${escaped}</h1>
${body}
</body>
</html>`
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function simpleMarkdownToHTML(text: string): string {
  return (
    text
      .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hlu]|<pre|<block)(.+)$/gm, (m) => m)
  )
}
