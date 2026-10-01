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
        <span key={d} className="eq-bar w-[3px] bg-amber" style={{ height: '100%', animationDelay: `${-d}s` }} />
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

  return (
    <div className={`flex min-h-0 flex-1 gap-5 ${compact ? 'flex-col p-4' : 'items-center p-5'}`}>
      <a
        href={track.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`${track.title} on Spotify`}
        className={`relative flex-none border border-teal ${compact ? 'aspect-square w-full' : 'size-[190px]'}`}
        style={{ background: stripes('#1c3132') }}
      >
        {track.image && <img src={track.image} alt={`${track.album} cover`} className="size-full object-cover" />}
      </a>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2 text-[11px] font-medium">
          {playing ? (
            <>
              <Equaliser />
              <span className="text-amber">NOW PLAYING</span>
            </>
          ) : (
            <span className="text-dim">
              {ok.playedAt ? `LAST PLAYED · ${ago(ok.playedAt, now || ok.fetchedAt).toUpperCase()}` : 'PAUSED'}
            </span>
          )}
        </div>
        <h3 className={`m-0 font-sans leading-[1.05] font-extrabold tracking-[-0.02em] break-words ${compact ? 'text-[28px]' : 'text-[26px]'}`}>{track.title}</h3>
        <p className="m-0 font-sans text-[15px] text-paper">{track.artists}</p>
        <p className="m-0 truncate text-[11px] text-dim">{track.album}</p>
        {(playing || ok.progressMs > 0) && (
          <div className="mt-2 flex flex-col gap-1.5">
            <div className="h-1 bg-deep">
              <div className="h-full bg-amber" style={{ width: `${(progress / track.durationMs) * 100}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-dim">
              <span>{mmss(progress)}</span>
              <span>{mmss(track.durationMs)}</span>
            </div>
          </div>
        )}
        <a
          href={track.url}
          target="_blank"
          rel="noreferrer"
          className={`mt-2 self-start bg-amber px-3.5 py-2 text-xs font-bold text-ink no-underline hover:bg-signal ${compact ? 'w-full py-3.5 text-center text-[13px]' : ''}`}
        >
          Open in Spotify ↗
        </a>
      </div>
    </div>
  )
}
