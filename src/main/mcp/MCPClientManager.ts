import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { getAugmentedEnv } from '../util/nodeResolver.js'
import type { MCPServerConfig } from './MCPServerConfig.js'

export interface ConnectedTool {
  serverId: string
  serverName: string
  tool: {
    name: string
    description?: string
    inputSchema: Record<string, unknown>
  }
}

export class MCPClientManager {
  private clients = new Map<string, Client>()
  private configs: MCPServerConfig[] = []
  private connectionErrors = new Map<string, string>()
  private toolCounts = new Map<string, number>()

  setConfigs(configs: MCPServerConfig[]): void {
    // Disconnect servers no longer in the list
    const newIds = new Set(configs.map((c) => c.id))
    for (const [id, client] of this.clients) {
      if (!newIds.has(id)) {
        client.close().catch(() => {})
        this.clients.delete(id)
        this.toolCounts.delete(id)
        this.connectionErrors.delete(id)
      }
    }
    this.configs = configs
  }

  private async connectServer(config: MCPServerConfig): Promise<Client> {
    const client = new Client(
      { name: 'mcp-browser', version: '1.0.0' },
      { capabilities: { tools: {} } }
    )

    if (config.transport === 'stdio') {
      // Use augmented PATH so node is always found, even in packaged apps
      const env = getAugmentedEnv(process.env)
      if (config.apiKeyEnvVar && config.resolvedApiKey) {
        env[config.apiKeyEnvVar] = config.resolvedApiKey
      }
      const transport = new StdioClientTransport({
        command: config.command!,
        args: config.args ?? [],
        env
      })
      await client.connect(transport)
    } else {
      // HTTP: try Streamable HTTP first, fall back to SSE
      const baseUrl = new URL(config.url!)
      try {
        const transport = new StreamableHTTPClientTransport(baseUrl)
        await client.connect(transport)
      } catch {
        const sseTransport = new SSEClientTransport(baseUrl)
        await client.connect(sseTransport)
      }
    }

    return client
  }

  async getOrConnect(serverId: string): Promise<Client> {
    if (this.clients.has(serverId)) {
      return this.clients.get(serverId)!
    }
    const config = this.configs.find((c) => c.id === serverId)
    if (!config) throw new Error(`Unknown server: ${serverId}`)
    const client = await this.connectServer(config)
    this.clients.set(serverId, client)
    return client
  }

  async getAllTools(): Promise<ConnectedTool[]> {
    const allTools: ConnectedTool[] = []
    for (const config of this.configs) {
      try {
        const client = await this.getOrConnect(config.id)
        const { tools } = await client.listTools()
        this.toolCounts.set(config.id, tools.length)
        this.connectionErrors.delete(config.id)
        for (const tool of tools) {
          allTools.push({
            serverId: config.id,
            serverName: config.name,
            tool: {
              // Namespace to avoid collisions between servers
              name: `${config.id}__${tool.name}`,
              description: tool.description,
              inputSchema: tool.inputSchema as Record<string, unknown>
            }
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        this.connectionErrors.set(config.id, msg)
        this.toolCounts.set(config.id, 0)
        console.error(`[MCPClientManager] Failed to connect to ${config.id}:`, msg)
        // Non-fatal: continue with remaining servers
      }
    }
    return allTools
  }

  async callTool(namespacedToolName: string, input: Record<string, unknown>): Promise<unknown> {
    const separatorIndex = namespacedToolName.indexOf('__')
    if (separatorIndex === -1) {
      throw new Error(`Invalid namespaced tool name: ${namespacedToolName}`)
    }
    const serverId = namespacedToolName.slice(0, separatorIndex)
    const toolName = namespacedToolName.slice(separatorIndex + 2)
    const client = await this.getOrConnect(serverId)
    const result = await client.callTool({ name: toolName, arguments: input })
    return result.content
  }

  getConnectionError(serverId: string): string | null {
    return this.connectionErrors.get(serverId) ?? null
  }

  getAllConnectionErrors(): Record<string, string> {
    return Object.fromEntries(this.connectionErrors)
  }

  getToolCount(serverId: string): number {
    return this.toolCounts.get(serverId) ?? 0
  }

  isConnected(serverId: string): boolean {
    return this.clients.has(serverId)
  }

  async disconnectAll(): Promise<void> {
    for (const [, client] of this.clients) {
      try {
        await client.close()
      } catch {
        // Best effort
      }
    }
    this.clients.clear()
    this.toolCounts.clear()
    this.connectionErrors.clear()
  }
}
