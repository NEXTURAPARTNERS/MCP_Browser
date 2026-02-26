import Store from 'electron-store'
import { safeStorage } from 'electron'
import { BUILTIN_SERVERS } from '../registry/builtinServers.js'
import type { MCPServerConfig, ServerWithStatus } from '../mcp/MCPServerConfig.js'

interface StoreSchema {
  encryptedApiKey: string
  encryptedBraveApiKey: string
  enabledServers: string[]
  customServers: MCPServerConfig[]
}

export class AppStore {
  private store: Store<StoreSchema>

  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'mcp-browser',
      defaults: {
        encryptedApiKey: '',
        encryptedBraveApiKey: '',
        enabledServers: BUILTIN_SERVERS.filter((s) => s.defaultEnabled).map((s) => s.id),
        customServers: []
      }
    })
  }

  // --- API Key (Claude) ---

  saveApiKey(plaintext: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      // Fallback: store as-is (development only)
      this.store.set('encryptedApiKey', plaintext)
      return
    }
    const encrypted = safeStorage.encryptString(plaintext)
    this.store.set('encryptedApiKey', encrypted.toString('base64'))
  }

  loadApiKey(): string | null {
    const stored = this.store.get('encryptedApiKey', '')
    if (!stored) return null
    if (!safeStorage.isEncryptionAvailable()) return stored
    try {
      return safeStorage.decryptString(Buffer.from(stored, 'base64'))
    } catch {
      return null
    }
  }

  hasApiKey(): boolean {
    return !!this.store.get('encryptedApiKey', '')
  }

  // --- Optional Brave API Key ---

  saveBraveApiKey(plaintext: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      this.store.set('encryptedBraveApiKey', plaintext)
      return
    }
    const encrypted = safeStorage.encryptString(plaintext)
    this.store.set('encryptedBraveApiKey', encrypted.toString('base64'))
  }

  loadBraveApiKey(): string | null {
    const stored = this.store.get('encryptedBraveApiKey', '')
    if (!stored) return null
    if (!safeStorage.isEncryptionAvailable()) return stored
    try {
      return safeStorage.decryptString(Buffer.from(stored, 'base64'))
    } catch {
      return null
    }
  }

  // --- Server management ---

  getEnabledServerIds(): string[] {
    const stored = this.store.get('enabledServers', [])
    const knownIds = new Set([...BUILTIN_SERVERS, ...this.getCustomServers()].map((s) => s.id))

    // Filter out any stale IDs from old runs
    const valid = stored.filter((id) => knownIds.has(id))

    // If nothing valid remains, reset to built-in defaults
    if (valid.length === 0) {
      const defaults = BUILTIN_SERVERS.filter((s) => s.defaultEnabled).map((s) => s.id)
      this.store.set('enabledServers', defaults)
      return defaults
    }

    return valid
  }

  setServerEnabled(id: string, enabled: boolean): void {
    const current = this.store.get('enabledServers', [])
    if (enabled && !current.includes(id)) {
      this.store.set('enabledServers', [...current, id])
    } else if (!enabled) {
      this.store.set(
        'enabledServers',
        current.filter((sid) => sid !== id)
      )
    }
  }

  getCustomServers(): MCPServerConfig[] {
    return this.store.get('customServers', [])
  }

  addCustomServer(config: MCPServerConfig): void {
    const current = this.getCustomServers()
    this.store.set('customServers', [...current, config])
  }

  removeCustomServer(id: string): void {
    const current = this.getCustomServers()
    this.store.set(
      'customServers',
      current.filter((s) => s.id !== id)
    )
    this.setServerEnabled(id, false)
  }

  getAllServers(): MCPServerConfig[] {
    return [...BUILTIN_SERVERS, ...this.getCustomServers()]
  }

  getEnabledServerConfigs(): MCPServerConfig[] {
    const enabledIds = new Set(this.getEnabledServerIds())
    const braveKey = this.loadBraveApiKey()
    return this.getAllServers()
      .filter((s) => enabledIds.has(s.id))
      .map((s) => {
        if (s.id === 'brave-search' && braveKey) {
          return { ...s, resolvedApiKey: braveKey }
        }
        return s
      })
  }

  getAllServersWithStatus(
    mcpManager?: {
      isConnected: (id: string) => boolean
      getToolCount: (id: string) => number
      getConnectionError: (id: string) => string | null
    }
  ): ServerWithStatus[] {
    const enabledIds = new Set(this.getEnabledServerIds())
    return this.getAllServers().map((config) => ({
      config,
      enabled: enabledIds.has(config.id),
      connected: mcpManager?.isConnected(config.id) ?? false,
      toolCount: mcpManager?.getToolCount(config.id) ?? 0,
      error: mcpManager?.getConnectionError(config.id) ?? null
    }))
  }
}
