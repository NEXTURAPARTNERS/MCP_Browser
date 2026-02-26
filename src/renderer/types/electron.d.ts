export type ProgressEvent =
  | { type: 'tool_call'; toolName: string; serverId: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolName: string; ok: boolean }
  | { type: 'thinking'; text: string }
  | { type: 'done'; html: string }
  | { type: 'error'; message: string }

export interface MCPServerConfig {
  id: string
  name: string
  description: string
  transport: 'stdio' | 'http'
  command?: string
  args?: string[]
  url?: string
  requiresApiKey?: boolean
  apiKeyEnvVar?: string
  category: 'search' | 'knowledge' | 'utility' | 'custom'
  defaultEnabled: boolean
}

export interface ServerWithStatus {
  config: MCPServerConfig
  enabled: boolean
  connected: boolean
  toolCount: number
  error: string | null
}

export interface RegistryServer {
  name: string
  title?: string
  description: string
  packages: Array<{
    registryType: 'npm' | 'pypi' | 'docker'
    name: string
    version?: string
    runtime?: string
  }>
  homepage?: string
}

interface MCPBrowserAPI {
  submitQuery(query: string): Promise<void>
  onQueryProgress(callback: (event: ProgressEvent) => void): () => void
  getAllServers(): Promise<ServerWithStatus[]>
  setServerEnabled(id: string, enabled: boolean): Promise<void>
  addCustomServer(config: MCPServerConfig): Promise<{ ok: boolean }>
  removeServer(id: string): Promise<void>
  searchRegistry(query: string): Promise<RegistryServer[]>
  setApiKey(key: string, type?: string): Promise<void>
  hasApiKey(): Promise<boolean>

  // AI Backend
  getBackend(): Promise<'claude' | 'ollama'>
  setBackend(backend: 'claude' | 'ollama'): Promise<void>

  // Anthropic config
  getAnthropicConfig(): Promise<{ baseUrl: string; model: string }>
  setAnthropicConfig(baseUrl: string, model: string): Promise<void>

  // Ollama / OpenAI-compatible config
  getOllamaConfig(): Promise<{ url: string; model: string; hasKey: boolean }>
  setOllamaConfig(url: string, model: string, key?: string): Promise<void>
  testOllamaConnection(url: string, key?: string): Promise<{ ok: boolean; error?: string }>
  fetchOllamaModels(url: string, key?: string): Promise<string[]>

  openExternal(url: string): Promise<void>
}

declare global {
  interface Window {
    mcpBrowser: MCPBrowserAPI
  }
}
