import { useEffect, useRef, useState } from 'react'
import { getNowPlaying } from '#/lib/spotify'
import type { NowPlaying } from '#/lib/spotify'

type Live = Extract<NowPlaying, { playing: boolean }>

const POLL_MS = 30_000

// What Petar is listening to, at the bottom of the hero's water: the song playing now, or the
// last one he played. Asked every 30 seconds (and when a song should end) while the hero is on
// screen and the tab is visible, so it costs the Worker little. Hidden when Spotify isn't set
// up; after an error the last song stays until Spotify answers again. `onPlaying` tells the
// page, which makes the water move faster while a song plays.
export function Spotify({ onPlaying }: { onPlaying: (playing: boolean) => void }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const [data, setData] = useState<{ np: Live; at: number } | null>(null)
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
          if (np.configured && 'playing' in np && np.track) setData({ np, at: Date.now() })
          else if (!np.configured) setData(null)
          // A Spotify error keeps the last song on screen; the next round tries again.
        })
        .catch(() => {})
        .finally(() => {
          busy = false
          if (!alive) return
          timer = window.setTimeout(load, POLL_MS)
        })
    }
    const io = new IntersectionObserver(([e]) => {
      const was = visible
      visible = e.isIntersecting
      if (visible && !was) load()
    })
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

  const playing = !!data?.np.playing
  useEffect(() => onPlaying(playing), [playing, onPlaying])

  // Keep the progress line moving between answers.
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

  const track = data?.np.track ?? null
  const progress = data && track ? Math.min(track.durationMs, data.np.progressMs + (playing ? now - data.at : 0)) : 0
  const label = playing ? 'Playing now' : `Last played${data?.np.playedAt ? ` · ${ago(data.np.playedAt)}` : ''}`

  // Always rendered (empty until Spotify answers) so the observer has something to watch.
  return (
    <a
      ref={ref}
      href={track?.url ?? undefined}
      target="_blank"
      rel="noreferrer"
      aria-label={track ? `${label}: ${track.title} by ${track.artists}, open in Spotify` : undefined}
      aria-hidden={!track}
      tabIndex={track ? undefined : -1}
      data-spotify
      className={`group absolute right-3 bottom-3 left-3 z-[1] flex max-w-[460px] items-center gap-3.5 overflow-hidden border border-ink bg-deep/90 p-2.5 pr-4 text-paper no-underline backdrop-blur-sm transition-[opacity,translate] duration-700 ease-out sm:right-auto sm:bottom-4 sm:left-4 sm:w-[min(460px,calc(100%-32px))] ${
        track ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      {track && (
        <>
          {track.image ? (
            <img src={track.image} alt="" width={56} height={56} className="aspect-square w-14 shrink-0 object-cover" />
          ) : (
            <span aria-hidden className="aspect-square w-14 shrink-0 bg-teal" />
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[.1em] text-mint uppercase">
              <Eq playing={playing} />
              {label}
            </span>
            <span className="truncate text-[17px] leading-tight font-semibold tracking-[-.02em]">{track.title}</span>
            <span className="truncate text-sm text-paper/70">{track.artists}</span>
          </span>
          <span aria-hidden className="shrink-0 text-lg text-mint transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            ↗
          </span>
          {playing && (
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-paper/10">
              <span className="block h-full bg-mint transition-[width] duration-1000 ease-linear" style={{ width: `${(progress / track.durationMs) * 100}%` }} />
            </span>
          )}
        </>
      )}
    </a>
  )
}

// Three pixel bars that bounce while a song is playing, flat when it isn't.
function Eq({ playing }: { playing: boolean }) {
  return (
    <span aria-hidden className="flex h-3 items-end gap-[2px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-[3px] origin-bottom bg-mint ${playing ? 'eq-bar keep-motion h-3' : 'h-1'}`}
          style={playing ? { animationDelay: `${-i * 0.27}s` } : undefined}
        />
      ))}
    </span>
  )
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
