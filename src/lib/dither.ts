// The site's ordered-dither (Bayer 8×8) backgrounds, drawn into low-resolution canvases that
// CSS scales up with `image-rendering: pixelated`. Each draw maps a smooth value field onto a
// small palette, so the hero water and the bands between sections look like printed halftone.
//
// Speed: every wave is written so its sine splits into a column part and a row part
// (sin(a + b) = sin a·cos b + cos a·sin b), so the inner loop is only multiplies and adds. A
// canvas is only redrawn when what it shows has changed.

const BAYER = new Float32Array(
  [
    0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35,
    11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
  ].map((v) => (v + 0.5) / 64),
)

// '#rrggbb' → one RGBA pixel for a Uint32Array over ImageData (little-endian), 'none' → transparent.
const pixel = (hex: string) => {
  if (hex === 'none') return 0
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0
}

// One dithered canvas: the canvas itself (or its OffscreenCanvas in the worker), its size and
// position on screen in CSS pixels, its palette and mode, and what was drawn last.
export type Layer = {
  canvas: HTMLCanvasElement | OffscreenCanvas
  W: number
  H: number
  top: number
  palette: string
  mode?: string
  _img?: ImageData | null
  _buf?: Uint32Array
  _pal?: Uint32Array
  _key?: string
  _lo?: number
  _hi?: number
}

// Sizes the canvas backing store to its CSS box divided by `px` and returns its pixel buffer.
function surface(c: Layer, px: number) {
  const { W, H, canvas } = c
  if (!W || !H) return null
  const w = Math.ceil(W / px)
  const h = Math.ceil(H / px)
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
    c._img = null
    c._key = undefined
  }
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!ctx) return null
  if (!c._img) {
    c._img = ctx.createImageData(w, h)
    c._buf = new Uint32Array(c._img.data.buffer)
  }
  return { ctx, img: c._img, buf: c._buf!, w, h, W, H }
}

// Column tables for a wave sin(k·u + phase): its sine and cosine at every column.
function columns(w: number, scale: number, k: number, phase: number) {
  const s = new Float32Array(w)
  const c = new Float32Array(w)
  for (let x = 0; x < w; x++) {
    const a = (x / w) * scale * k + phase
    s[x] = Math.sin(a)
    c[x] = Math.cos(a)
  }
  return [s, c] as const
}

// Writes one row: value v[x] → palette colour, dithered.
function ditherRow(buf: Uint32Array, row: number, w: number, by: number, v: Float32Array, P: ArrayLike<number>, n: number) {
  for (let x = 0; x < w; x++) {
    const val = v[x]
    const si = (val < 0 ? 0 : val > 0.9999 ? 0.9999 : val) * n
    const i = si | 0
    buf[row + x] = si - i > BAYER[by + (x & 7)] ? P[i + 1] : P[i]
  }
}

// Share of a band's height at each end that is a solid colour.
const EDGE = 0.2

const clamp = (v: number) => (v < 0 ? 0 : v > 0.9999 ? 0.9999 : v)

const HERO = new Uint32Array(['#e2d8c4', '#c9c0ad', '#2f8f8a', '#22706c'].map(pixel))

// The hero: slow teal water under a cream sky. `phase` (0–1) is how far the contact
// section has scrolled in, which pulls the water up.
export function drawHero(c: Layer, t: number, phase: number, px: number) {
  const s = surface(c, px)
  if (!s) return false
  const { ctx, img, buf, w, h, W, H } = s
  const key = `${t.toFixed(3)}|${phase.toFixed(2)}`
  if (c._key === key) return true
  c._key = key
  const n = HERO.length - 1
  const asp = W / H
  const ph2 = phase * phase
  const us = asp * 0.55
  const sx = new Float32Array(w)
  for (let x = 0; x < w; x++) sx[x] = 0.08 * Math.sin((x / w) * 4.3 * asp * 0.5 + t * 0.12)
  // 0.11·sin(8.1u − 5.7v + .16t) + 0.06·sin(15.3u + 10.9v − .22t) + 0.04·sin(25u + 25v + .3t)
  const [s1, c1] = columns(w, us, 8.1, t * 0.16)
  const [s2, c2] = columns(w, us, 15.3, -t * 0.22)
  const [s3, c3] = columns(w, us, 25, t * 0.3)
  const v = new Float32Array(w)
  for (let y = 0; y < h; y++) {
    const v0 = y / h
    const base = 0.05 + v0 - 0.2 * ph2 + 0.6 * ph2 * Math.max(0, v0 - 0.45) + 0.07 * Math.sin(v0 * 3.7 - t * 0.09)
    const rs1 = 0.11 * Math.sin(-v0 * 5.7)
    const rc1 = 0.11 * Math.cos(-v0 * 5.7)
    const rs2 = 0.06 * Math.sin(v0 * 10.9)
    const rc2 = 0.06 * Math.cos(v0 * 10.9)
    const rs3 = 0.04 * Math.sin(v0 * 25)
    const rc3 = 0.04 * Math.cos(v0 * 25)
    for (let x = 0; x < w; x++) v[x] = base + sx[x] + s1[x] * rc1 + c1[x] * rs1 + s2[x] * rc2 + c2[x] * rs2 + s3[x] * rc3 + c3[x] * rs3
    ditherRow(buf, y * w, w, (y & 7) * 8, v, HERO, n)
  }
  ctx.putImageData(img, 0, 0)
  return true
}

// A band between two sections, or a section background. The palette (comma separated, top
// colour first) blends from one section's colour into the next with a moving
// wave edge. data-mode="field" fills a section with a soft pattern that fades to its edges;
// data-mode="foot" fills the contact section and lifts as it scrolls into view.
export function drawBand(c: Layer, t: number, vh: number, px: number) {
  const r = { top: c.top, bottom: c.top + c.H, height: c.H }
  if (r.bottom < 0 || r.top > vh) return
  const mode = c.mode
  const pb = Math.min(1, Math.max(0, 1 - (r.bottom - vh) / vh))
  // How far the band has travelled through the viewport tilts the wave.
  const q = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)))
  // Only what this canvas depends on: a field ignores scrolling, the others follow it.
  // Steps of 1% are invisible but save most redraws while scrolling.
  const key = `${t.toFixed(3)}|${mode === 'field' ? '' : (mode === 'foot' ? pb : q).toFixed(2)}`
  const s = surface(c, px)
  if (!s) return
  const { ctx, img, buf, w, h, W, H } = s
  // Only the rows on screen are drawn; rows drawn earlier for the same picture are kept.
  let y0 = Math.max(0, Math.floor((-r.top / H) * h))
  let y1 = Math.min(h, Math.ceil(((vh - r.top) / H) * h))
  if (c._key === key && c._lo !== undefined && c._hi !== undefined && y0 <= c._hi && y1 >= c._lo) {
    if (y0 >= c._lo && y1 <= c._hi) return
    const lo = Math.min(y0, c._lo)
    const hi = Math.max(y1, c._hi)
    // Draw just the new part.
    if (y0 >= c._lo) y0 = c._hi
    else if (y1 <= c._hi) y1 = c._lo
    c._lo = lo
    c._hi = hi
  } else {
    c._key = key
    c._lo = y0
    c._hi = y1
  }
  const P = (c._pal ??= new Uint32Array(c.palette.split(',').map((x) => pixel(x.trim()))))
  const n = P.length - 1
  const asp = W / H
  const wv = new Float32Array(w)
  for (let x = 0; x < w; x++) {
    const u = (x / w) * asp
    wv[x] = 0.12 * Math.sin(u * 2.1 + t * 0.5) + 0.06 * Math.sin(u * 5.3 - t * 0.8) + 0.03 * Math.sin(u * 11 + t * 1.3)
  }
  const v = new Float32Array(w)

  if (mode === 'foot') {
    const h0 = 1 - 0.6 * pb
    // 0.08·sin(6u − 9v + .7t)
    const [fs, fc] = columns(w, asp, 6, t * 0.7)
    for (let y = y0; y < y1; y++) {
      const v0 = y / h
      const lift = Math.max(0, v0 - h0)
      const rs = 0.08 * Math.sin(-v0 * 9)
      const rc = 0.08 * Math.cos(-v0 * 9)
      for (let x = 0; x < w; x++) v[x] = 0.5 + lift * 1.3 + lift * (wv[x] * 1.5 + fs[x] * rc + fc[x] * rs)
      ditherRow(buf, y * w, w, (y & 7) * 8, v, P, n)
    }
    ctx.putImageData(img, 0, 0, 0, y0, w, y1 - y0)
    return
  }

  if (mode === 'field') {
    // 0.5 + 0.28·sin(2.6u + .25t)·sin(3.4v − .18t) + 0.16·sin(6.1u − 5.3v + .4t) + 0.08·sin(13u + 11v − .7t)
    const a0 = new Float32Array(w)
    for (let x = 0; x < w; x++) a0[x] = 0.28 * Math.sin((x / w) * asp * 2.6 + t * 0.25)
    const [s1, c1] = columns(w, asp, 6.1, t * 0.4)
    const [s2, c2] = columns(w, asp, 13, -t * 0.7)
    for (let y = y0; y < y1; y++) {
      const v0 = y / h
      const e = 1 - Math.sin(Math.PI * v0)
      const r0 = Math.sin(v0 * 3.4 - t * 0.18)
      const rs1 = 0.16 * Math.sin(-v0 * 5.3)
      const rc1 = 0.16 * Math.cos(-v0 * 5.3)
      const rs2 = 0.08 * Math.sin(v0 * 11)
      const rc2 = 0.08 * Math.cos(v0 * 11)
      const k = 1 - e * 1.05 - 0.2
      for (let x = 0; x < w; x++) v[x] = k - 0.4 * (a0[x] * r0 + s1[x] * rc1 + c1[x] * rs1 + s2[x] * rc2 + c2[x] * rs2)
      ditherRow(buf, y * w, w, (y & 7) * 8, v, P, n)
    }
    ctx.putImageData(img, 0, 0, 0, y0, w, y1 - y0)
    return
  }

  // Edge wave: always smaller than EDGE, so a band's first and last rows stay solid.
  const ew = new Float32Array(w)
  for (let x = 0; x < w; x++) {
    const u = (x / w) * asp
    ew[x] = 0.12 * Math.sin(u * 3.1 + t * 0.35) + 0.06 * Math.sin(u * 7.7 - t * 0.5)
  }
  const bias = (0.5 - q) * 0.35
  // 0.04·sin(9v + 14·x/w − t)
  const [bs, bc] = columns(w, 1, 14, -t)
  for (let y = y0; y < y1; y++) {
    const v0 = y / h
    // The big wave fades out towards both edges; a smaller one takes over there so the dots
    // don't stop along a straight line. The value is stretched so the first and last rows are
    // the pure section colours (the edge wave never reaches them), and eased so the dots thin
    // out gently into the next section.
    const sn = Math.sin(Math.PI * v0)
    const env = sn * sn
    const rs = 0.04 * Math.sin(v0 * 9)
    const rc = 0.04 * Math.cos(v0 * 9)
    for (let x = 0; x < w; x++) {
      const raw = v0 + (wv[x] + bias + bs[x] * rc + bc[x] * rs) * env * 1.9 + ew[x] * (1 - env)
      const k = clamp((raw - EDGE) / (1 - 2 * EDGE))
      v[x] = k * k * (3 - 2 * k)
    }
    ditherRow(buf, y * w, w, (y & 7) * 8, v, P, n)
  }
  ctx.putImageData(img, 0, 0, 0, y0, w, y1 - y0)
}
