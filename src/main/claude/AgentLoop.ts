import Anthropic from '@anthropic-ai/sdk'
import type { MCPClientManager } from '../mcp/MCPClientManager.js'

export type ProgressEvent =
  | { type: 'tool_call'; toolName: string; serverId: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolName: string; ok: boolean }
  | { type: 'thinking'; text: string }
  | { type: 'done'; html: string }
  | { type: 'error'; message: string }

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

export class AgentLoop {
  private anthropic: Anthropic
  private mcpManager: MCPClientManager

  constructor(apiKey: string, mcpManager: MCPClientManager) {
    this.anthropic = new Anthropic({ apiKey })
    this.mcpManager = mcpManager
  }

  async *run(userQuery: string): AsyncGenerator<ProgressEvent> {
    // 1. Gather all tools from enabled MCP servers
    let tools: Anthropic.Tool[]
    try {
      const connectedTools = await this.mcpManager.getAllTools()
      tools = connectedTools.map((ct) => ({
        name: ct.tool.name,
        description: ct.tool.description ?? '',
        input_schema: ct.tool.inputSchema as Anthropic.Tool['input_schema']
      }))
    } catch (err) {
      yield { type: 'error', message: `Kon geen MCP-tools laden: ${String(err)}` }
      return
    }

    if (tools.length === 0) {
      // Collect actual connection errors to show the user what went wrong
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
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userQuery }]

    // 3. Agentic loop
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      let response: Anthropic.Message
      try {
        response = await this.anthropic.messages.create({
          model: 'claude-opus-4-6',
          max_tokens: 8192,
          system: SYSTEM_PROMPT,
          tools,
          messages
        })
      } catch (err) {
        yield { type: 'error', message: `Claude API fout: ${String(err)}` }
        return
      }

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === 'text'
      )

      // Stream intermediate reasoning text
      for (const tb of textBlocks) {
        if (tb.text.trim()) {
          yield { type: 'thinking', text: tb.text }
        }
      }

      // No tool calls → final answer
      if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
        const finalText = textBlocks.map((b) => b.text).join('')
        yield { type: 'done', html: extractOrWrapHTML(finalText, userQuery) }
        return
      }

      // Add Claude's response to history
      messages.push({ role: 'assistant', content: response.content })

      // Execute tool calls
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const toolUse of toolUseBlocks) {
        const serverId = toolUse.name.split('__')[0]
        yield {
          type: 'tool_call',
          toolName: toolUse.name,
          serverId,
          input: toolUse.input as Record<string, unknown>
        }

        try {
          const result = await this.mcpManager.callTool(
            toolUse.name,
            toolUse.input as Record<string, unknown>
          )
          const resultText = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          yield { type: 'tool_result', toolName: toolUse.name, ok: true }
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: resultText
          })
        } catch (err) {
          yield { type: 'tool_result', toolName: toolUse.name, ok: false }
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `Fout bij uitvoeren tool: ${String(err)}`,
            is_error: true
          })
        }
      }

      // Feed results back
      messages.push({ role: 'user', content: toolResults })
    }

    yield {
      type: 'error',
      message: `Maximaal aantal stappen (${MAX_ITERATIONS}) bereikt zonder definitief antwoord.`
    }
  }
}

function extractOrWrapHTML(text: string, query: string): string {
  // Try to extract a full HTML document from the text
  const doctypeIdx = text.indexOf('<!DOCTYPE')
  const htmlCloseIdx = text.lastIndexOf('</html>')
  if (doctypeIdx >= 0 && htmlCloseIdx > doctypeIdx) {
    return text.slice(doctypeIdx, htmlCloseIdx + 7)
  }

  // Wrap plain text / markdown in minimal HTML
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
      // Code blocks
      .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Headings
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Unordered list items
      .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
      // Paragraphs (blank line separated)
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hlu]|<pre|<block)(.+)$/gm, (m) => m)
  )
}
