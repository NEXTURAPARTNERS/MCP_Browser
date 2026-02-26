import { ipcMain, shell, BrowserWindow } from 'electron'
import { IPC } from './channels.js'
import { AgentLoop } from '../claude/AgentLoop.js'
import { OllamaAgentLoop } from '../claude/OllamaAgentLoop.js'
import { MCPClientManager } from '../mcp/MCPClientManager.js'
import { AppStore } from '../store/AppStore.js'
import { searchRegistry, listRegistry } from '../registry/RegistryClient.js'
import type { MCPServerConfig } from '../mcp/MCPServerConfig.js'

export function registerHandlers(
  store: AppStore,
  mcpManager: MCPClientManager,
  getMainWindow: () => BrowserWindow | null
): void {
  // --- Query ---
  ipcMain.handle(IPC.QUERY_SUBMIT, async (event, query: string) => {
    const backend = store.getAiBackend()

    if (backend === 'ollama') {
      const url = store.getOllamaUrl()
      if (!url) {
        throw new Error('Geen Ollama/OpenAI-compatibele URL geconfigureerd. Voeg deze toe in de instellingen.')
      }
      const model = store.getOllamaModel()
      const apiKey = store.loadOllamaKey()
      const loop = new OllamaAgentLoop(url, model, apiKey, mcpManager)
      for await (const progressEvent of loop.run(query)) {
        if (!event.sender.isDestroyed()) {
          event.sender.send(IPC.QUERY_PROGRESS, progressEvent)
        }
        if (progressEvent.type === 'done' || progressEvent.type === 'error') break
      }
    } else {
      const apiKey = store.loadApiKey()
      if (!apiKey) {
        throw new Error('Geen Anthropic API-sleutel geconfigureerd. Voeg deze toe in de instellingen.')
      }
      const baseUrl = store.getAnthropicBaseUrl() || undefined
      const model = store.getAnthropicModel() || undefined
      const loop = new AgentLoop(apiKey, mcpManager, baseUrl, model)
      for await (const progressEvent of loop.run(query)) {
        if (!event.sender.isDestroyed()) {
          event.sender.send(IPC.QUERY_PROGRESS, progressEvent)
        }
        if (progressEvent.type === 'done' || progressEvent.type === 'error') break
      }
    }

    return { ok: true }
  })

  // --- Server management ---
  ipcMain.handle(IPC.SERVERS_GET_ALL, () => {
    return store.getAllServersWithStatus(mcpManager)
  })

  ipcMain.handle(IPC.SERVERS_SET_ENABLED, (_, id: string, enabled: boolean) => {
    store.setServerEnabled(id, enabled)
    mcpManager.setConfigs(store.getEnabledServerConfigs())
  })

  ipcMain.handle(IPC.SERVERS_ADD_CUSTOM, (_, config: MCPServerConfig) => {
    if (!config.id) {
      config.id = `custom-${Date.now()}`
    }
    config.category = 'custom'
    config.defaultEnabled = false
    store.addCustomServer(config)
    return { ok: true }
  })

  ipcMain.handle(IPC.SERVERS_REMOVE, (_, id: string) => {
    store.removeCustomServer(id)
    mcpManager.setConfigs(store.getEnabledServerConfigs())
  })

  ipcMain.handle(IPC.REGISTRY_SEARCH, (_, query: string) => {
    if (!query?.trim()) return listRegistry(30)
    return searchRegistry(query)
  })

  // --- API Key ---
  ipcMain.handle(IPC.API_KEY_SET, (_, key: string, type?: string) => {
    if (type === 'brave') {
      store.saveBraveApiKey(key)
    } else {
      store.saveApiKey(key)
    }
    mcpManager.setConfigs(store.getEnabledServerConfigs())
  })

  ipcMain.handle(IPC.API_KEY_HAS, () => {
    return store.hasApiKey()
  })

  // --- AI Backend ---
  ipcMain.handle(IPC.BACKEND_GET, () => {
    return store.getAiBackend()
  })

  ipcMain.handle(IPC.BACKEND_SET, (_, backend: 'claude' | 'ollama') => {
    store.setAiBackend(backend)
  })

  // --- Anthropic config ---
  ipcMain.handle(IPC.ANTHROPIC_CONFIG_GET, () => {
    return {
      baseUrl: store.getAnthropicBaseUrl(),
      model: store.getAnthropicModel()
    }
  })

  ipcMain.handle(IPC.ANTHROPIC_CONFIG_SET, (_, baseUrl: string, model: string) => {
    store.saveAnthropicConfig(baseUrl, model)
  })

  // --- Ollama / OpenAI-compatible config ---
  ipcMain.handle(IPC.OLLAMA_CONFIG_GET, () => {
    return {
      url: store.getOllamaUrl(),
      model: store.getOllamaModel(),
      hasKey: !!store.loadOllamaKey()
    }
  })

  ipcMain.handle(IPC.OLLAMA_CONFIG_SET, (_, url: string, model: string, key?: string) => {
    store.saveOllamaConfig(url, model)
    if (key) store.saveOllamaKey(key)
  })

  ipcMain.handle(IPC.OLLAMA_TEST_CONNECTION, async (_, url: string, key?: string) => {
    const baseUrl = url.replace(/\/+$/, '')
    const headers: Record<string, string> = {}
    if (key) headers['Authorization'] = `Bearer ${key}`
    try {
      const res = await fetch(`${baseUrl}/v1/models`, {
        headers,
        signal: AbortSignal.timeout(5000)
      })
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.OLLAMA_FETCH_MODELS, async (_, url: string, key?: string) => {
    const baseUrl = url.replace(/\/+$/, '')
    const headers: Record<string, string> = {}
    if (key) headers['Authorization'] = `Bearer ${key}`
    try {
      const res = await fetch(`${baseUrl}/v1/models`, {
        headers,
        signal: AbortSignal.timeout(5000)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const data = (await res.json()) as { data?: Array<{ id: string }> }
      return (data.data ?? []).map((m) => m.id)
    } catch (err) {
      throw new Error(`Kon modellen niet ophalen: ${String(err)}`)
    }
  })

  // --- System ---
  ipcMain.handle(IPC.OPEN_EXTERNAL, (_, url: string) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
  })
}
