#!/usr/bin/env node
/**
 * Bundles the MCP server scripts in src/servers/ into self-contained
 * ESM bundles in out/servers/ using esbuild.
 * Run via: node scripts/build-servers.mjs
 */

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Locate esbuild from within pnpm virtual store
const require = createRequire(import.meta.url)

// Try to resolve esbuild from the project's node_modules via .pnpm
const esbuildPaths = [
  join(root, 'node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild'),
  join(root, 'node_modules/.pnpm/esbuild@0.27.3/node_modules/esbuild'),
]

let esbuild
for (const p of esbuildPaths) {
  try {
    esbuild = require(p)
    break
  } catch {
    // try next
  }
}

if (!esbuild) {
  // Last resort: try regular resolution (works if esbuild is a direct dep)
  try {
    esbuild = require('esbuild')
  } catch {
    console.error('Could not find esbuild. Cannot bundle server scripts.')
    process.exit(1)
  }
}

const outDir = join(root, 'out', 'servers')
mkdirSync(outDir, { recursive: true })

const entries = [
  { in: join(root, 'src/servers/search.ts'), out: join(outDir, 'search.mjs') },
  { in: join(root, 'src/servers/fetch-web.ts'), out: join(outDir, 'fetch-web.mjs') },
]

for (const entry of entries) {
  try {
    await esbuild.build({
      entryPoints: [entry.in],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: entry.out,
      // Keep Node.js built-in modules external (not bundled)
      packages: 'bundle', // bundle all npm packages
      external: [
        // Node built-ins
        'node:*', 'http', 'https', 'fs', 'path', 'os', 'crypto', 'stream',
        'events', 'util', 'buffer', 'url', 'net', 'tls', 'zlib', 'child_process',
        'readline', 'process', 'assert', 'tty', 'perf_hooks', 'inspector',
        'dns', 'module', 'fs/promises', 'node:fs/promises',
      ],
      minify: false,
    })
    console.log(`✓ Built ${entry.out}`)
  } catch (err) {
    console.error(`✗ Failed to build ${entry.in}:`, err.message)
    process.exit(1)
  }
}

console.log('Server bundles built successfully.')
