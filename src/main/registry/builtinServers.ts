import { join } from 'path'
import { app } from 'electron'
import { resolveNodePath } from '../util/nodeResolver.js'
import type { MCPServerConfig } from '../mcp/MCPServerConfig.js'

/**
 * Returns the directory containing the bundled MCP server scripts (out/servers/).
 * In a packaged app the scripts are unpacked from the asar archive via asarUnpack.
 */
function getServersPath(): string {
  const appPath = app.getAppPath()
  if (appPath.endsWith('.asar')) {
    return join(appPath + '.unpacked', 'out', 'servers')
  }
  return join(appPath, 'out', 'servers')
}

/** Returns 'node' absolute path, or falls back to the string 'node' */
function nodeCmd(): string {
  return resolveNodePath() ?? 'node'
}

export const BUILTIN_SERVERS: MCPServerConfig[] = [
  {
    id: 'duckduckgo-search',
    name: 'DuckDuckGo Search',
    description: 'Zoek op het web via DuckDuckGo. Geen API-sleutel nodig.',
    transport: 'stdio',
    get command() { return nodeCmd() },
    get args() { return [join(getServersPath(), 'search.mjs')] },
    requiresApiKey: false,
    category: 'search',
    defaultEnabled: true
  },
  {
    id: 'web-fetch',
    name: 'Web Fetch',
    description: 'Haal de inhoud van publieke URLs op. Geen API-sleutel nodig.',
    transport: 'stdio',
    get command() { return nodeCmd() },
    get args() { return [join(getServersPath(), 'fetch-web.mjs')] },
    requiresApiKey: false,
    category: 'utility',
    defaultEnabled: true
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Hoogwaardige webzoekopdrachten via Brave. Vereist een Brave API-sleutel.',
    transport: 'stdio',
    get command() { return nodeCmd() },
    get args() {
      // Brave is not bundled — user must have npx available
      // Here we use a simple wrapper script that calls the npm package
      return ['-e', "require('@modelcontextprotocol/server-brave-search')"]
    },
    requiresApiKey: true,
    apiKeyEnvVar: 'BRAVE_API_KEY',
    apiKeySettingKey: 'braveApiKey',
    category: 'search',
    defaultEnabled: false
  }
]
