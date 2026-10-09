// The site's ordered-dither (Bayer 8×8) backgrounds, drawn into low-resolution canvases that
// CSS scales up with `image-rendering: pixelated`. Each draw maps a smooth value field onto a
// small palette, so the hero water and the bands between sections look like printed halftone.

const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35,
  11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
].map((v) => (v + 0.5) / 64)

// '#rrggbb' → one RGBA pixel for a Uint32Array over ImageData (little-endian), 'none' → transparent.
const pixel = (hex: string) => {
  if (hex === 'none') return 0
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0
}

type Surface = HTMLCanvasElement & { _img?: ImageData | null; _buf?: Uint32Array; _pal?: number[] }

// Sizes the canvas backing store to its CSS box divided by `px` and returns its pixel buffer.
function surface(c: Surface, px: number) {
  const W = c.clientWidth
  const H = c.clientHeight
  if (!W || !H) return null
  const w = Math.ceil(W / px)
  const h = Math.ceil(H / px)
  if (c.width !== w || c.height !== h) {
    c.width = w
    c.height = h
    c._img = null
  }
  const ctx = c.getContext('2d')
  if (!ctx) return null
  if (!c._img) {
    c._img = ctx.createImageData(w, h)
    c._buf = new Uint32Array(c._img.data.buffer)
  }
  return { ctx, img: c._img, buf: c._buf!, w, h, W, H }
}

// Share of a band's height at each end that is a solid colour.
const EDGE = 0.2

const clamp = (v: number) => (v < 0 ? 0 : v > 0.9999 ? 0.9999 : v)

const HERO = ['#e2d8c4', '#c9c0ad', '#2f8f8a', '#22706c'].map(pixel)

// The hero: slow teal water under a cream sky. `phase` (0–1) is how far the contact
// section has scrolled in, which pulls the water up.
export function drawHero(c: Surface, t: number, phase: number, px: number) {
  const s = surface(c, px)
  if (!s) return false
  const { ctx, img, buf, w, h, W, H } = s
  const n = HERO.length - 1
  const asp = W / H
  const ph2 = phase * phase
  const sx = new Float32Array(w)
  for (let x = 0; x < w; x++) sx[x] = 0.08 * Math.sin((x / w) * 4.3 * asp * 0.5 + t * 0.12)
  for (let y = 0; y < h; y++) {
    const v0 = y / h
    const base = 0.05 + v0 - 0.2 * ph2 + 0.6 * ph2 * Math.max(0, v0 - 0.45)
    const sy = 0.07 * Math.sin(v0 * 3.7 - t * 0.09)
    const row = y * w
    const by = (y & 7) * 8
    for (let x = 0; x < w; x++) {
      const u = (x / w) * asp * 0.55
      const v = clamp(
        base + sx[x] + sy + 0.11 * Math.sin(u * 8.1 - v0 * 5.7 + t * 0.16) + 0.06 * Math.sin(u * 15.3 + v0 * 10.9 - t * 0.22) + 0.04 * Math.sin((u + v0) * 25 + t * 0.3),
      )
      const si = v * n
      const i = si | 0
      buf[row + x] = si - i > BAYER[by + (x & 7)] ? HERO[i + 1] : HERO[i]
    }
  }
  ctx.putImageData(img, 0, 0)
  return true
}

// A band between two sections, or a section background. The palette (data-dither, comma
// separated, top colour first) blends from one section's colour into the next with a moving
// wave edge. data-mode="field" fills a section with a soft pattern that fades to its edges;
// data-mode="foot" fills the contact section and lifts as it scrolls into view.
export function drawBand(c: Surface, t: number, vh: number, px: number) {
  const r = c.getBoundingClientRect()
  if (r.bottom < 0 || r.top > vh) return
  const s = surface(c, px)
  if (!s) return
  const { ctx, img, buf, w, h, W, H } = s
  const P = (c._pal ??= (c.dataset.dither ?? '').split(',').map((x) => pixel(x.trim())))
  const n = P.length - 1
  const asp = W / H
  const wv = new Float32Array(w)
  for (let x = 0; x < w; x++) {
    const u = (x / w) * asp
    wv[x] = 0.12 * Math.sin(u * 2.1 + t * 0.5) + 0.06 * Math.sin(u * 5.3 - t * 0.8) + 0.03 * Math.sin(u * 11 + t * 1.3)
  }
  // Edge wave: always smaller than EDGE, so a band's first and last rows stay solid.
  const ew = new Float32Array(w)
  for (let x = 0; x < w; x++) {
    const u = (x / w) * asp
    ew[x] = 0.12 * Math.sin(u * 3.1 + t * 0.35) + 0.06 * Math.sin(u * 7.7 - t * 0.5)
  }
  const mode = c.dataset.mode

  if (mode) {
    const foot = mode === 'foot'
    const pb = Math.min(1, Math.max(0, 1 - (r.bottom - vh) / vh))
    const h0 = 1 - 0.6 * pb
    for (let y = 0; y < h; y++) {
      const v0 = y / h
      const row = y * w
      const by = (y & 7) * 8
      const e = 1 - Math.sin(Math.PI * v0)
      const lift = Math.max(0, v0 - h0)
      for (let x = 0; x < w; x++) {
        const u = (x / w) * asp
        let v: number
        if (foot) v = 0.5 + lift * 1.3 + lift * (wv[x] * 1.5 + 0.08 * Math.sin(u * 6 - v0 * 9 + t * 0.7))
        else {
          const nz =
            0.5 +
            0.28 * Math.sin(u * 2.6 + t * 0.25) * Math.sin(v0 * 3.4 - t * 0.18) +
            0.16 * Math.sin(u * 6.1 - v0 * 5.3 + t * 0.4) +
            0.08 * Math.sin(u * 13 + v0 * 11 - t * 0.7)
          v = 1 - (e * 1.05 + nz * 0.4)
        }
        const si = clamp(v) * n
        const i = si | 0
        buf[row + x] = si - i > BAYER[by + (x & 7)] ? P[i + 1] : P[i]
      }
    }
    ctx.putImageData(img, 0, 0)
    return
  }

  // How far the band has travelled through the viewport tilts the wave.
  const q = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)))
  const bias = (0.5 - q) * 0.35
  for (let y = 0; y < h; y++) {
    const v0 = y / h
    const row = y * w
    const by = (y & 7) * 8
    // The big wave fades out towards both edges; a smaller one takes over there so the dots
    // don't stop along a straight line. The value is stretched so the first and last rows are
    // the pure section colours (the edge wave never reaches them), and eased so the dots thin
    // out gently into the next section.
    const sn = Math.sin(Math.PI * v0)
    const env = sn * sn
    for (let x = 0; x < w; x++) {
      const raw = v0 + (wv[x] + bias + 0.04 * Math.sin(v0 * 9 + (x / w) * 14 - t)) * env * 1.9 + ew[x] * (1 - env)
      const k = clamp((raw - EDGE) / (1 - 2 * EDGE))
      const v = clamp(k * k * (3 - 2 * k))
      const si = v * n
      const i = si | 0
      buf[row + x] = si - i > BAYER[by + (x & 7)] ? P[i + 1] : P[i]
    }
  }
  ctx.putImageData(img, 0, 0)
}
