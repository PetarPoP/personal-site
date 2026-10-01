import { createServerFn } from '@tanstack/react-start'

// Petar's photos come straight from his own Immich server, through the public share link of
// one album (IMMICH_SHARE_URL, e.g. https://photos.example.com/share/<key>). The site never
// stores them: the list is read on the server, and every image goes through /api/photos/<id>,
// so visitors never see the server's address or the share key.

export type ImmichPhoto = {
  id: string
  caption: string
  date: string | null
  // Width / height, so the grid can lay photos out before they load.
  ratio: number
}
export type PhotoList = { configured: false } | { configured: true; photos: ImmichPhoto[] } | { configured: true; error: string }

const env = (name: string) => process.env[name]?.trim().replace(/^(['"])(.*)\1$/, '$2').trim() || undefined

// "https://host/share/<key>" or "https://host/s/<slug>" → the server and how to sign requests.
export function immichShare() {
  const raw = env('IMMICH_SHARE_URL')
  if (!raw) return null
  try {
    const url = new URL(raw)
    const key = url.pathname.match(/\/share\/([^/]+)/)?.[1]
    const slug = url.pathname.match(/\/s\/([^/]+)/)?.[1]
    if (!key && !slug) return null
    const auth = key ? `key=${encodeURIComponent(key)}` : `slug=${encodeURIComponent(slug!)}`
    return { origin: url.origin, auth }
  } catch {
    return null
  }
}

// Cloudflare can turn away requests that look like bots, so say who's asking.
export const immichHeaders = { Accept: 'application/json', 'User-Agent': 'pop-os-portfolio/1.0' }

type Asset = {
  id: string
  type: string
  originalFileName?: string
  fileCreatedAt?: string
  localDateTime?: string
  width?: number | null
  height?: number | null
  exifInfo?: {
    exifImageWidth?: number | null
    exifImageHeight?: number | null
    orientation?: string | null
    description?: string | null
    city?: string | null
  } | null
}

const ratioOf = (a: Asset) => {
  let w = a.width ?? a.exifInfo?.exifImageWidth ?? 0
  let h = a.height ?? a.exifInfo?.exifImageHeight ?? 0
  // EXIF orientations 5–8 are rotated a quarter turn.
  if (!a.width && ['5', '6', '7', '8'].includes(String(a.exifInfo?.orientation ?? ''))) [w, h] = [h, w]
  return w && h ? w / h : 1.5
}

const toPhoto = (a: Asset): ImmichPhoto => ({
  id: a.id,
  caption: a.exifInfo?.description?.trim() || a.exifInfo?.city || '',
  date: a.localDateTime ?? a.fileCreatedAt ?? null,
  ratio: ratioOf(a),
})

async function get<T>(origin: string, path: string, auth: string): Promise<T> {
  const res = await fetch(`${origin}/api${path}${path.includes('?') ? '&' : '?'}${auth}`, { headers: immichHeaders })
  if (!res.ok) {
    let detail = ''
    try {
      detail = ((await res.json()) as { message?: string }).message ?? ''
    } catch {
      // Not JSON (Cloudflare's own error pages are HTML).
    }
    throw new Error(`Immich answered ${res.status}${detail ? `: ${detail}` : ''} for ${path.split('?')[0]}`)
  }
  return (await res.json()) as T
}

async function fetchPhotos(): Promise<PhotoList> {
  const share = immichShare()
  if (!share) return { configured: false }
  const { origin, auth } = share

  const link = await get<{ assets?: Asset[]; album?: { id: string; assetCount?: number } }>(origin, '/shared-links/me', auth)
  let assets = link.assets ?? []

  if (!assets.length && link.album) {
    const album = await get<{ assets?: Asset[]; assetCount?: number }>(origin, `/albums/${link.album.id}`, auth)
    assets = album.assets ?? []

    // Newer Immich versions leave album.assets empty and serve the album as a timeline.
    if (!assets.length && (album.assetCount ?? link.album.assetCount ?? 0) > 0) {
      const q = `albumId=${link.album.id}&order=desc`
      const buckets = await get<{ timeBucket: string }[]>(origin, `/timeline/buckets?${q}`, auth)
      for (const b of buckets) {
        const cols = await get<{ id: string[]; isImage: boolean[]; ratio?: number[]; fileCreatedAt?: string[]; localDateTime?: string[] }>(
          origin,
          `/timeline/bucket?${q}&timeBucket=${encodeURIComponent(b.timeBucket)}`,
          auth,
        )
        cols.id.forEach((id, i) =>
          cols.isImage[i] &&
          assets.push({ id, type: 'IMAGE', localDateTime: cols.localDateTime?.[i], fileCreatedAt: cols.fileCreatedAt?.[i], ...(cols.ratio?.[i] ? { width: cols.ratio[i], height: 1 } : {}) }),
        )
      }
    }
  }

  return { configured: true, photos: assets.filter((a) => a.type === 'IMAGE').map(toPhoto) }
}

let cached: { at: number; data: PhotoList } | null = null
const CACHE_MS = 5 * 60_000

export const getPhotos = createServerFn({ method: 'GET' }).handler(async (): Promise<PhotoList> => {
  // The album rarely changes, so Immich is asked at most every 5 minutes per server instance.
  if (!cached || Date.now() - cached.at >= CACHE_MS) {
    let data: PhotoList
    try {
      data = await fetchPhotos()
    } catch (e) {
      console.error('[photos]', e)
      data = { configured: true, error: e instanceof Error ? e.message : 'unknown error' }
    }
    // Don't hold on to a failure for long.
    cached = { at: 'error' in data ? Date.now() - CACHE_MS + 30_000 : Date.now(), data }
  }
  return cached.data
})
