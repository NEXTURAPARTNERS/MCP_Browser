export interface MCPServerConfig {
  id: string
  name: string
  description: string
  transport: 'stdio' | 'http'
  // stdio fields
  command?: string
  args?: string[]
  // http fields
  url?: string
  // optional API key support
  requiresApiKey?: boolean
  apiKeyEnvVar?: string
  apiKeySettingKey?: string
  // metadata
  category: 'search' | 'knowledge' | 'utility' | 'custom'
  defaultEnabled: boolean
  // resolved at runtime (not persisted)
  resolvedApiKey?: string
}

export interface ServerWithStatus {
  config: MCPServerConfig
  enabled: boolean
  connected: boolean
  toolCount: number
  error: string | null
}
