import { drawBand, drawHero } from './dither'
import type { Layer } from './dither'

// Runs the dithered canvases: in a Web Worker when the browser can hand canvases to one
// (OffscreenCanvas), otherwise on the page itself.

// [id, width, height, top, draw this time] in CSS pixels.
export type Frame = { type: 'frame'; t: number; phase: number; px: number; vh: number; sizes: [number, number, number, number, boolean][] }

type Item = { id: number; el: HTMLCanvasElement; hero: boolean; layer?: Layer }

// A canvas can be handed to a worker only once, so the worker and the hand-overs live as long
// as the page.
let worker: Worker | null | undefined
const handed = new WeakMap<HTMLCanvasElement, number>()
let ids = 0

function getWorker() {
  if (worker !== undefined) return worker
  worker = null
  if (typeof OffscreenCanvas === 'undefined' || !('transferControlToOffscreen' in HTMLCanvasElement.prototype)) return null
  try {
    worker = new Worker(new URL('./dither.worker.ts', import.meta.url), { type: 'module' })
  } catch {
    worker = null
  }
  return worker
}

export function createDither(hero: HTMLCanvasElement | null, bands: HTMLCanvasElement[]) {
  const w = getWorker()
  const items: Item[] = []
  for (const [el, isHero] of [...(hero ? [[hero, true] as const] : []), ...bands.map((b) => [b, false] as const)]) {
    const palette = isHero ? '' : (el.dataset.dither ?? '')
    const mode = el.dataset.mode
    let id = handed.get(el)
    if (w && id === undefined) {
      id = ++ids
      const off = el.transferControlToOffscreen()
      w.postMessage({ type: 'add', id, canvas: off, palette, mode, hero: isHero }, [off])
      handed.set(el, id)
    }
    if (id !== undefined) items.push({ id, el, hero: isHero })
    else items.push({ id: ++ids, el, hero: isHero, layer: { canvas: el, W: 0, H: 0, top: 0, palette, mode } })
  }

  return {
    // Draws the hero and/or the bands as they are on screen now.
    frame(t: number, phase: number, px: number, opts: { hero: boolean; bands: boolean }) {
      const vh = window.innerHeight
      const sizes: Frame['sizes'] = []
      for (const it of items) {
        const draw = it.hero ? opts.hero : opts.bands
        if (!draw) continue
        const r = it.el.getBoundingClientRect()
        if (!it.hero && (r.bottom < 0 || r.top > vh)) continue
        if (it.layer) {
          Object.assign(it.layer, { W: r.width, H: r.height, top: r.top })
          if (it.hero) drawHero(it.layer, t, phase, px)
          else drawBand(it.layer, t, vh, px)
        } else sizes.push([it.id, r.width, r.height, r.top, true])
      }
      if (w && sizes.length) w.postMessage({ type: 'frame', t, phase, px, vh, sizes } satisfies Frame)
    },
  }
}
