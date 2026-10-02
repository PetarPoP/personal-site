import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { apps } from '#/lib/os'
import type { AppId } from '#/lib/os'

// The phone's recent apps, like Android's: cards side by side that scroll sideways. Tap a card
// to open it, flick it up to close it, tap the dark space around to go back. The newest app is
// on the right and in view when it opens; older ones are to the left.
export function Recents({
  open,
  list,
  subtitle,
  onPick,
  onRemove,
  onClear,
  onClose,
}: {
  open: boolean
  list: AppId[]
  subtitle: Record<AppId, string>
  onPick: (id: AppId) => void
  onRemove: (id: AppId) => void
  onClear: () => void
  onClose: () => void
}) {
  const strip = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (open && strip.current) strip.current.scrollLeft = strip.current.scrollWidth
  }, [open])
  return (
    <div
      role="dialog"
      aria-label="Recent apps"
      aria-hidden={!open}
      inert={!open}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="absolute inset-0 z-[55] flex flex-col bg-ink/80 backdrop-blur-sm transition-opacity duration-300"
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
            <Card key={id} id={id} subtitle={subtitle[id]} open={open} onPick={onPick} onRemove={onRemove} />
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
  onPick,
  onRemove,
}: {
  id: AppId
  subtitle: string
  open: boolean
  onPick: (id: AppId) => void
  onRemove: (id: AppId) => void
}) {
  const a = apps[id]
  const [dy, setDy] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const drag = useRef<{ y: number; x: number; id: number; vertical: boolean | null } | null>(null)
  const moved = useRef(false)

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
    <li className="flex h-[62vh] max-h-[560px] w-[72vw] max-w-[340px] flex-none snap-center">
      <button
        type="button"
        aria-label={`Open ${a.label}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClick={() => !moved.current && onPick(id)}
        onTransitionEnd={() => leaving && onRemove(id)}
        className="flex w-full touch-pan-x cursor-pointer flex-col overflow-hidden border border-teal bg-ink p-0 text-left font-mono text-paper shadow-[0_20px_50px_rgba(0,0,0,.6)] select-none"
        style={{
          transform: leaving ? 'translateY(-120vh)' : `translateY(${dy}px) scale(${open ? 1 : 0.92})`,
          opacity: leaving ? 0 : 1 - Math.min(0.6, -dy / 400),
          transition: drag.current?.vertical ? 'none' : 'transform .3s cubic-bezier(.2,.8,.2,1), opacity .3s',
        }}
      >
        <span className="flex h-12 flex-none items-center gap-2.5 border-b border-deep px-3">
          <span
            aria-hidden
            className="flex size-7 items-center justify-center border text-[11px] font-bold"
            style={{ background: a.bg, color: a.fg, borderColor: a.border }}
          >
            {a.glyph}
          </span>
          <span className="font-sans text-base font-extrabold">{a.label}</span>
          <span className="ml-auto text-[10px] text-dim">{subtitle}</span>
        </span>
        <span className="phone-grid relative flex flex-1 items-center justify-center">
          <span aria-hidden className="font-sans text-[88px] font-extrabold opacity-25" style={{ color: a.border }}>
            {a.glyph}
          </span>
          <span className="absolute inset-x-0 bottom-3 text-center text-[10px] text-dim">tap to open · swipe up to close</span>
        </span>
      </button>
    </li>
  )
}
