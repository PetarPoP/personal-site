import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Right-click menu. Items can be disabled with a hint saying why.
export type MenuItem = { label: string; onSelect?: () => void; disabled?: boolean; hint?: string; danger?: boolean } | 'sep'
export type MenuState = { x: number; y: number; items: MenuItem[] } | null

export function ContextMenu({ menu, onClose }: { menu: MenuState; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  // Keep the menu inside the viewport.
  useLayoutEffect(() => {
    if (!menu || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({ x: Math.min(menu.x, window.innerWidth - r.width - 6), y: Math.min(menu.y, window.innerHeight - r.height - 6) })
    ref.current.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
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
        const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
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
            disabled={item.disabled}
            title={item.disabled ? item.hint : undefined}
            onClick={() => {
              onClose()
              item.onSelect?.()
            }}
            className={`flex cursor-pointer items-center justify-between gap-4 border-0 bg-transparent px-2.5 py-[7px] text-left font-mono text-xs outline-none hover:bg-deep focus-visible:bg-deep disabled:cursor-default disabled:text-teal disabled:hover:bg-transparent ${item.danger ? 'text-signal' : 'text-paper'}`}
          >
            <span>{item.label}</span>
            {item.disabled && item.hint && <span className="text-[10px] text-teal">{item.hint}</span>}
          </button>
        ),
      )}
    </div>
  )
}
