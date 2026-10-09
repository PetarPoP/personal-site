import { drawBand, drawHero } from './dither'
import type { Layer } from './dither'
import type { Frame } from './dither-renderer'

// Draws the dithered canvases off the main thread, so scrolling never waits for them. The page
// sends each canvas once (as an OffscreenCanvas) and then a Frame whenever something moved;
// if frames arrive faster than they can be drawn, only the newest is drawn.

const layers = new Map<number, Layer & { hero: boolean }>()
let next: Frame | null = null
let busy = false

function run() {
  const f = next
  next = null
  if (f) {
    for (const [id, W, H, top, draw] of f.sizes) {
      const l = layers.get(id)
      if (!l || !draw) continue
      l.W = W
      l.H = H
      l.top = top
      if (l.hero) drawHero(l, f.t, f.phase, f.px)
      else drawBand(l, f.t, f.vh, f.px)
    }
  }
  busy = next !== null
  if (busy) setTimeout(run)
}

self.onmessage = (e: MessageEvent) => {
  const m = e.data
  if (m.type === 'add') {
    layers.set(m.id, { canvas: m.canvas, W: 0, H: 0, top: 0, palette: m.palette, mode: m.mode, hero: m.hero })
    return
  }
  next = m as Frame
  if (!busy) {
    busy = true
    setTimeout(run)
  }
}
