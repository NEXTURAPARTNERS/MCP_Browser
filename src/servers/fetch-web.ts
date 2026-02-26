/**
 * Bundled web-fetch MCP server.
 * Uses @modelcontextprotocol/sdk 1.x (same version as the client).
 * Built into out/servers/fetch-web.mjs as a self-contained bundle.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { request as httpsRequest } from 'https'
import { request as httpRequest } from 'http'
import { IncomingMessage } from 'http'

const server = new Server(
  { name: 'web-fetch', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'fetch',
      description: 'Fetch the content of a URL and return its text content.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          url: { type: 'string', description: 'The URL to fetch' },
          max_length: {
            type: 'number',
            description: 'Maximum number of characters to return (default: 30000)',
            default: 30000
          }
        },
        required: ['url']
      }
    }
  ]
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = req.params.arguments as Record<string, unknown>
  const url = args?.url as string
  const maxLength = (args?.max_length as number) ?? 30000

  if (!url) {
    return { content: [{ type: 'text' as const, text: 'Error: url parameter is required' }] }
  }

  try {
    new URL(url) // validate URL
  } catch {
    return { content: [{ type: 'text' as const, text: `Error: invalid URL: ${url}` }] }
  }

  try {
    const content = await fetchUrl(url, maxLength, 0)
    return { content: [{ type: 'text' as const, text: content }] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { content: [{ type: 'text' as const, text: `Fetch error: ${msg}` }] }
  }
})

function fetchUrl(url: string, maxLength: number, redirectCount: number): Promise<string> {
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'))

  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const makeRequest = parsed.protocol === 'https:' ? httpsRequest : httpRequest

    const req = makeRequest(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
          Accept: 'text/html,text/plain,application/json,*/*;q=0.9',
          'Accept-Language': 'en-US,en;q=0.9,nl;q=0.8'
        },
        timeout: 20000
      },
      (res: IncomingMessage) => {
        // Follow redirects
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const redirect = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href
          fetchUrl(redirect, maxLength, redirectCount + 1).then(resolve).catch(reject)
          res.resume()
          return
        }

        if (res.statusCode && res.statusCode >= 400) {
          res.resume()
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
          return
        }

        let data = ''
        let truncated = false
        res.on('data', (chunk: Buffer) => {
          if (!truncated) {
            data += chunk.toString()
            if (data.length > maxLength) {
              data = data.slice(0, maxLength)
              truncated = true
              res.destroy()
            }
          }
        })
        res.on('end', () => {
          resolve(truncated ? data + '\n\n[Content truncated]' : data)
        })
        res.on('error', (err) => {
          // 'aborted' is expected when we destroy the stream after truncation
          if (truncated) resolve(data + '\n\n[Content truncated]')
          else reject(err)
        })
      }
    )

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timed out after 20s'))
    })
    req.end()
  })
}

const transport = new StdioServerTransport()
await server.connect(transport)
