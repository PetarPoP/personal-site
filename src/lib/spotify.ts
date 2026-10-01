import { createServerFn } from '@tanstack/react-start'

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

let token: { value: string; expires: number } | null = null
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

async function accessToken(id: string, secret: string, refresh: string) {
  if (token && token.expires > Date.now() + 30_000) return token.value
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
  })
  if (!res.ok) throw new Error(`Spotify token request failed: ${res.status}`)
  const json = (await res.json()) as { access_token: string; expires_in: number }
  token = { value: json.access_token, expires: Date.now() + json.expires_in * 1000 }
  return token.value
}

async function fetchNowPlaying(): Promise<NowPlaying> {
  const id = process.env.SPOTIFY_CLIENT_ID
  const secret = process.env.SPOTIFY_CLIENT_SECRET
  const refresh = process.env.SPOTIFY_REFRESH_TOKEN
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
        image: null,
        url: 'https://open.spotify.com',
        durationMs: 215_000,
      },
      progressMs: 61_000,
      playedAt: process.env.SPOTIFY_MOCK === 'recent' ? now - 2 * 3600_000 : null,
    }
  }

  const auth = { Authorization: `Bearer ${await accessToken(id, secret, refresh)}` }
  const current = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: auth })
  if (current.status === 200) {
    const json = (await current.json()) as { is_playing: boolean; progress_ms: number | null; item: (SpotifyTrack & { type: string }) | null }
    if (json.item && json.item.type === 'track')
      return { configured: true, playing: json.is_playing, track: toTrack(json.item), progressMs: json.progress_ms ?? 0, playedAt: null }
  }

  const recent = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', { headers: auth })
  if (!recent.ok) throw new Error(`Spotify recently-played failed: ${recent.status}`)
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
  if (!cached || Date.now() - cached.at >= CACHE_MS) cached = { at: Date.now(), data: await fetchNowPlaying() }
  const { data, at } = cached
  // Progress as of now, so the client can keep counting from the moment the answer arrives.
  return data.configured && data.playing ? { ...data, progressMs: data.progressMs + Date.now() - at } : data
})
