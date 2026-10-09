import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { getNowPlaying } from '#/lib/spotify'
import type { NowPlaying, Track } from '#/lib/spotify'

type Live = Extract<NowPlaying, { playing: boolean }>

const POLL_MS = 30_000

// What Petar is listening to, in the site's teal pixel style. Asked only while the section is on
// screen (and the tab is visible), so it costs the Worker little. Hidden when Spotify isn't set
// up or can't be reached.
export function Spotify() {
  const ref = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<{ np: Live; at: number } | null>(null)
  const [hidden, setHidden] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let visible = false
    let timer = 0
    let alive = true
    const load = () => {
      window.clearTimeout(timer)
      if (!visible || document.hidden) return
      getNowPlaying()
        .then((np) => {
          if (!alive) return
          if (np.configured && 'playing' in np && np.track) setData({ np, at: Date.now() })
          else setHidden(true)
        })
        .catch(() => alive && setHidden(true))
        .finally(() => {
          if (alive) timer = window.setTimeout(load, POLL_MS)
        })
    }
    const io = new IntersectionObserver(
      ([e]) => {
        const was = visible
        visible = e.isIntersecting
        if (visible && !was) load()
      },
      { rootMargin: '400px 0px' },
    )
    io.observe(el)
    const onVis = () => !document.hidden && load()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      alive = false
      io.disconnect()
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  // Keep the progress moving between answers.
  const playing = !!data?.np.playing
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [playing])

  if (hidden) return null
  const track = data?.np.track ?? null
  const progress = data && track ? Math.min(track.durationMs, data.np.progressMs + (playing ? now - data.at : 0)) : 0

  return (
    <div ref={ref} className={`flex flex-col gap-[clamp(28px,4vw,48px)] transition-opacity duration-700 ${track ? 'opacity-100' : 'opacity-0'}`}>
      <h2 className="heading">{playing ? 'On repeat right now' : 'Last on repeat'}</h2>
      {track && data && <Player track={track} playing={playing} progress={progress} playedAt={data.np.playedAt} />}
    </div>
  )
}

function Player({ track, playing, progress, playedAt }: { track: Track; playing: boolean; progress: number; playedAt: number | null }) {
  return (
    <a
      href={track.url}
      target="_blank"
      rel="noreferrer"
      className="group grid max-w-[880px] grid-cols-[clamp(96px,22vw,200px)_1fr] items-center gap-[clamp(16px,3vw,40px)] text-paper no-underline"
    >
      <PixelCover src={track.image} alt={`${track.album} cover`} />
      <div className="flex min-w-0 flex-col gap-[clamp(8px,1.2vw,14px)]">
        <span className="flex items-center gap-2.5 text-[15px] text-mint">
          <Eq playing={playing} />
          {playing ? 'Listening on Spotify' : `Played on Spotify${playedAt ? ` · ${ago(playedAt)}` : ''}`}
        </span>
        <span className="truncate text-[clamp(24px,3vw,44px)] leading-[1.05] font-semibold tracking-[-.03em]">{track.title}</span>
        <span className="truncate text-[clamp(15px,1.4vw,19px)] text-paper/75">
          {track.artists} · {track.album}
        </span>
        <div className="mt-1 flex items-center gap-3 text-[13px] text-mint tabular-nums max-sm:hidden">
          <span>{time(progress)}</span>
          <Blocks value={playing ? progress / track.durationMs : 1} />
          <span>{time(track.durationMs)}</span>
        </div>
        <span className="flex items-center gap-1 text-[15px] font-medium text-paper/90 underline decoration-1 underline-offset-4 transition-opacity group-hover:opacity-70">
          Open in Spotify
          <ArrowUpRight size={16} strokeWidth={1.75} />
        </span>
      </div>
    </a>
  )
}

// Progress as a row of square pixels.
function Blocks({ value }: { value: number }) {
  const n = 28
  const lit = Math.round(Math.max(0, Math.min(1, value)) * n)
  return (
    <span aria-hidden className="flex flex-1 gap-[3px]">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`aspect-square max-w-2.5 flex-1 ${i < lit ? 'bg-mint' : 'bg-paper/15'}`} />
      ))}
    </span>
  )
}

// Three pixel bars that bounce while a song is playing.
function Eq({ playing }: { playing: boolean }) {
  return (
    <span aria-hidden className="flex h-3 items-end gap-[2px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-[3px] origin-bottom bg-mint ${playing ? 'eq-bar h-3' : 'h-1'}`}
          style={playing ? { animationDelay: `${-i * 0.27}s` } : undefined}
        />
      ))}
    </span>
  )
}

// Ordered (Bayer 4×4) dither, so the cover matches the site's dithered bands.
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)
const RAMP = ['#1d4f4c', '#22706c', '#2f8f8a', '#a9d3cf', '#e9dfca'].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)))
const SIZE = 40

// The album cover, shrunk to 40×40 and dithered into the teal palette, then scaled up with sharp
// pixels. If the image can't be read (no CORS), it falls back to the plain cover, still pixelated.
function PixelCover({ src, alt }: { src: string | null; alt: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d', { willReadFrequently: true })
    if (!c || !ctx) return
    ctx.fillStyle = '#22706c'
    ctx.fillRect(0, 0, SIZE, SIZE)
    if (!src) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.drawImage(img, 0, 0, SIZE, SIZE)
      try {
        const d = ctx.getImageData(0, 0, SIZE, SIZE)
        const p = d.data
        const n = RAMP.length - 1
        for (let i = 0; i < p.length; i += 4) {
          const x = (i / 4) % SIZE
          const y = Math.floor(i / 4 / SIZE)
          const l = (0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) / 255
          const s = Math.min(0.9999, l) * n
          const k = s | 0
          const [r, g, b] = RAMP[s - k > BAYER4[(y & 3) * 4 + (x & 3)] ? k + 1 : k]
          p[i] = r
          p[i + 1] = g
          p[i + 2] = b
        }
        ctx.putImageData(d, 0, 0)
      } catch {
        // Cross-origin image without CORS: keep the plain pixelated cover.
      }
    }
    img.src = src
  }, [src])
  return <canvas ref={ref} width={SIZE} height={SIZE} role="img" aria-label={alt} className="pixelated aspect-square w-full border border-mint/40" />
}

const time = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}
