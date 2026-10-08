import { createServerFn } from '@tanstack/react-start'
import { Redis } from '@upstash/redis'

// What Petar is listening to on Spotify: the current song, or the last one played.
// Needs SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and a SPOTIFY_REFRESH_TOKEN with the
// user-read-currently-playing and user-read-recently-played scopes.

export type Track = {
  title: string
  artists: string
  album: string
  image: string | null
  url: string
  durationMs: number
}
export type NowPlaying =
  | { configured: false }
  | { configured: true; playing: boolean; track: Track | null; progressMs: number; playedAt: number | null }
  | { configured: true; error: string }

// A Spotify answer we can explain to the site owner (shown in the app and in the server log).
class SpotifyError extends Error {}

// Values pasted into a dashboard sometimes keep quotes or spaces.
const env = (name: string) => process.env[name]?.trim().replace(/^(['"])(.*)\1$/, '$2').trim() || undefined

async function failure(res: Response, what: string) {
  let detail = ''
  try {
    const body = (await res.json()) as { error?: string | { message?: string }; error_description?: string }
    detail = typeof body.error === 'string' ? `${body.error}${body.error_description ? `: ${body.error_description}` : ''}` : (body.error?.message ?? '')
  } catch {
    // Not JSON.
  }
  return `${what} (${res.status}${detail ? `, ${detail}` : ''})`
}

let token: { value: string; expires: number } | null = null

// Spotify can hand out a new refresh token when the old one is used; the newest one is kept in
// Upstash (or memory) so the site keeps working. It is tied to the SPOTIFY_REFRESH_TOKEN it grew
// from, so putting a new token in the secrets replaces it.
const REFRESH_KEY = 'popos:spotify-refresh'
type SavedRefresh = { from: string; token: string }
let memoryRefresh: SavedRefresh | null = null

function redis() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const auth = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  return url && auth ? new Redis({ url, token: auth }) : null
}

async function fingerprint(value: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`spotify:${value}`))
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function currentRefresh(fromEnv: string) {
  const from = await fingerprint(fromEnv)
  try {
    const saved = (await redis()?.get<SavedRefresh>(REFRESH_KEY)) ?? memoryRefresh
    if (saved?.from === from && saved.token) return saved.token
  } catch (e) {
    console.error('[spotify] could not read the saved refresh token', e)
  }
  return fromEnv
}

async function saveRefresh(fromEnv: string, next: string) {
  const saved = { from: await fingerprint(fromEnv), token: next }
  memoryRefresh = saved
  try {
    await redis()?.set(REFRESH_KEY, saved)
  } catch (e) {
    console.error('[spotify] could not save the new refresh token', e)
  }
}
let cached: { at: number; data: NowPlaying } | null = null
const CACHE_MS = 15_000

type SpotifyTrack = {
  name: string
  duration_ms: number
  external_urls: { spotify: string }
  artists: { name: string }[]
  album: { name: string; images: { url: string; width: number }[] }
}

const toTrack = (t: SpotifyTrack): Track => {
  const images = [...t.album.images].sort((a, b) => a.width - b.width)
  return {
    title: t.name,
    artists: t.artists.map((a) => a.name).join(', '),
    album: t.album.name,
    // The smallest cover that is still at least 300px wide.
    image: (images.find((i) => i.width >= 300) ?? images[images.length - 1])?.url ?? null,
    url: t.external_urls.spotify,
    durationMs: t.duration_ms,
  }
}

async function accessToken(id: string, secret: string, envRefresh: string) {
  if (token && token.expires > Date.now() + 30_000) return token.value
  const refresh = await currentRefresh(envRefresh)
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
  })
  if (!res.ok) {
    const why = await failure(res, 'Spotify refused the login')
    throw new SpotifyError(
      res.status === 400 && why.includes('invalid_client')
        ? `${why}. Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.`
        : res.status === 400
          ? `${why}. Make a new SPOTIFY_REFRESH_TOKEN with "npm run spotify-token" (see README) and redeploy.`
          : why,
    )
  }
  const json = (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string }
  if (json.refresh_token && json.refresh_token !== refresh) await saveRefresh(envRefresh, json.refresh_token)
  token = { value: json.access_token, expires: Date.now() + json.expires_in * 1000 }
  return token.value
}

async function fetchNowPlaying(): Promise<NowPlaying> {
  const id = env('SPOTIFY_CLIENT_ID')
  const secret = env('SPOTIFY_CLIENT_SECRET')
  const refresh = env('SPOTIFY_REFRESH_TOKEN')
  const now = Date.now()

  // Local development without credentials: a fixed song so the app can be worked on.
  if (!id || !secret || !refresh) {
    if (process.env.NODE_ENV === 'production' || !process.env.SPOTIFY_MOCK) return { configured: false }
    return {
      configured: true,
      playing: process.env.SPOTIFY_MOCK !== 'recent',
      track: {
        title: 'Bezimena',
        artists: 'Azra',
        album: 'Sunčana strana ulice',
        image: process.env.SPOTIFY_MOCK_IMAGE ?? null,
        url: 'https://open.spotify.com',
        durationMs: 215_000,
      },
      progressMs: 61_000,
      playedAt: process.env.SPOTIFY_MOCK === 'recent' ? now - 2 * 3600_000 : null,
    }
  }

  const auth = { Authorization: `Bearer ${await accessToken(id, secret, refresh)}` }
  const current = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: auth })
  if (current.status === 401 || current.status === 403)
    throw new SpotifyError(`${await failure(current, 'Spotify blocked "currently playing"')}. The refresh token needs the user-read-currently-playing scope.`)
  if (current.status === 200) {
    const json = (await current.json()) as { is_playing: boolean; progress_ms: number | null; item: (SpotifyTrack & { type: string }) | null }
    if (json.item && json.item.type === 'track')
      return { configured: true, playing: json.is_playing, track: toTrack(json.item), progressMs: json.progress_ms ?? 0, playedAt: null }
  }

  const recent = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', { headers: auth })
  if (recent.status === 401 || recent.status === 403)
    throw new SpotifyError(`${await failure(recent, 'Spotify blocked "recently played"')}. The refresh token needs the user-read-recently-played scope.`)
  if (!recent.ok) throw new SpotifyError(await failure(recent, 'Spotify "recently played" failed'))
  const json = (await recent.json()) as { items: { track: SpotifyTrack; played_at: string }[] }
  const last = json.items[0]
  return {
    configured: true,
    playing: false,
    track: last ? toTrack(last.track) : null,
    progressMs: 0,
    playedAt: last ? Date.parse(last.played_at) : null,
  }
}

export const getNowPlaying = createServerFn({ method: 'GET' }).handler(async (): Promise<NowPlaying> => {
  // Shared by every visitor, so Spotify is asked at most every 15 seconds per server instance.
  if (!cached || Date.now() - cached.at >= CACHE_MS) {
    let data: NowPlaying
    try {
      data = await fetchNowPlaying()
    } catch (e) {
      console.error('[spotify]', e)
      data = { configured: true, error: e instanceof SpotifyError ? e.message : `Couldn't reach Spotify (${e instanceof Error ? e.message : 'unknown error'})` }
    }
    cached = { at: Date.now(), data }
  }
  const { data, at } = cached
  // Progress as of now, so the client can keep counting from the moment the answer arrives.
  return data.configured && 'playing' in data && data.playing ? { ...data, progressMs: data.progressMs + Date.now() - at } : data
})
