import { ipcMain, shell, BrowserWindow } from 'electron'
import { IPC } from './channels.js'
import { AgentLoop } from '../claude/AgentLoop.js'
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
    const apiKey = store.loadApiKey()
    if (!apiKey) {
      throw new Error('Geen Claude API-sleutel geconfigureerd. Voeg deze toe in de instellingen.')
    }

    const mainWindow = getMainWindow()
    const loop = new AgentLoop(apiKey, mcpManager)

    for await (const progressEvent of loop.run(query)) {
      if (!event.sender.isDestroyed()) {
        event.sender.send(IPC.QUERY_PROGRESS, progressEvent)
      }
      if (progressEvent.type === 'done' || progressEvent.type === 'error') break
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
    // Generate a unique id if not provided
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
    // Reload enabled configs in case Brave key was just added
    mcpManager.setConfigs(store.getEnabledServerConfigs())
  })

  ipcMain.handle(IPC.API_KEY_HAS, () => {
    return store.hasApiKey()
  })

  // --- System ---
  ipcMain.handle(IPC.OPEN_EXTERNAL, (_, url: string) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
  })
}
