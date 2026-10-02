import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { type LucideIcon } from 'lucide-react'
import { toast } from './Toaster'

// Right-click menu. Items can be disabled with a hint saying why; picking one anyway
// explains it in a toast (reason, or the hint).
export type MenuItem = { label: string; icon?: LucideIcon; onSelect?: () => void; disabled?: boolean; hint?: string; reason?: string; danger?: boolean } | 'sep'
export type MenuState = { x: number; y: number; items: MenuItem[] } | null

export function ContextMenu({ menu, onClose }: { menu: MenuState; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  // Keep the menu inside the viewport.
  useLayoutEffect(() => {
    if (!menu || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({ x: Math.min(menu.x, window.innerWidth - r.width - 6), y: Math.min(menu.y, window.innerHeight - r.height - 6) })
    ref.current.querySelector<HTMLButtonElement>('button:not([aria-disabled=true])')?.focus()
  }, [menu])

  useEffect(() => {
    if (!menu) return
    const down = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('pointerdown', down, true)
    window.addEventListener('keydown', key)
    window.addEventListener('blur', onClose)
    return () => {
      window.removeEventListener('pointerdown', down, true)
      window.removeEventListener('keydown', key)
      window.removeEventListener('blur', onClose)
    }
  }, [menu, onClose])

  if (!menu) return null
  return (
    <div
      ref={ref}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
        e.preventDefault()
        const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button:not([aria-disabled=true])') ?? [])]
        const i = items.indexOf(document.activeElement as HTMLButtonElement)
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
      }}
      className="fixed z-[2000] flex min-w-[220px] flex-col border border-teal bg-ink p-1 font-mono text-xs shadow-[0_20px_50px_rgba(0,0,0,.6)]"
      style={{ left: pos.x || menu.x, top: pos.y || menu.y }}
    >
      {menu.items.map((item, i) =>
        item === 'sep' ? (
          <div key={i} className="my-1 h-px bg-deep" />
        ) : (
          <button
            key={i}
            role="menuitem"
            type="button"
            aria-disabled={item.disabled || undefined}
            title={item.disabled ? item.hint : undefined}
            onClick={() => {
              onClose()
              if (item.disabled) toast.error(item.reason ?? `${item.label.replace(/^[^\w]+/, '')}: ${item.hint ?? 'not available'}`)
              else item.onSelect?.()
            }}
            className={`flex cursor-pointer items-center justify-between gap-4 border-0 bg-transparent px-2.5 py-[7px] text-left font-mono text-xs outline-none hover:bg-deep focus-visible:bg-deep aria-disabled:cursor-not-allowed aria-disabled:text-teal aria-disabled:hover:bg-transparent ${item.danger ? 'text-signal' : 'text-paper'}`}
          >
            <span className="flex items-center gap-2">
              {item.icon && <item.icon aria-hidden className="size-3.5" />}
              {item.label}
            </span>
            {item.disabled && item.hint && <span className="text-[10px] text-teal">{item.hint}</span>}
          </button>
        ),
      )}
    </div>
  )
}
