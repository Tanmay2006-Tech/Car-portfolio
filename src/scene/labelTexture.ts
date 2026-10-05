import * as THREE from 'three'

import { INK } from './colors'

// Text on roadside structures, drawn once into a canvas with the page's
// own self-hosted fonts. Avoids drei's <Text>, whose default font is
// fetched from a CDN at runtime — CLAUDE.md section 2 rules out third-
// party font requests.
export function makeLabelTexture(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  width = 512,
  height = 512,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  const paint = () => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
    draw(ctx, width, height)
    texture.needsUpdate = true
  }
  paint()
  // Repaint once the variable fonts have actually loaded, in case the
  // first paint fell back to a system face.
  document.fonts?.ready.then(paint).catch(() => {})
  return texture
}

export const LABEL_INK = INK
// Canvas can't set font-stretch through the font shorthand reliably, so
// signs use Archivo at its default width; the DOM carries the wide cut.
export const DISPLAY_FONT = '"Archivo Variable", system-ui, sans-serif'
export const BODY_FONT = '"Instrument Sans Variable", system-ui, sans-serif'
