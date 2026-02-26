/**
 * Bundled DuckDuckGo search MCP server.
 * Uses @modelcontextprotocol/sdk 1.x (same version as the client).
 * Built into out/servers/search.mjs as a self-contained bundle.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { request } from 'https'
import { IncomingMessage } from 'http'

const server = new Server(
  { name: 'duckduckgo-search', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search',
      description:
        'Search the web using DuckDuckGo. Returns titles, URLs and snippets for relevant results.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'The search query' },
          max_results: {
            type: 'number',
            description: 'Maximum number of results to return (default: 8)',
            default: 8
          }
        },
        required: ['query']
      }
    }
  ]
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = req.params.arguments as Record<string, unknown>
  const query = args?.query as string
  const maxResults = (args?.max_results as number) ?? 8

  if (!query) {
    return { content: [{ type: 'text' as const, text: 'Error: query parameter is required' }] }
  }

  try {
    const results = await duckduckgoSearch(query, maxResults)
    return { content: [{ type: 'text' as const, text: results }] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { content: [{ type: 'text' as const, text: `Search error: ${msg}` }] }
  }
})

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.9',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 15000
      },
      (res: IncomingMessage) => {
        // Follow redirect
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          fetchUrl(res.headers.location).then(resolve).catch(reject)
          res.resume()
          return
        }
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => resolve(data))
        res.on('error', reject)
      }
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timed out'))
    })
    req.end()
  })
}

async function duckduckgoSearch(query: string, maxResults: number): Promise<string> {
  // Use DuckDuckGo lite HTML (simpler HTML, easier to parse)
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`
  const html = await fetchUrl(url)

  const results: { title: string; url: string; snippet: string }[] = []

  // Extract links and snippets from DDG lite HTML
  // Pattern: <a class="result-link" href="URL">TITLE</a>
  const linkPattern = /<a[^>]+class="result-link"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi
  const snippetPattern = /<td[^>]+class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi

  const links: { url: string; title: string }[] = []
  let match: RegExpExecArray | null

  while ((match = linkPattern.exec(html)) !== null && links.length < maxResults) {
    const href = match[1]
    const title = match[2].trim()
    // DDG lite uses redirect URLs, extract the actual URL
    const actualUrl = href.startsWith('//duckduckgo.com/l/')
      ? decodeURIComponent(href.split('uddg=')[1]?.split('&')[0] ?? href)
      : href
    links.push({ url: actualUrl, title })
  }

  const snippets: string[] = []
  while ((match = snippetPattern.exec(html)) !== null) {
    const snippet = match[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ')
    snippets.push(snippet)
  }

  for (let i = 0; i < links.length; i++) {
    results.push({
      title: links[i].title,
      url: links[i].url,
      snippet: snippets[i] ?? ''
    })
  }

  if (results.length === 0) {
    return `No results found for: ${query}`
  }

  return (
    `DuckDuckGo search results for "${query}":\n\n` +
    results
      .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet}`)
      .join('\n\n')
  )
}

const transport = new StdioServerTransport()
await server.connect(transport)
