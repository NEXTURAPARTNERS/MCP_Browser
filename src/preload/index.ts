import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../main/ipc/channels.js'

// Types shared with renderer
export type ProgressEvent =
  | { type: 'tool_call'; toolName: string; serverId: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolName: string; ok: boolean }
  | { type: 'thinking'; text: string }
  | { type: 'done'; html: string }
  | { type: 'error'; message: string }

contextBridge.exposeInMainWorld('mcpBrowser', {
  // Query
  submitQuery: (query: string): Promise<void> => ipcRenderer.invoke(IPC.QUERY_SUBMIT, query),

  onQueryProgress: (callback: (event: ProgressEvent) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, event: ProgressEvent): void => callback(event)
    ipcRenderer.on(IPC.QUERY_PROGRESS, handler)
    return () => ipcRenderer.removeListener(IPC.QUERY_PROGRESS, handler)
  },

  // Servers
  getAllServers: () => ipcRenderer.invoke(IPC.SERVERS_GET_ALL),
  setServerEnabled: (id: string, enabled: boolean) =>
    ipcRenderer.invoke(IPC.SERVERS_SET_ENABLED, id, enabled),
  addCustomServer: (config: unknown) => ipcRenderer.invoke(IPC.SERVERS_ADD_CUSTOM, config),
  removeServer: (id: string) => ipcRenderer.invoke(IPC.SERVERS_REMOVE, id),
  searchRegistry: (query: string) => ipcRenderer.invoke(IPC.REGISTRY_SEARCH, query),

  // API keys
  setApiKey: (key: string, type?: string) => ipcRenderer.invoke(IPC.API_KEY_SET, key, type),
  hasApiKey: (): Promise<boolean> => ipcRenderer.invoke(IPC.API_KEY_HAS),

  // AI Backend
  getBackend: (): Promise<'claude' | 'ollama'> => ipcRenderer.invoke(IPC.BACKEND_GET),
  setBackend: (backend: 'claude' | 'ollama'): Promise<void> =>
    ipcRenderer.invoke(IPC.BACKEND_SET, backend),

  // Anthropic config
  getAnthropicConfig: (): Promise<{ baseUrl: string; model: string }> =>
    ipcRenderer.invoke(IPC.ANTHROPIC_CONFIG_GET),
  setAnthropicConfig: (baseUrl: string, model: string): Promise<void> =>
    ipcRenderer.invoke(IPC.ANTHROPIC_CONFIG_SET, baseUrl, model),

  // Ollama / OpenAI-compatible config
  getOllamaConfig: (): Promise<{ url: string; model: string; hasKey: boolean }> =>
    ipcRenderer.invoke(IPC.OLLAMA_CONFIG_GET),
  setOllamaConfig: (url: string, model: string, key?: string): Promise<void> =>
    ipcRenderer.invoke(IPC.OLLAMA_CONFIG_SET, url, model, key),
  testOllamaConnection: (url: string, key?: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC.OLLAMA_TEST_CONNECTION, url, key),
  fetchOllamaModels: (url: string, key?: string): Promise<string[]> =>
    ipcRenderer.invoke(IPC.OLLAMA_FETCH_MODELS, url, key),

  // System
  openExternal: (url: string) => ipcRenderer.invoke(IPC.OPEN_EXTERNAL, url)
})
