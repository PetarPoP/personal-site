import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { PointerEvent, ReactNode, Ref } from 'react'

export type SwipeHandle = { step: (dir: 1 | -1) => void }

// The phone photo viewer's strip: previous, current and next photo side by side. Dragging moves
// it with the finger; letting go past a fifth of the width slides to the neighbour, otherwise it
// springs back. The ‹ › buttons slide the same way through `ref.step`.
export function PhotoSwipe<T extends { key: string }>({
  list,
  at,
  onChange,
  render,
  className = '',
  ref,
}: {
  list: T[]
  at: number
  onChange: (index: number) => void
  render: (item: T) => ReactNode
  className?: string
  ref?: Ref<SwipeHandle>
}) {
  const n = list.length
  const [dx, setDx] = useState(0)
  // While animating: the direction it slides to (0 = back to the middle).
  const [anim, setAnim] = useState<-1 | 0 | 1 | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; id: number; horizontal: boolean | null } | null>(null)

  const go = (dir: -1 | 1) => {
    if (n < 2 || anim !== null) return
    setDx(0)
    setAnim(dir)
  }
  useImperativeHandle(ref, () => ({ step: go }))

  const settle = () => {
    if (anim === null) return
    if (anim !== 0) onChange((at + anim + n) % n)
    setAnim(null)
    setDx(0)
  }
  // transitionend can be skipped (tab hidden, reduced motion), so settle anyway.
  useEffect(() => {
    if (anim === null) return
    const t = setTimeout(settle, 400)
    return () => clearTimeout(t)
  })

  const down = (e: PointerEvent) => {
    if (n < 2 || anim !== null) return
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horizontal: null }
  }
  const move = (e: PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const x = e.clientX - d.x
    const y = e.clientY - d.y
    if (d.horizontal === null && Math.hypot(x, y) > 8) {
      d.horizontal = Math.abs(x) > Math.abs(y)
      if (d.horizontal) e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (d.horizontal) setDx(x)
  }
  const up = (e: PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (!d.horizontal) return
    const width = box.current?.clientWidth ?? 1
    if (Math.abs(dx) > width / 5) setAnim(dx < 0 ? 1 : -1)
    else if (dx !== 0) setAnim(0)
  }

  if (n < 2) return <div className={`relative flex min-h-0 ${className}`}>{list[at] && render(list[at])}</div>

  const panels = [list[(at - 1 + n) % n], list[at], list[(at + 1) % n]]
  const third = 100 / 3
  const transform =
    anim === null ? `translateX(calc(${-third}% + ${dx}px))` : `translateX(${-third - anim * third}%)`
  return (
    <div
      ref={box}
      className={`relative min-h-0 touch-pan-y overflow-hidden select-none ${className}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div
        className={`flex h-full w-[300%] ${anim === null ? '' : 'transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]'}`}
        style={{ transform }}
        onTransitionEnd={(e) => e.target === e.currentTarget && settle()}
      >
        {panels.map((item, i) => (
          <div key={n >= 3 ? item.key : `${i}-${item.key}`} className="flex h-full w-1/3 flex-none" aria-hidden={i !== 1 || undefined}>
            {render(item)}
          </div>
        ))}
      </div>
    </div>
  )
}
