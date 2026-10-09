import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { usePhotos } from '#/lib/usePhotos'
import type { Frame } from '#/lib/usePhotos'

const FIRST = 12

// Petar's photos from his Immich album. Hidden when the album isn't set up or can't be reached.
// Not on the page for now (Pop is deciding where the photos go): put <Photos /> back in Site.tsx.
export function Photos() {
  const frames = usePhotos()
  const [all, setAll] = useState(false)
  const [open, setOpen] = useState<number | null>(null)

  if (frames && !frames.length) return null
  const shown = frames ? (all ? frames : frames.slice(0, FIRST)) : []

  return (
    <section id="photos" className="flex scroll-mt-24 flex-col gap-[clamp(36px,6vw,88px)]">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <h2 className="heading">Through the lens</h2>
        <p className="m-0 max-w-[34ch] text-base leading-normal text-muted">
          Portraits, events and landscapes from Livno, Split and around{frames ? ` · ${frames.length} photos` : ''}.
        </p>
      </div>

      {frames ? (
        <div className="columns-2 gap-[clamp(8px,1.2vw,16px)] md:columns-3">
          {shown.map((f, i) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setOpen(i)}
              className="rise mb-[clamp(8px,1.2vw,16px)] block w-full cursor-zoom-in break-inside-avoid border-0 bg-stone p-0"
              style={{ aspectRatio: f.ratio }}
              aria-label={f.caption ? `Open photo: ${f.caption}` : `Open photo ${i + 1}`}
            >
              <img src={f.src} alt={f.caption} loading="lazy" decoding="async" className="block h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : (
        <div className="columns-2 gap-[clamp(8px,1.2vw,16px)] md:columns-3" aria-hidden>
          {[1.5, 0.8, 1.3, 1, 0.75, 1.5].map((r, i) => (
            <div key={i} className="mb-[clamp(8px,1.2vw,16px)] animate-pulse bg-stone/60" style={{ aspectRatio: r }} />
          ))}
        </div>
      )}

      {frames && frames.length > FIRST && !all && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="cursor-pointer self-start border-0 border-b-2 border-teal bg-transparent py-1.5 text-lg font-semibold text-teal transition-opacity hover:opacity-70"
        >
          Show all {frames.length} photos
        </button>
      )}

      {/* On <body>, above the nav: the page's sections are their own stacking layers. */}
      {frames && open !== null && createPortal(<Lightbox frames={frames} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body)}
    </section>
  )
}

function Lightbox({ frames, index, onIndex, onClose }: { frames: Frame[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const f = frames[index]
  const step = useCallback((d: number) => onIndex((index + d + frames.length) % frames.length), [index, frames.length, onIndex])
  const touch = useRef<number | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // A history entry, so the phone's back button closes the photo instead of leaving the site.
  useEffect(() => {
    history.pushState({ lightbox: true }, '')
    const onPop = () => closeRef.current()
    window.addEventListener('popstate', onPop)
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('popstate', onPop)
      document.documentElement.style.overflow = ''
      if (history.state?.lightbox) history.back()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, onClose])

  // Load the neighbours so stepping through is instant.
  useEffect(() => {
    for (const d of [-1, 1]) new Image().src = frames[(index + d + frames.length) % frames.length].full
  }, [index, frames])

  const btn = 'absolute z-[1] grid size-12 cursor-pointer place-items-center border-0 bg-transparent text-paper transition-opacity hover:opacity-60'
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1916]/95"
      onClick={onClose}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return
        const dx = e.changedTouches[0].clientX - touch.current
        touch.current = null
        if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1)
      }}
    >
      {/* Thumbnail first (already cached from the grid), the larger preview on top once it loads. */}
      <div className="relative max-h-[86svh] max-w-[92vw]" style={{ aspectRatio: f.ratio, width: `min(92vw, ${86 * f.ratio}svh)` }} onClick={(e) => e.stopPropagation()}>
        <img src={f.src} alt="" aria-hidden className="absolute inset-0 h-full w-full object-contain" />
        <img key={f.key} src={f.full} alt={f.caption} className="absolute inset-0 h-full w-full object-contain" />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-between gap-4 px-5 py-4 text-sm text-sand/80">
        <span>{f.caption}</span>
        <span>
          {index + 1} / {frames.length}
        </span>
      </div>
      <button type="button" aria-label="Close" className={`${btn} top-3 right-3`} onClick={onClose}>
        <X size={26} />
      </button>
      <button type="button" aria-label="Previous photo" className={`${btn} left-2 max-sm:hidden`} onClick={(e) => (e.stopPropagation(), step(-1))}>
        <ChevronLeft size={34} />
      </button>
      <button type="button" aria-label="Next photo" className={`${btn} right-2 max-sm:hidden`} onClick={(e) => (e.stopPropagation(), step(1))}>
        <ChevronRight size={34} />
      </button>
    </div>
  )
}
