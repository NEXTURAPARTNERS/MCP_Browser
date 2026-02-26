#!/usr/bin/env node
/**
 * Converts a PNG to a Windows .ico file with multiple sizes.
 * Uses only Node.js built-ins + sips (macOS) to create PNG resizes,
 * then manually writes the ICO binary format.
 */
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { tmpdir } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const src = join(root, 'resources', 'icon.png')
const dest = join(root, 'resources', 'icon.ico')
const tmp = join(tmpdir(), 'mcp-browser-ico')

mkdirSync(tmp, { recursive: true })

const sizes = [16, 24, 32, 48, 64, 128, 256]

console.log('Generating icon sizes with sips...')
const pngBuffers = []
for (const size of sizes) {
  const out = join(tmp, `icon-${size}.png`)
  execSync(`sips -z ${size} ${size} "${src}" --out "${out}"`, { stdio: 'pipe' })
  pngBuffers.push({ size, data: readFileSync(out) })
  console.log(`  ✓ ${size}x${size}`)
}

// Write ICO binary format
// ICO header: 6 bytes
// ICONDIRENTRY per image: 16 bytes each
// Then image data

const headerSize = 6
const entrySize = 16
const dataOffset = headerSize + entrySize * pngBuffers.length

// Calculate offsets
let currentOffset = dataOffset
const entries = pngBuffers.map(({ size, data }) => {
  const entry = { size, data, offset: currentOffset }
  currentOffset += data.length
  return entry
})

const totalSize = currentOffset
const buf = Buffer.alloc(totalSize)

// ICO header
buf.writeUInt16LE(0, 0)               // Reserved
buf.writeUInt16LE(1, 2)               // Type: 1 = ICO
buf.writeUInt16LE(entries.length, 4)  // Number of images

// ICONDIRENTRY for each image
entries.forEach(({ size, data, offset }, i) => {
  const base = headerSize + i * entrySize
  buf.writeUInt8(size >= 256 ? 0 : size, base)      // Width (0 = 256)
  buf.writeUInt8(size >= 256 ? 0 : size, base + 1)  // Height (0 = 256)
  buf.writeUInt8(0, base + 2)                        // Color count (0 = no palette)
  buf.writeUInt8(0, base + 3)                        // Reserved
  buf.writeUInt16LE(1, base + 4)                     // Planes
  buf.writeUInt16LE(32, base + 6)                    // Bit count
  buf.writeUInt32LE(data.length, base + 8)           // Size of image data
  buf.writeUInt32LE(offset, base + 12)               // Offset of image data
})

// Write image data
entries.forEach(({ data, offset }) => {
  data.copy(buf, offset)
})

writeFileSync(dest, buf)
console.log(`\n✓ Written ${dest} (${(buf.length / 1024).toFixed(1)} KB, ${entries.length} sizes)`)
