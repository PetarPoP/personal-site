import { useEffect, useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { apps } from '#/lib/os'
import type { AppId } from '#/lib/os'

// The phone's recent apps, like Android's: a shrunk copy of each app's screen, side by side and
// scrolling sideways. Tap a card to open it, flick it up to close it, tap the dark space around
// to go back. The newest app is on the right and in view when it opens; older ones are to the left.
export function Recents({
  open,
  list,
  subtitle,
  preview,
  onPick,
  onRemove,
  onClear,
  onClose,
}: {
  open: boolean
  list: AppId[]
  subtitle: Record<AppId, string>
  preview: (id: AppId) => ReactNode
  onPick: (id: AppId, from: DOMRect) => void
  onRemove: (id: AppId) => void
  onClear: () => void
  onClose: () => void
}) {
  const strip = useRef<HTMLUListElement>(null)
  // Cards keep the screen's shape, as big as fits between the title and the Clear all button.
  const [screen, setScreen] = useState({ w: 390, h: 844 })
  useEffect(() => {
    if (!open) return
    setScreen({ w: window.innerWidth, h: window.innerHeight })
    // Always start at the newest app, wherever the strip was left last time. After the frame,
    // so the browser's scroll snapping doesn't put it back on the card it was snapped to.
    const end = () => strip.current?.scrollTo({ left: strip.current.scrollWidth, behavior: 'instant' })
    end()
    const f = requestAnimationFrame(end)
    return () => cancelAnimationFrame(f)
  }, [open])
  const scale = Math.min(0.72, (screen.h - 250) / screen.h, 340 / screen.w)
  return (
    <div
      role="dialog"
      aria-label="Recent apps"
      aria-hidden={!open}
      inert={!open}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="absolute inset-0 z-[45] flex flex-col bg-ink/80 backdrop-blur-sm transition-opacity duration-300"
      style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
    >
      <div className="pointer-events-none mt-14 px-6 text-[11px] tracking-[0.1em] text-dim">RECENT</div>
      {list.length ? (
        <ul
          ref={strip}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          className="m-0 flex flex-1 snap-x snap-mandatory list-none items-center gap-4 overflow-x-auto px-[14vw] py-6 [scrollbar-width:none]"
        >
          {[...list].reverse().map((id) => (
            <Card
              key={id}
              id={id}
              subtitle={subtitle[id]}
              open={open}
              screen={screen}
              scale={scale}
              preview={preview(id)}
              onPick={onPick}
              onRemove={onRemove}
            />
          ))}
        </ul>
      ) : (
        <p onClick={onClose} className="m-0 flex flex-1 items-center justify-center text-xs text-dim">
          No recent apps
        </p>
      )}
      {list.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="mx-auto mb-12 h-10 cursor-pointer border border-teal bg-ink px-4 font-mono text-[11px] text-paper active:border-amber"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

function Card({
  id,
  subtitle,
  open,
  screen,
  scale,
  preview,
  onPick,
  onRemove,
}: {
  id: AppId
  subtitle: string
  open: boolean
  screen: { w: number; h: number }
  scale: number
  preview: ReactNode
  onPick: (id: AppId, from: DOMRect) => void
  onRemove: (id: AppId) => void
}) {
  const a = apps[id]
  const [dy, setDy] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const drag = useRef<{ y: number; x: number; id: number; vertical: boolean | null } | null>(null)
  const moved = useRef(false)
  const shot = useRef<HTMLSpanElement>(null)

  const down = (e: PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, vertical: null }
    moved.current = false
  }
  const move = (e: PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const x = e.clientX - d.x
    const y = e.clientY - d.y
    if (d.vertical === null && Math.hypot(x, y) > 8) {
      d.vertical = Math.abs(y) > Math.abs(x)
      moved.current = true
      if (d.vertical) e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (d.vertical) setDy(Math.min(0, y))
  }
  const up = (e: PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (!d.vertical) return
    if (dy < -90) setLeaving(true)
    else setDy(0)
  }

  return (
    <li className="flex flex-none snap-center flex-col gap-2.5">
      <span className="flex items-center gap-2 px-1" style={{ opacity: open ? 1 : 0 }}>
        <span
          aria-hidden
          className="flex size-6 items-center justify-center border text-[10px] font-bold"
          style={{ background: a.bg, color: a.fg, borderColor: a.border }}
        >
          {a.glyph}
        </span>
        <span className="font-sans text-sm font-extrabold">{a.label}</span>
        <span className="ml-auto text-[10px] text-dim">{subtitle}</span>
      </span>
      {/* Not a <button>: the app's screen inside has buttons of its own. */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Open ${a.label}`}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && shot.current && onPick(id, shot.current.getBoundingClientRect())}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClick={() => !moved.current && shot.current && onPick(id, shot.current.getBoundingClientRect())}
        onTransitionEnd={(e) => e.target === e.currentTarget && leaving && onRemove(id)}
        className="relative touch-pan-x cursor-pointer overflow-hidden bg-ink text-left font-mono text-paper shadow-[0_20px_50px_rgba(0,0,0,.6)] outline outline-teal select-none"
        style={{
          width: screen.w * scale,
          height: screen.h * scale,
          transform: leaving ? 'translateY(-120vh)' : `translateY(${dy}px) scale(${open ? 1 : 0.92})`,
          opacity: leaving ? 0 : 1 - Math.min(0.6, -dy / 400),
          transition: drag.current?.vertical ? 'none' : 'transform .3s cubic-bezier(.2,.8,.2,1), opacity .3s',
        }}
      >
        {/* The app's own screen at full size, shrunk to the card. */}
        <span
          ref={shot}
          aria-hidden
          inert
          className="pointer-events-none absolute top-0 left-0 flex flex-col bg-ink"
          style={{ width: screen.w, height: screen.h, transform: `scale(${scale})`, transformOrigin: '0 0' }}
        >
          {preview}
        </span>
      </div>
    </li>
  )
}
