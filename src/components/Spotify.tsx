import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { QRCodeSVG } from 'qrcode.react'
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
      <h2 className="heading">{playing ? 'Playing right now' : 'Last played'}</h2>
      {track && data && <Ticket track={track} playing={playing} progress={progress} playedAt={data.np.playedAt} />}
    </div>
  )
}

// Round bites out of the two corners on one side, where the stub tears off.
const notch = (side: 'left' | 'right'): CSSProperties => {
  const x = side === 'right' ? '100%' : '0'
  const m = `radial-gradient(circle 14px at ${x} 0,transparent 13.5px,#000 14px) top/100% 51% no-repeat,radial-gradient(circle 14px at ${x} 100%,transparent 13.5px,#000 14px) bottom/100% 51% no-repeat`
  return { WebkitMask: m, mask: m }
}

// A stable four-digit "seat number" for each song.
const ticketNo = (url: string) => {
  let h = 0
  for (const ch of url) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return String(h % 10000).padStart(4, '0')
}

const mono = 'font-mono uppercase tracking-[.1em]'

// The song as a concert ticket: a deep-teal stub, then the dithered cover, the song, and a QR
// code that opens it in Spotify.
function Ticket({ track, playing, progress, playedAt }: { track: Track; playing: boolean; progress: number; playedAt: number | null }) {
  return (
    <a
      href={track.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`${track.title} by ${track.artists}, open in Spotify`}
      className="group grid w-full max-w-[920px] grid-cols-[clamp(56px,11vw,128px)_minmax(0,1fr)] text-deep no-underline drop-shadow-[0_18px_28px_rgba(17,48,46,.5)] transition-transform duration-300 hover:-translate-y-1"
    >
      <div style={notch('right')} className="flex flex-col items-center justify-between rounded-l-[14px] border-r-[3px] border-dashed border-sand bg-deep py-6 text-sand">
        <span className={`${mono} text-[11px] max-sm:[writing-mode:vertical-rl]`}>Ticket</span>
        <span className="flex flex-col items-center gap-0.5">
          <span className={`${mono} text-xs text-mint`}>No.</span>
          <span className="text-[clamp(18px,3.2vw,40px)] leading-none font-semibold tracking-[-.03em] tabular-nums">{ticketNo(track.url)}</span>
        </span>
        <span className={`${mono} text-[11px] max-sm:[writing-mode:vertical-rl]`}>Admit one</span>
      </div>

      <div
        style={notch('left')}
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[clamp(16px,2.4vw,28px)] rounded-r-[14px] bg-sand py-[clamp(18px,2.4vw,26px)] pr-[clamp(16px,2.2vw,24px)] pl-[clamp(20px,2.6vw,28px)] max-md:grid-cols-[minmax(0,1fr)]"
      >
        <PixelCover src={track.image} alt={`${track.album} cover`} />

        <div className="flex min-w-0 flex-col gap-2">
          <span className={`${mono} flex items-center gap-2 text-xs font-semibold text-teal-2`}>
            <Eq playing={playing} />
            {playing ? 'Live on Spotify' : `On Spotify${playedAt ? ` · ${ago(playedAt)}` : ''}`}
          </span>
          <span className="text-[clamp(28px,3.6vw,46px)] leading-[.95] font-semibold tracking-[-.035em] text-balance">{track.title}</span>
          <span className="truncate text-[clamp(15px,1.4vw,17px)]">{track.artists}</span>

          <div className={`${mono} mt-2 flex items-center gap-3 text-xs font-semibold tabular-nums`}>
            <span className="min-w-8">{time(progress)}</span>
            <Blocks value={playing ? progress / track.durationMs : 1} playing={playing} />
            <span>{time(track.durationMs)}</span>
          </div>

          <div className={`${mono} flex gap-6 text-[11px]`}>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-teal-2">Album</span>
              <span className="truncate font-semibold">{track.album}</span>
            </span>
            {track.year && (
              <span className="flex flex-col gap-0.5">
                <span className="text-teal-2">Year</span>
                <span className="font-semibold">{track.year}</span>
              </span>
            )}
          </div>
        </div>

        <span className="flex flex-col items-center justify-center gap-2 self-stretch border-l-[1.5px] border-deep pl-5 max-md:hidden">
          <QRCodeSVG value={track.url} size={96} fgColor="#1d4f4c" bgColor="#e9dfca" marginSize={0} />
          <span className={`${mono} text-[10px] font-semibold transition-colors group-hover:text-teal`}>Scan ↗</span>
        </span>
      </div>
    </a>
  )
}

// Progress as a row of square pixels; the newest lit one blinks while a song plays.
function Blocks({ value, playing }: { value: number; playing: boolean }) {
  const n = 28
  const lit = Math.round(Math.max(0, Math.min(1, value)) * n)
  return (
    <span aria-hidden className="flex flex-1 items-center gap-[3px]">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`aspect-square max-w-2 flex-1 ${i < lit ? 'bg-deep' : 'bg-deep/15'} ${playing && i === lit - 1 ? 'animate-pulse' : ''}`} />
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
          className={`w-[3px] origin-bottom bg-teal-2 ${playing ? 'eq-bar h-3' : 'h-1'}`}
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
  return <canvas ref={ref} width={SIZE} height={SIZE} role="img" aria-label={alt} className="pixelated aspect-square w-[clamp(96px,12vw,132px)]" />
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
