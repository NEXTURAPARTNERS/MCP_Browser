import { app, BrowserWindow, dialog, shell } from 'electron'
import { join } from 'path'
import { AppStore } from './store/AppStore.js'
import { MCPClientManager } from './mcp/MCPClientManager.js'
import { registerHandlers } from './ipc/handlers.js'
import { resolveNodePath } from './util/nodeResolver.js'

let mainWindow: BrowserWindow | null = null

const store = new AppStore()
const mcpManager = new MCPClientManager()

async function checkNodeJs(): Promise<boolean> {
  const nodePath = resolveNodePath()
  if (nodePath) {
    console.log(`[preflight] Node.js found at: ${nodePath}`)
    return true
  }

  // Node.js not found – show a friendly dialog
  const { response } = await dialog.showMessageBox({
    type: 'warning',
    title: 'Node.js is vereist',
    message: 'MCP Browser heeft Node.js nodig om te werken.',
    detail:
      'Node.js is de omgeving die de MCP-servers aandrijft die informatie voor je ophalen.\n\n' +
      'Installeer Node.js LTS via nodejs.org en start MCP Browser opnieuw.',
    buttons: ['Download Node.js', 'Toch doorgaan', 'Afsluiten'],
    defaultId: 0,
    cancelId: 2
  })

  if (response === 0) {
    shell.openExternal('https://nodejs.org/en/download/')
    app.quit()
    return false
  }
  if (response === 2) {
    app.quit()
    return false
  }
  // "Toch doorgaan" – user ignores warning
  return true
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: false
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  // Preflight: ensure Node.js is available
  const nodeOk = await checkNodeJs()
  if (!nodeOk) return

  // Load initial enabled server configs after app is ready
  // (builtinServers uses app.getAppPath() which needs app to be ready)
  mcpManager.setConfigs(store.getEnabledServerConfigs())

  registerHandlers(store, mcpManager, () => mainWindow)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async () => {
  await mcpManager.disconnectAll()
})
