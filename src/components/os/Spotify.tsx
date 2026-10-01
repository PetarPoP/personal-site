import { useCallback, useEffect, useRef, useState } from 'react'
import { getNowPlaying } from '#/lib/spotify'
import type { NowPlaying } from '#/lib/spotify'
import { useNow } from '#/lib/hooks'
import { stripes } from '#/lib/os'

const POLL_MS = 20_000

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const ago = (t: number, now: number) => {
  const m = Math.round((now - t) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

// Polls the server while the app is open and the tab is visible.
function useNowPlaying(active: boolean) {
  const [data, setData] = useState<(NowPlaying & { fetchedAt: number }) | null>(null)
  const [error, setError] = useState(false)
  const load = useCallback(async () => {
    try {
      const res = await getNowPlaying()
      setData({ ...res, fetchedAt: Date.now() })
      setError(false)
    } catch {
      setError(true)
    }
  }, [])
  useEffect(() => {
    if (!active) return
    void load()
    const id = setInterval(() => document.visibilityState === 'visible' && void load(), POLL_MS)
    return () => clearInterval(id)
  }, [active, load])
  return { data, error, reload: load }
}

function Equaliser() {
  return (
    <span aria-hidden className="flex h-3 items-end gap-[2px]">
      {[0, 0.25, 0.5, 0.15].map((d) => (
        <span key={d} className="eq-bar w-[3px] bg-[#1ed760]" style={{ height: '100%', animationDelay: `${-d}s` }} />
      ))}
    </span>
  )
}

export function SpotifyPlayer({ active, compact = false }: { active: boolean; compact?: boolean }) {
  const { data, error, reload } = useNowPlaying(active)
  const now = useNow() ?? 0
  const ok = data?.configured && 'track' in data ? data : null
  const track = ok ? ok.track : null
  const playing = !!(ok && ok.playing && track)

  // Reached the end of the song: ask again rather than wait for the next poll.
  const progress = ok && track ? Math.min(track.durationMs, ok.progressMs + (playing ? now - ok.fetchedAt : 0)) : 0
  const lastReload = useRef(0)
  useEffect(() => {
    if (!playing || !track || progress < track.durationMs || Date.now() - lastReload.current < 8000) return
    lastReload.current = Date.now()
    void reload()
  }, [playing, track, progress, reload])

  const tint = useCoverTint(track?.image ?? null)

  const pad = compact ? 'p-4' : 'p-5'
  if (!data && !error) return <p className={`m-0 text-xs text-dim ${pad}`}>tuning in…</p>
  if (error) return <p className={`m-0 text-xs text-signal ${pad}`}>Couldn't reach Spotify. Try again in a bit.</p>
  if (!data?.configured) return <p className={`m-0 text-xs text-dim ${pad}`}>Spotify isn't connected yet.</p>
  if (!ok)
    return (
      <div className={`flex flex-col gap-2 text-xs ${pad}`}>
        <p className="m-0 text-signal">Couldn't reach Spotify right now.</p>
        {'error' in data && <p className="m-0 text-dim select-text">{data.error}</p>}
      </div>
    )
  if (!track) return <p className={`m-0 text-xs text-dim ${pad}`}>Nothing played lately.</p>

  const pct = track.durationMs ? (progress / track.durationMs) * 100 : 0
  const showProgress = playing || ok.progressMs > 0
  return (
    // Laid out like Spotify's own now-playing screen, tinted with the cover's colour.
    <div
      className={`thin-scroll flex min-h-0 flex-1 flex-col overflow-auto font-sans text-white transition-[background] duration-700 ${compact ? 'min-h-full px-6 pt-5 pb-10' : 'px-6 pt-4 pb-6'}`}
      style={{ background: `linear-gradient(180deg, ${tint} 0%, #121212 ${compact ? '85%' : '100%'})` }}
    >
      <div className="flex flex-col items-center text-center">
        <span className="text-[12px] text-white/75">
          {playing ? 'Playing from album' : ok.playedAt ? `Last played ${ago(ok.playedAt, now || ok.fetchedAt)}` : 'Paused'}
        </span>
        <span className="max-w-full truncate text-[14px] font-bold">{track.album}</span>
      </div>

      <a
        href={track.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`${track.title} on Spotify`}
        className={`mx-auto mt-5 block aspect-square w-full overflow-hidden rounded-md shadow-[0_8px_40px_rgba(0,0,0,.5)] ${compact ? '' : 'max-w-[320px]'}`}
        style={{ background: stripes('#1c3132') }}
      >
        {track.image && <img src={track.image} alt={`${track.album} cover`} crossOrigin="anonymous" className="size-full object-cover" />}
      </a>

      <div className="mt-6 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className={`m-0 truncate leading-tight font-bold tracking-[-0.01em] ${compact ? 'text-[24px]' : 'text-[22px]'}`} title={track.title}>
            {track.title}
          </h3>
          <p className="m-0 mt-1 truncate text-[16px] text-white/70">{track.artists}</p>
        </div>
        {playing && <Equaliser />}
      </div>

      {showProgress && (
        <div className="mt-5" role="progressbar" aria-label="Song progress" aria-valuemin={0} aria-valuemax={track.durationMs} aria-valuenow={progress}>
          <div className="relative h-1 rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
            <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" style={{ left: `${pct}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[12px] text-white/70 tabular-nums">
            <span>{mmss(progress)}</span>
            <span>{mmss(track.durationMs)}</span>
          </div>
        </div>
      )}

      <a
        href={track.url}
        target="_blank"
        rel="noreferrer"
        title="Open in Spotify"
        aria-label={`${playing ? 'Playing' : 'Paused'}. Open in Spotify`}
        className={`mx-auto flex size-16 flex-none items-center justify-center rounded-full bg-white text-[#121212] transition-transform hover:scale-105 ${showProgress ? 'mt-3' : 'mt-6'}`}
      >
        {playing ? (
          <svg aria-hidden viewBox="0 0 24 24" className="size-7 fill-current">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg aria-hidden viewBox="0 0 24 24" className="size-7 fill-current">
            <path transform="translate(-1.3 0)" d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
          </svg>
        )}
      </a>
    </div>
  )
}

// The cover's average colour, darkened, for the background like Spotify does.
const FALLBACK_TINT = '#2b3d3c'
function useCoverTint(src: string | null) {
  const [tint, setTint] = useState(FALLBACK_TINT)
  useEffect(() => {
    if (!src) return setTint(FALLBACK_TINT)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = c.height = 16
        const ctx = c.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, 16, 16)
        const px = ctx.getImageData(0, 0, 16, 16).data
        let [r, g, b] = [0, 0, 0]
        for (let i = 0; i < px.length; i += 4) [r, g, b] = [r + px[i], g + px[i + 1], b + px[i + 2]]
        const n = px.length / 4
        const k = 0.55
        setTint(`rgb(${Math.round((r / n) * k)}, ${Math.round((g / n) * k)}, ${Math.round((b / n) * k)})`)
      } catch {
        // The image host didn't allow reading pixels; keep the default colour.
        setTint(FALLBACK_TINT)
      }
    }
    img.onerror = () => setTint(FALLBACK_TINT)
    img.src = src
  }, [src])
  return tint
}
