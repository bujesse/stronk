import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const palette = {
  background: [16, 11, 8, 255],
  panel: [42, 30, 24, 255],
  bolt: [244, 237, 231, 255],
  accent: [230, 140, 52, 255],
}

const iconSpecs = [
  { path: 'public/pwa-192.png', size: 192, inset: 24 },
  { path: 'public/pwa-512.png', size: 512, inset: 64 },
  { path: 'public/pwa-maskable-192.png', size: 192, inset: 36 },
  { path: 'public/pwa-maskable-512.png', size: 512, inset: 96 },
  { path: 'public/apple-touch-icon.png', size: 180, inset: 22 },
]

function crc32(buffer) {
  let crc = 0xffffffff
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index]
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1)
      crc = (crc >>> 1) ^ (0xedb88320 & mask)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const lengthBuffer = Buffer.alloc(4)
  lengthBuffer.writeUInt32BE(data.length, 0)

  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer])
}

function pointInPolygon(x, y, polygon) {
  let inside = false
  for (let index = 0, prev = polygon.length - 1; index < polygon.length; prev = index, index += 1) {
    const current = polygon[index]
    const prior = polygon[prev]
    const intersects =
      current.y > y !== prior.y > y &&
      x < ((prior.x - current.x) * (y - current.y)) / (prior.y - current.y) + current.x
    if (intersects) {
      inside = !inside
    }
  }
  return inside
}

function paintPixel(buffer, size, x, y, color) {
  const offset = (y * size + x) * 4
  buffer[offset] = color[0]
  buffer[offset + 1] = color[1]
  buffer[offset + 2] = color[2]
  buffer[offset + 3] = color[3]
}

function fillRect(buffer, size, left, top, width, height, color) {
  const right = Math.min(size, left + width)
  const bottom = Math.min(size, top + height)
  for (let y = Math.max(0, top); y < bottom; y += 1) {
    for (let x = Math.max(0, left); x < right; x += 1) {
      paintPixel(buffer, size, x, y, color)
    }
  }
}

function fillPolygon(buffer, size, polygon, color) {
  const minX = Math.max(0, Math.floor(Math.min(...polygon.map((point) => point.x))))
  const maxX = Math.min(size - 1, Math.ceil(Math.max(...polygon.map((point) => point.x))))
  const minY = Math.max(0, Math.floor(Math.min(...polygon.map((point) => point.y))))
  const maxY = Math.min(size - 1, Math.ceil(Math.max(...polygon.map((point) => point.y))))

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (pointInPolygon(x + 0.5, y + 0.5, polygon)) {
        paintPixel(buffer, size, x, y, color)
      }
    }
  }
}

function writePng(filePath, size, pixelData) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  header[10] = 0
  header[11] = 0
  header[12] = 0

  const rowSize = size * 4 + 1
  const imageData = Buffer.alloc(rowSize * size)
  for (let y = 0; y < size; y += 1) {
    const rowOffset = y * rowSize
    imageData[rowOffset] = 0
    pixelData.copy(imageData, rowOffset + 1, y * size * 4, (y + 1) * size * 4)
  }

  const pngBuffer = Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(imageData)),
    chunk('IEND', Buffer.alloc(0)),
  ])

  writeFileSync(filePath, pngBuffer)
}

function generateIcon(size, inset) {
  const pixels = Buffer.alloc(size * size * 4)
  fillRect(pixels, size, 0, 0, size, size, palette.background)

  const panelInset = Math.round(inset * 0.42)
  fillRect(
    pixels,
    size,
    panelInset,
    panelInset,
    size - panelInset * 2,
    size - panelInset * 2,
    palette.panel,
  )

  const bolt = [
    { x: size * 0.58, y: inset * 0.55 },
    { x: size * 0.36, y: size * 0.50 },
    { x: size * 0.48, y: size * 0.50 },
    { x: size * 0.40, y: size - inset * 0.55 },
    { x: size * 0.68, y: size * 0.40 },
    { x: size * 0.54, y: size * 0.40 },
  ]
  fillPolygon(pixels, size, bolt, palette.bolt)

  const accentHeight = Math.max(8, Math.round(size * 0.06))
  fillRect(
    pixels,
    size,
    Math.round(size * 0.24),
    Math.round(size * 0.76),
    Math.round(size * 0.52),
    accentHeight,
    palette.accent,
  )

  return pixels
}

mkdirSync('public', { recursive: true })

for (const icon of iconSpecs) {
  writePng(icon.path, icon.size, generateIcon(icon.size, icon.inset))
}
