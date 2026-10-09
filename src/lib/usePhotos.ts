import { useEffect, useState } from 'react'
import { getPhotos } from './photos'

// One photo as the Photos section shows it. Images go through /api/photos/<id>.
export type Frame = { key: string; caption: string; ratio: number; src: string; full: string }

// null while loading. An empty list (Immich not set up, or unreachable) hides the section.
export function usePhotos(): Frame[] | null {
  const [frames, setFrames] = useState<Frame[] | null>(null)
  useEffect(() => {
    let alive = true
    getPhotos()
      .then((res) =>
        res.configured && 'photos' in res
          ? res.photos.map((p) => ({
              key: p.id,
              caption: p.caption,
              ratio: p.ratio,
              src: `/api/photos/${p.id}`,
              full: `/api/photos/${p.id}?size=preview`,
            }))
          : [],
      )
      .catch(() => [])
      .then((f) => alive && setFrames(f))
    return () => {
      alive = false
    }
  }, [])
  return frames
}
