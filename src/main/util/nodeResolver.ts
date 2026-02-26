import { execSync } from 'child_process'

// Locations where Node.js is commonly installed outside the default macOS PATH
const EXTRA_PATHS = [
  '/usr/local/bin',
  '/opt/homebrew/bin',
  '/opt/homebrew/opt/node/bin',
  '/usr/bin',
  // ServBay
  '/Applications/ServBay/script/alias',
  '/Applications/ServBay/bin',
  // nvm default
  `${process.env.HOME}/.nvm/versions/node/current/bin`,
  // fnm / volta
  `${process.env.HOME}/.fnm/bin`,
  `${process.env.HOME}/.volta/bin`,
]

function buildAugmentedPath(): string {
  const existing = process.env.PATH ?? ''
  const extras = EXTRA_PATHS.filter(Boolean).join(':')
  return `${existing}:${extras}`
}

let _nodePath: string | null | undefined = undefined // undefined = not yet resolved

/**
 * Returns the absolute path to the `node` binary, or null if not found.
 * Result is cached after the first call.
 */
export function resolveNodePath(): string | null {
  if (_nodePath !== undefined) return _nodePath

  const augmentedPath = buildAugmentedPath()

  // Try `which node` first
  try {
    const result = execSync('which node', {
      env: { ...process.env, PATH: augmentedPath },
      timeout: 5000,
      encoding: 'utf8'
    }).trim()
    if (result) {
      console.log(`[nodeResolver] Found node at: ${result}`)
      _nodePath = result
      return _nodePath
    }
  } catch {
    // fall through
  }

  // Try known locations directly
  const { existsSync } = require('fs') as typeof import('fs')
  for (const dir of EXTRA_PATHS) {
    if (!dir) continue
    const candidate = `${dir}/node`
    try {
      if (existsSync(candidate)) {
        console.log(`[nodeResolver] Found node at: ${candidate}`)
        _nodePath = candidate
        return _nodePath
      }
    } catch {
      // skip
    }
  }

  console.warn('[nodeResolver] node binary not found')
  _nodePath = null
  return null
}

/**
 * Returns a PATH string that is guaranteed to include the directory
 * containing the resolved node binary. Pass this as `env.PATH` when
 * spawning child processes.
 */
export function getAugmentedEnv(base: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(base)) {
    if (v !== undefined) env[k] = v
  }
  env['PATH'] = buildAugmentedPath()
  return env
}
