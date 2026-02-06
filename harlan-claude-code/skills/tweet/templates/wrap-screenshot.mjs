/**
 * Wraps a screenshot in macOS-style terminal/browser window chrome.
 * Outputs at Twitter-optimal 16:9 (1600x900) with centered floating window.
 * Premium gradient background with silver orbs and subtle swirl arcs.
 *
 * Customize the constants below before running.
 *
 * Dependencies: sharp, @resvg/resvg-js
 * Usage: node wrap-screenshot.mjs
 */
import { readFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'

// --- Customize these ---
const INPUT_PATH = 'img.png'
const OUTPUT_PATH = 'img-twitter.png'
const TITLE = 'claude — ~/project'
// --- End customization ---

// Twitter optimal 16:9
const TARGET_W = 1600
const TARGET_H = 900

// Layout — generous padding for premium feel
const PADDING = 64
const TITLE_BAR_HEIGHT = 40
const CORNER_RADIUS = 12
const TRAFFIC_LIGHT_Y = TITLE_BAR_HEIGHT / 2
const TRAFFIC_LIGHT_START_X = 20
const TRAFFIC_LIGHT_GAP = 22
const TRAFFIC_LIGHT_R = 7

// Window colors
const WINDOW_BG = '#1e1e2e'
const TITLE_BAR_BG = '#252535'
const TITLE_COLOR = '#888899'
const TRAFFIC_RED = '#ff5f57'
const TRAFFIC_YELLOW = '#febc2e'
const TRAFFIC_GREEN = '#28c840'

// Available space for the image inside the window
const maxImgW = TARGET_W - PADDING * 2 - 2
const maxImgH = TARGET_H - PADDING * 2 - TITLE_BAR_HEIGHT

// Read and resize the image to fit
const meta = await sharp(INPUT_PATH).metadata()
const srcRatio = meta.width / meta.height
const fitRatio = maxImgW / maxImgH

let imgW, imgH
if (srcRatio > fitRatio) {
  imgW = maxImgW
  imgH = Math.round(maxImgW / srcRatio)
}
else {
  imgH = maxImgH
  imgW = Math.round(maxImgH * srcRatio)
}

const resizedBuf = await sharp(INPUT_PATH)
  .resize(imgW, imgH, { fit: 'inside' })
  .png()
  .toBuffer()
const imgB64 = resizedBuf.toString('base64')

// Window sized to image, centered on canvas
const winW = imgW + 2
const winH = imgH + TITLE_BAR_HEIGHT
const winX = Math.round((TARGET_W - winW) / 2)
const winY = Math.round((TARGET_H - winH) / 2)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TARGET_W}" height="${TARGET_H}">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="45%" r="70%" fx="50%" fy="40%">
      <stop offset="0%" stop-color="#2a2a35"/>
      <stop offset="50%" stop-color="#1c1c26"/>
      <stop offset="100%" stop-color="#111118"/>
    </radialGradient>
    <radialGradient id="orb1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#8888aa" stop-opacity="0.12"/>
      <stop offset="70%" stop-color="#666688" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#444466" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orb2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#aaaacc" stop-opacity="0.08"/>
      <stop offset="60%" stop-color="#8888aa" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="#666688" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orb3" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#9999bb" stop-opacity="0.10"/>
      <stop offset="50%" stop-color="#7777aa" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#555577" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="topSheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="winClip">
      <rect x="${winX}" y="${winY}" width="${winW}" height="${winH}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}"/>
    </clipPath>
  </defs>

  <rect width="${TARGET_W}" height="${TARGET_H}" fill="url(#bgGrad)"/>

  <ellipse cx="${TARGET_W * 0.3}" cy="${TARGET_H * 0.25}" rx="500" ry="350" fill="url(#orb1)"/>
  <ellipse cx="${TARGET_W * 0.75}" cy="${TARGET_H * 0.7}" rx="450" ry="380" fill="url(#orb2)"/>
  <ellipse cx="${TARGET_W * 0.55}" cy="${TARGET_H * 0.15}" rx="600" ry="200" fill="url(#orb3)"/>
  <ellipse cx="${TARGET_W * 0.15}" cy="${TARGET_H * 0.8}" rx="350" ry="300" fill="url(#orb2)"/>

  <path d="M ${TARGET_W * 0.1} ${TARGET_H * 0.9} Q ${TARGET_W * 0.4} ${TARGET_H * 0.2}, ${TARGET_W * 0.9} ${TARGET_H * 0.35}" fill="none" stroke="#8888aa" stroke-width="1" stroke-opacity="0.06"/>
  <path d="M ${TARGET_W * 0.05} ${TARGET_H * 0.5} Q ${TARGET_W * 0.5} ${TARGET_H * 0.05}, ${TARGET_W * 0.95} ${TARGET_H * 0.6}" fill="none" stroke="#aaaacc" stroke-width="0.8" stroke-opacity="0.05"/>
  <path d="M ${TARGET_W * 0.2} ${TARGET_H * 0.95} Q ${TARGET_W * 0.6} ${TARGET_H * 0.4}, ${TARGET_W * 0.85} ${TARGET_H * 0.1}" fill="none" stroke="#9999bb" stroke-width="1.2" stroke-opacity="0.04"/>

  <rect width="${TARGET_W}" height="${TARGET_H}" fill="url(#topSheen)"/>

  <rect x="${winX + 4}" y="${winY + 6}" width="${winW}" height="${winH}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="black" opacity="0.25"/>
  <rect x="${winX + 2}" y="${winY + 3}" width="${winW}" height="${winH}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="black" opacity="0.15"/>

  <g clip-path="url(#winClip)">
    <rect x="${winX}" y="${winY}" width="${winW}" height="${winH}" fill="${WINDOW_BG}"/>
    <rect x="${winX}" y="${winY}" width="${winW}" height="${TITLE_BAR_HEIGHT}" fill="${TITLE_BAR_BG}"/>
    <line x1="${winX}" y1="${winY + TITLE_BAR_HEIGHT}" x2="${winX + winW}" y2="${winY + TITLE_BAR_HEIGHT}" stroke="#333345" stroke-width="1"/>
    <circle cx="${winX + TRAFFIC_LIGHT_START_X}" cy="${winY + TRAFFIC_LIGHT_Y}" r="${TRAFFIC_LIGHT_R}" fill="${TRAFFIC_RED}"/>
    <circle cx="${winX + TRAFFIC_LIGHT_START_X + TRAFFIC_LIGHT_GAP}" cy="${winY + TRAFFIC_LIGHT_Y}" r="${TRAFFIC_LIGHT_R}" fill="${TRAFFIC_YELLOW}"/>
    <circle cx="${winX + TRAFFIC_LIGHT_START_X + TRAFFIC_LIGHT_GAP * 2}" cy="${winY + TRAFFIC_LIGHT_Y}" r="${TRAFFIC_LIGHT_R}" fill="${TRAFFIC_GREEN}"/>
    <text x="${winX + winW / 2}" y="${winY + TRAFFIC_LIGHT_Y + 5}" text-anchor="middle" fill="${TITLE_COLOR}" font-family="SF Mono, Menlo, Consolas, monospace" font-size="13">${TITLE}</text>
    <image x="${winX + 1}" y="${winY + TITLE_BAR_HEIGHT}" width="${imgW}" height="${imgH}" href="data:image/png;base64,${imgB64}"/>
  </g>

  <rect x="${winX}" y="${winY}" width="${winW}" height="${winH}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="none" stroke="#555566" stroke-width="1.5"/>
</svg>`

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: TARGET_W },
  font: { loadSystemFonts: true },
})

const pngBuf = resvg.render().asPng()
await sharp(pngBuf).png({ compressionLevel: 9 }).toFile(OUTPUT_PATH)
console.log(`Wrapped: ${INPUT_PATH} → ${OUTPUT_PATH} (${TARGET_W}x${TARGET_H}, image ${meta.width}x${meta.height} → ${imgW}x${imgH})`)
