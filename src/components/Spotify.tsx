import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { getNowPlaying } from '#/lib/spotify'
import type { NowPlaying, Track } from '#/lib/spotify'

type Live = Extract<NowPlaying, { playing: boolean }>

const POLL_MS = 30_000

// What Petar is listening to, as a ticket. Asked every 30 seconds (and when a song should end)
// while the section is on screen and the tab is visible, so it costs the Worker little. Hidden
// when Spotify isn't set up; after an error the last song stays until Spotify answers again.
export function Spotify() {
  const ref = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<{ np: Live; at: number } | null>(null)
  const [hidden, setHidden] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const reload = useRef(() => {})

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let visible = false
    let timer = 0
    let alive = true
    let busy = false
    const load = () => {
      window.clearTimeout(timer)
      if (!visible || document.hidden || busy) return
      busy = true
      getNowPlaying()
        .then((np) => {
          if (!alive) return
          if (np.configured && 'playing' in np && np.track) {
            setData({ np, at: Date.now() })
            setHidden(false)
          } else if (!np.configured) setHidden(true)
          // A Spotify error keeps the last song on screen; the next round tries again.
        })
        .catch(() => {})
        .finally(() => {
          busy = false
          if (!alive) return
          timer = window.setTimeout(load, POLL_MS)
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
    window.addEventListener('focus', onVis)
    reload.current = load
    return () => {
      alive = false
      io.disconnect()
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onVis)
    }
  }, [])

  // Keep the progress moving between answers.
  const playing = !!data?.np.playing
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [playing])

  // Ask again right after the current song should end, so the next one shows up at once.
  useEffect(() => {
    if (!data?.np.playing || !data.np.track) return
    const left = data.np.track.durationMs - data.np.progressMs
    const id = window.setTimeout(() => reload.current(), Math.max(1000, left + 1500))
    return () => window.clearTimeout(id)
  }, [data])

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

// The torn edge between stub and ticket: a ragged line of small teeth (fixed, so the server and the
// browser draw the same one). At rest both edges are straight; on hover they tear.
const TEETH = Array.from({ length: 30 }, (_, i) => Math.round(((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * 8))
const edge = (side: 'stub' | 'body', torn: boolean) => {
  const n = TEETH.length - 1
  const pts = TEETH.map((d, i) => {
    const y = `${((i / n) * 100).toFixed(2)}%`
    return side === 'stub' ? `calc(100% - ${torn ? d : 0}px) ${y}` : `${torn ? 8 - d : 0}px ${y}`
  })
  return side === 'stub' ? `polygon(0 0, ${pts.join(', ')}, 0 100%)` : `polygon(${pts[0]}, 100% 0, 100% 100%, ${pts.reverse().join(', ')})`
}

// Paper crumbs that fly off the top of the tear: [x, y, size, colour].
const CRUMBS: [number, number, number, string][] = [
  [-10, -14, 3, 'bg-sand'],
  [-3, -22, 2, 'bg-sand'],
  [4, -11, 3, 'bg-deep'],
  [9, -19, 2, 'bg-sand'],
  [-14, -6, 2, 'bg-deep'],
  [13, -8, 2, 'bg-sand'],
]

// The song as a concert ticket (the stub tears away on hover, leaving a ragged edge and a few
// crumbs): a deep-teal stub, then the cover, the song, and a QR code that opens it in Spotify.
function Ticket({ track, playing, progress, playedAt }: { track: Track; playing: boolean; progress: number; playedAt: number | null }) {
  return (
    <a
      href={track.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`${track.title} by ${track.artists}, open in Spotify`}
      style={{ '--stub': 'clamp(56px,11vw,128px)' } as CSSProperties}
      className="group relative grid w-full max-w-[920px] grid-cols-[var(--stub)_minmax(0,1fr)] text-deep no-underline drop-shadow-[0_18px_28px_rgba(17,48,46,.5)]"
    >
      <div
        style={{ ...notch('right'), '--rest': edge('stub', false), '--torn': edge('stub', true) } as CSSProperties}
        className="ticket-tear flex origin-bottom-right flex-col items-center justify-between rounded-l-[14px] border-r-[3px] border-dashed border-sand bg-deep py-6 text-sand group-hover:-translate-x-1.5 group-hover:-rotate-[5deg]"
      >
        <span className={`${mono} text-[11px] max-sm:[writing-mode:vertical-rl]`}>Ticket</span>
        <span className="flex flex-col items-center gap-0.5">
          <span className={`${mono} text-xs text-mint`}>No.</span>
          <span className="text-[clamp(18px,3.2vw,40px)] leading-none font-semibold tracking-[-.03em] tabular-nums">{ticketNo(track.url)}</span>
        </span>
        <span className={`${mono} text-[11px] max-sm:[writing-mode:vertical-rl]`}>Admit one</span>
      </div>

      <span aria-hidden className="pointer-events-none absolute top-[14px] left-[var(--stub)]">
        {CRUMBS.map(([x, y, size, color], i) => (
          <span
            key={i}
            style={{ '--x': `${x}px`, '--y': `${y}px`, width: size, height: size, transitionDelay: `${120 + i * 40}ms` } as CSSProperties}
            className={`ticket-crumb absolute ${color}`}
          />
        ))}
      </span>

      <div
        style={{ ...notch('left'), '--rest': edge('body', false), '--torn': edge('body', true) } as CSSProperties}
        className="ticket-tear grid origin-bottom-left grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[clamp(16px,2.4vw,28px)] rounded-r-[14px] bg-sand py-[clamp(18px,2.4vw,26px)] pr-[clamp(16px,2.2vw,24px)] pl-[clamp(20px,2.6vw,28px)] group-hover:translate-x-1 group-hover:rotate-[1deg] max-md:grid-cols-[minmax(0,1fr)]"
      >
        <Cover src={track.image} alt={`${track.album} cover`} />

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
          className={`w-[3px] origin-bottom bg-teal-2 ${playing ? 'eq-bar keep-motion h-3' : 'h-1'}`}
          style={playing ? { animationDelay: `${-i * 0.27}s` } : undefined}
        />
      ))}
    </span>
  )
}

// The album cover as it is.
function Cover({ src, alt }: { src: string | null; alt: string }) {
  const box = 'aspect-square w-[clamp(96px,12vw,132px)] shadow-[0_2px_0_rgba(29,79,76,.25)]'
  return src ? <img src={src} alt={alt} width={132} height={132} loading="lazy" className={`${box} object-cover`} /> : <span role="img" aria-label={alt} className={`${box} bg-teal-2`} />
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
