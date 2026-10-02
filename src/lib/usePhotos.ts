import { useEffect, useState } from 'react'
import { photoCode, photos as placeholders, toneColor } from '#/data/portfolio'
import type { PhotoCategory } from '#/data/portfolio'
import { getPhotos } from './photos'
import type { PhotoList } from './photos'

// One photo as the Photos folder and app show it: from Immich when it's set up, otherwise the
// placeholder frames from portfolio.ts.
export type Frame = {
  key: string
  code: string
  caption: string
  meta: string
  tone: string
  src?: string
  full?: string
  category?: PhotoCategory
  // Grid span and height on desktop, and height on mobile.
  span: number
  height: number
  mobileHeight: number
}

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : ''

const fromImmich = (list: Extract<PhotoList, { photos: unknown }>['photos']): Frame[] =>
  list.map((p, i) => ({
    key: p.id,
    code: photoCode(i),
    caption: p.caption || day(p.date) || photoCode(i),
    meta: p.caption ? day(p.date) : '',
    tone: toneColor.a,
    src: `/api/photos/${p.id}`,
    full: `/api/photos/${p.id}?size=preview`,
    span: p.ratio >= 1.2 ? 3 : 2,
    height: 200,
    mobileHeight: Math.round(Math.min(300, Math.max(110, 170 / p.ratio))),
  }))

const fromPlaceholders = (): Frame[] =>
  placeholders.map((p, i) => ({
    key: String(i),
    code: photoCode(i),
    caption: p.caption,
    meta: p.category,
    tone: toneColor[p.tone],
    src: p.src,
    full: p.src,
    category: p.category,
    span: p.span,
    height: p.height,
    mobileHeight: p.mobileHeight,
  }))

type State = { frames: Frame[]; live: boolean; loading: boolean; error?: string }

// Asked once per page load and shared by the desktop and phone shells.
let request: Promise<PhotoList> | null = null
let settled: State | null = null

const toState = (res: PhotoList): State =>
  !res.configured
    ? { frames: fromPlaceholders(), live: false, loading: false }
    : 'error' in res
      ? { frames: [], live: true, loading: false, error: res.error }
      : { frames: fromImmich(res.photos), live: true, loading: false }

export function usePhotos(active = true): State {
  const [state, setState] = useState<State>(settled ?? { frames: [], live: false, loading: true })
  useEffect(() => {
    if (!active || settled) return
    let alive = true
    request ??= getPhotos()
    request
      .then((res) => (settled = toState(res)))
      .catch(() => {
        request = null
        return { frames: [], live: true, loading: false, error: "Couldn't reach the photo server." }
      })
      .then((s) => alive && setState(s))
    return () => {
      alive = false
    }
  }, [active])
  return settled ?? state
}

// Starts loading the photos next to the open one, so stepping through the viewer is instant.
export function usePreload(srcs: (string | undefined)[]) {
  const key = srcs.join('|')
  useEffect(() => {
    for (const src of key.split('|')) if (src) new Image().src = src
  }, [key])
}
