import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, ChevronRight, Copy, CornerDownLeft, Download, Minus, Power, RefreshCw, Square, Wifi, X } from 'lucide-react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { bootLog, profile } from '#/data/portfolio'
import { appFolder, apps, battery, folderApp, formatClock, windowIds } from '#/lib/os'
import type { AppId, Folder, WindowId } from '#/lib/os'
import { blinkOn, markBooted, shouldSkipBoot, useNow, useTerminal } from '#/lib/hooks'
import { useCvPicker } from './CvPicker'
import { ContextMenu } from './ContextMenu'
import type { MenuItem, MenuState } from './ContextMenu'
import { FilesWindow } from './Files'
import { batteryIcon } from './Shade'
import { CvDocument, CvLangSwitch, HudCorners, LogoBox, MailSent, ProgressBar, Wordmark, ic, useMailto } from './shared'
import type { CvLang } from './shared'
import { SpotifyPlayer } from './Spotify'
import { toast } from './Toaster'
import { TerminalBody } from './Terminal'

const BAR = 34
// Default geometry on the design's 1280×800 desktop; scaled to the real viewport.
const DEF: Record<WindowId, { x: number; y: number; w: number; h: number }> = {
  term: { x: 600, y: 300, w: 620, h: 410 },
  files: { x: 130, y: 62, w: 920, h: 560 },
  cv: { x: 340, y: 48, w: 620, h: 700 },
  mail: { x: 420, y: 130, w: 540, h: 460 },
  spotify: { x: 560, y: 70, w: 400, h: 660 },
}
const WINDOW_NAME: Record<WindowId, string> = { term: 'Terminal', files: 'Files', cv: 'Document Viewer', mail: 'Mail', spotify: 'Spotify' }
const WINDOW_SLUG: Record<WindowId, string> = { term: 'terminal', files: 'files', cv: 'cv', mail: 'mail', spotify: 'spotify' }

// Desktop icons, dock and app menu, in this order.
const launchers: AppId[] = ['term', 'work', 'photos', 'notes', 'cv', 'mail', 'spotify']

type Win = { open: boolean; min: boolean; max: boolean; snap: Zone | null; pos: { x: number; y: number } | null; z: number }

// ---- Snap Layouts: zones as fractions of the screen below the top bar, like Windows 11.
type Zone = 'left' | 'right' | 'l23' | 'r13' | 'tl' | 'tr' | 'bl' | 'br'
const ZONES: Record<Zone, { x: number; y: number; w: number; h: number; label: string }> = {
  left: { x: 0, y: 0, w: 1 / 2, h: 1, label: 'left half' },
  right: { x: 1 / 2, y: 0, w: 1 / 2, h: 1, label: 'right half' },
  l23: { x: 0, y: 0, w: 2 / 3, h: 1, label: 'left two thirds' },
  r13: { x: 2 / 3, y: 0, w: 1 / 3, h: 1, label: 'right third' },
  tl: { x: 0, y: 0, w: 1 / 2, h: 1 / 2, label: 'top left' },
  tr: { x: 1 / 2, y: 0, w: 1 / 2, h: 1 / 2, label: 'top right' },
  bl: { x: 0, y: 1 / 2, w: 1 / 2, h: 1 / 2, label: 'bottom left' },
  br: { x: 1 / 2, y: 1 / 2, w: 1 / 2, h: 1 / 2, label: 'bottom right' },
}
const LAYOUTS: Zone[][] = [
  ['left', 'right'],
  ['l23', 'r13'],
  ['left', 'tr', 'br'],
  ['tl', 'tr', 'bl', 'br'],
]
const zoneRect = (z: Zone, W: number, H: number) => {
  const r = ZONES[z]
  const h = H - BAR
  return { x: Math.round(r.x * W), y: BAR + Math.round(r.y * h), w: Math.round(r.w * W), h: Math.round(r.h * h) }
}
// Where a window dragged to (px, py) would snap: edges give halves, corners quarters, the top bar full screen.
const EDGE = 6
const CORNER = 120
function dropZone(px: number, py: number, W: number, H: number): Zone | 'max' | null {
  const left = px <= EDGE
  const right = px >= W - EDGE
  if (left || right) {
    if (py <= BAR + CORNER) return left ? 'tl' : 'tr'
    if (py >= H - CORNER) return left ? 'bl' : 'br'
    return left ? 'left' : 'right'
  }
  if (py <= BAR + 2) return 'max'
  return null
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// ---- desktop icon positions: snapped to the 80px wallpaper grid, kept in localStorage until a reboot or refresh.
// The grid sits inside the orange corner brackets and above the dock.

const CELL = 80
const GRID_X = 24
const GRID_Y = 88
const GRID_BOTTOM = 84
const ICONS_KEY = 'popos-icons-v2'
type Cell = { c: number; r: number }
const gridSize = ({ W, H }: { W: number; H: number }) => ({
  cols: Math.max(1, Math.floor((W - 2 * GRID_X) / CELL)),
  rows: Math.max(1, Math.floor((H - GRID_Y - GRID_BOTTOM) / CELL)),
})
const cellKey = (p: Cell) => `${p.c},${p.r}`
const defaultCells = (): Record<string, Cell> => Object.fromEntries(launchers.map((id, i) => [id, { c: 0, r: i }]))
function loadCells(): Record<string, Cell> {
  try {
    const saved = JSON.parse(localStorage.getItem(ICONS_KEY) ?? 'null') as Record<string, Cell> | null
    if (saved && launchers.every((id) => Number.isInteger(saved[id]?.c) && Number.isInteger(saved[id]?.r))) return saved
  } catch {
    // Ignore unreadable storage and fall back to the default layout.
  }
  return defaultCells()
}
function saveCells(cells: Record<string, Cell> | null) {
  try {
    if (cells) localStorage.setItem(ICONS_KEY, JSON.stringify(cells))
    else localStorage.removeItem(ICONS_KEY)
  } catch {
    // Storage blocked: positions just don't persist.
  }
}
function nearestFree(want: Cell, taken: Set<string>, cols: number, rows: number): Cell {
  let best = want
  let bestD = Infinity
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      const d = (c - want.c) ** 2 + (r - want.r) ** 2
      if (d < bestD && !taken.has(`${c},${r}`)) [best, bestD] = [{ c, r }, d]
    }
  return best
}
// Where each icon actually goes on this screen: inside the grid, one icon per cell.
function layoutCells(cells: Record<string, Cell>, cols: number, rows: number) {
  const taken = new Set<string>()
  const out: Record<string, Cell> = {}
  for (const id of launchers) {
    const want = { c: clamp(cells[id].c, 0, cols - 1), r: clamp(cells[id].r, 0, rows - 1) }
    const at = taken.has(cellKey(want)) ? nearestFree(want, taken, cols, rows) : want
    taken.add(cellKey(at))
    out[id] = at
  }
  return out
}
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

export function Desktop({
  enabled,
  initialApp,
  onActiveChange,
}: {
  enabled: boolean | null
  initialApp?: AppId
  onActiveChange: (app: AppId | null) => void
}) {
  const now = useNow()
  const blink = blinkOn(now)

  const rootRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ W: 1280, H: 800 })
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ W: el.clientWidth || 1280, H: el.clientHeight || 800 }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ---- boot: log → splash → desktop
  const [phase, setPhase] = useState<'boot' | 'splash' | 'desk'>('boot')
  const [bootN, setBootN] = useState(0)
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState(false)
  // Everything on the desktop lives in a session that a reboot replaces.
  const [session, setSession] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const finishBoot = useCallback((withToast = true) => {
    clearInterval(timer.current)
    setPhase('desk')
    setProgress(100)
    markBooted()
    if (withToast) {
      setToast(true)
      clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => setToast(false), 7000)
    }
  }, [])

  const runBoot = useCallback(() => {
    clearInterval(timer.current)
    setPhase('boot')
    setBootN(0)
    setProgress(0)
    setToast(false)
    let n = 0
    timer.current = setInterval(() => {
      n += 1
      if (n <= bootLog.length) {
        setBootN(n)
        return
      }
      clearInterval(timer.current)
      setPhase('splash')
      let p = 0
      timer.current = setInterval(() => {
        p += 3
        if (p < 100) setProgress(p)
        else finishBoot()
      }, 30)
    }, 90)
  }, [finishBoot])

  // Reboot: the boot screen covers the desktop first, then the desktop resets underneath it.
  const reboot = useCallback(() => {
    runBoot()
    saveCells(null)
    requestAnimationFrame(() => requestAnimationFrame(() => setSession((s) => s + 1)))
  }, [runBoot])

  const started = useRef(false)
  useEffect(() => {
    if (enabled === null || started.current) return
    started.current = true
    if (enabled && !initialApp && !shouldSkipBoot()) runBoot()
    else finishBoot(enabled)
  }, [enabled, initialApp, runBoot, finishBoot])
  useEffect(
    () => () => {
      clearInterval(timer.current)
      clearTimeout(toastTimer.current)
    },
    [],
  )

  return (
    <div ref={rootRef} className="relative h-dvh w-full overflow-hidden bg-ink font-mono text-paper select-none">
      <Session
        key={session}
        size={size}
        enabled={enabled}
        ready={phase === 'desk'}
        initialApp={session === 0 ? initialApp : undefined}
        onActiveChange={onActiveChange}
        onReboot={reboot}
      />

      {/* Welcome toast */}
      <div
        role="status"
        className="absolute top-[46px] right-3.5 z-[902] flex w-[330px] gap-3 border border-amber bg-deep px-4 py-3.5 transition-[opacity,transform] duration-400"
        style={{ opacity: toast ? 1 : 0, transform: toast ? 'none' : 'translateY(-10px)', pointerEvents: toast ? 'auto' : 'none' }}
      >
        <span className="mt-1 size-2.5 flex-none bg-amber" />
        <div className="flex flex-col gap-1 text-xs leading-[1.5]">
          <span className="font-sans text-[15px] font-bold">Welcome, guest</span>
          <span className="text-muted">
            Open an app from the desktop or the dock, or open the terminal and type <span className="text-amber">help</span>. Drag across the desktop to select icons;
            right-click for more.
          </span>
        </div>
        <button type="button" aria-label="Dismiss" onClick={() => setToast(false)} className="cursor-pointer self-start border-0 bg-transparent text-sm text-paper">
          <X aria-hidden className={ic} />
        </button>
      </div>

      {/* Boot. Appears instantly (so a reboot hides the reset), fades out when done. */}
      <div
        data-boot
        aria-hidden={phase === 'desk'}
        className="absolute inset-0 z-[1000] bg-ink"
        style={{
          opacity: phase === 'desk' ? 0 : 1,
          pointerEvents: phase === 'desk' ? 'none' : 'auto',
          transition: phase === 'desk' ? 'opacity .6s' : 'none',
        }}
      >
        {phase === 'boot' && (
          <>
            <div className="absolute inset-0 flex flex-col justify-end overflow-hidden px-8 pt-[26px] pb-[60px] text-[13px] leading-[1.55]">
              {bootLog.slice(0, bootN).map((b, i) => (
                <div key={i} className="flex gap-2.5 whitespace-pre">
                  {b[0] === 'o' ? (
                    <>
                      <span className="text-amber">[  OK  ]</span>
                      <span>{b[1]}</span>
                    </>
                  ) : b[0] === 'l' ? (
                    <>
                      <span className="text-mist">[{b[1].padStart(12)}]</span>
                      <span>{b[2]}</span>
                    </>
                  ) : (
                    <span>{b[1]}</span>
                  )}
                </div>
              ))}
              <div className="text-amber" style={{ opacity: blink ? 1 : 0.2 }}>
                █
              </div>
            </div>
            <button
              type="button"
              onClick={() => finishBoot()}
              className="absolute right-6 bottom-5 cursor-pointer border border-teal bg-transparent px-3.5 py-2 font-mono text-[11px] font-medium text-muted hover:border-amber hover:text-amber"
            >
              skip boot <ChevronRight aria-hidden className={ic} />
            </button>
          </>
        )}
        {phase !== 'boot' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[26px]">
            <LogoBox />
            <Wordmark size={96} />
            <ProgressBar width={340} value={progress} />
            <div className="text-xs tracking-[0.12em] text-dim">DEVELOPER · PHOTOGRAPHER · LIVNO</div>
          </div>
        )}
      </div>
    </div>
  )
}

function Session({
  size,
  enabled,
  ready,
  initialApp,
  onActiveChange,
  onReboot,
}: {
  size: { W: number; H: number }
  enabled: boolean | null
  ready: boolean
  initialApp?: AppId
  onActiveChange: (app: AppId | null) => void
  onReboot: () => void
}) {
  const now = useNow()
  const clock = now === null ? null : formatClock(now)
  // The same battery as the phone: drains through the day, charges overnight.
  const power = now === null ? null : battery(now)
  const BatteryIcon = batteryIcon(power)
  const blink = blinkOn(now)
  const openCv = useCvPicker()

  // ---- windows
  const [wins, setWins] = useState<Record<WindowId, Win>>(() =>
    Object.fromEntries(windowIds.map((id) => [id, { open: false, min: false, max: false, snap: null, pos: null, z: 1 }])) as Record<
      WindowId,
      Win
    >,
  )
  const zRef = useRef(2)
  const [active, setActive] = useState<WindowId | null>(null)
  const [folder, setFolder] = useState<Folder>('projects')
  const [cvLang, setCvLang] = useState<CvLang>('EN')
  const [menu, setMenu] = useState(false)
  const [ctx, setCtx] = useState<MenuState>(null)
  const closeCtx = useCallback(() => setCtx(null), [])
  const openMenu = useCallback((e: ReactMouseEvent | { x: number; y: number }, items: MenuItem[]) => {
    const p = 'clientX' in e ? { x: e.clientX, y: e.clientY } : e
    setMenu(false)
    setCtx({ ...p, items })
  }, [])

  useEffect(() => {
    if (!enabled) return
    onActiveChange(active === 'files' ? folderApp[folder] : active)
  }, [active, folder, enabled, onActiveChange])

  const patch = (id: WindowId, p: Partial<Win>) => setWins((w) => ({ ...w, [id]: { ...w[id], ...p } }))
  const activeRef = useRef(active)
  activeRef.current = active
  const focusWin = useCallback((id: WindowId) => {
    if (activeRef.current === id) return
    zRef.current += 1
    const z = zRef.current
    setWins((w) => ({ ...w, [id]: { ...w[id], z } }))
    setActive(id)
  }, [])
  const openWin = useCallback((id: WindowId) => {
    zRef.current += 1
    const z = zRef.current
    setWins((w) => ({ ...w, [id]: { ...w[id], open: true, min: false, z } }))
    setActive(id)
    setMenu(false)
  }, [])
  const openApp = useCallback(
    (app: AppId) => {
      const f = appFolder[app]
      if (f) {
        setFolder(f)
        openWin('files')
      } else openWin(app === 'about' ? 'term' : (app as WindowId))
    },
    [openWin],
  )
  const closeWin = useCallback((id: WindowId) => {
    setWins((w) => ({ ...w, [id]: { ...w[id], open: false, max: false, snap: null } }))
    setActive((a) => (a === id ? null : a))
  }, [])
  const minWin = (id: WindowId) => {
    patch(id, { min: true })
    setActive(null)
  }
  // Full screen on and off glides between the two sizes.
  const [resizing, setResizing] = useState<WindowId | null>(null)
  const resizeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(resizeTimer.current), [])
  const glide = (id: WindowId) => {
    setResizing(id)
    clearTimeout(resizeTimer.current)
    resizeTimer.current = setTimeout(() => setResizing(null), 340)
  }
  const maxWin = (id: WindowId) => {
    glide(id)
    setWins((w) => ({ ...w, [id]: { ...w[id], max: !w[id].max && !w[id].snap, snap: null } }))
    focusWin(id)
  }
  const snapWin = (id: WindowId, zone: Zone) => {
    glide(id)
    setWins((w) => ({ ...w, [id]: { ...w[id], max: false, snap: zone } }))
    focusWin(id)
  }
  const [snapPreview, setSnapPreview] = useState<Zone | 'max' | null>(null)
  const isRunning = (app: AppId) => {
    const f = appFolder[app]
    if (f) return wins.files.open && folder === f
    return app !== 'about' && wins[app as WindowId].open
  }
  const dockClick = (app: AppId) => {
    const f = appFolder[app]
    const id: WindowId = f ? 'files' : (app as WindowId)
    const w = wins[id]
    if (!w.open || w.min || (f && folder !== f)) openApp(app)
    else if (active === id) minWin(id)
    else focusWin(id)
  }

  const geom = (id: WindowId, free = false) => {
    const { W, H } = size
    const d = DEF[id]
    if (!free && wins[id].max) return { x: 0, y: BAR, w: W, h: H - BAR }
    if (!free && wins[id].snap) return zoneRect(wins[id].snap, W, H)
    const kx = W / 1280
    const ky = H / 800
    const w = Math.min(d.w * clamp(kx, 0.8, 1.3), W - 24)
    const h = Math.min(d.h * clamp(ky, 0.8, 1.3), H - BAR - 12)
    const pos = wins[id].pos
    return {
      x: pos ? pos.x : clamp(d.x * kx, 0, W - w),
      y: pos ? pos.y : clamp(d.y * ky, BAR, H - h),
      w,
      h,
    }
  }

  const endDrag = useRef<(() => void) | null>(null)
  useEffect(() => () => endDrag.current?.(), [])
  const startDrag = (id: WindowId, e: ReactPointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    focusWin(id)
    const docked = wins[id].max || !!wins[id].snap
    const cur = geom(id)
    let g = cur
    const sx = e.clientX
    const sy = e.clientY
    let moved = false
    let zone: Zone | 'max' | null = null
    const move = (ev: PointerEvent) => {
      if (!moved) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return
        moved = true
        if (docked) {
          // Pulling a snapped or full-screen window off restores its normal size under the cursor.
          const free = geom(id, true)
          const fx = (sx - cur.x) / cur.w
          g = { ...free, x: sx - free.w * fx, y: BAR }
          setWins((w) => ({ ...w, [id]: { ...w[id], max: false, snap: null } }))
        }
      }
      const x = Math.round(clamp(g.x + ev.clientX - sx, 80 - g.w, size.W - 80))
      const y = Math.round(clamp(g.y + ev.clientY - sy, BAR, size.H - 60))
      patch(id, { pos: { x, y } })
      zone = dropZone(ev.clientX, ev.clientY, size.W, size.H)
      setSnapPreview(zone)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      endDrag.current = null
      setSnapPreview(null)
      if (zone === 'max') {
        glide(id)
        patch(id, { max: true, snap: null })
      } else if (zone) snapWin(id, zone)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    endDrag.current = up
  }

  const started = useRef(false)
  useEffect(() => {
    if (enabled === null || started.current) return
    started.current = true
    if (initialApp) openApp(initialApp)
  }, [enabled, initialApp, openApp])

  // ---- icons: click opens, drag moves, drag across the wallpaper selects several.
  const { cols, rows } = gridSize(size)
  const [cells, setCells] = useState<Record<string, Cell>>(defaultCells)
  useEffect(() => setCells(loadCells()), [])
  const placed = useMemo(() => layoutCells(cells, cols, rows), [cells, cols, rows])
  const [selected, setSelected] = useState<Set<AppId>>(() => new Set())
  const [iconDrag, setIconDrag] = useState<{ ids: AppId[]; dx: number; dy: number } | null>(null)
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)

  const resetIcons = useCallback(() => {
    saveCells(null)
    setCells(defaultCells())
    setSelected(new Set())
    toast.success('Icons back in place')
  }, [])

  const moveIcons = (ids: AppId[], dx: number, dy: number) => {
    const dc = Math.round(dx / CELL)
    const dr = Math.round(dy / CELL)
    if (!dc && !dr) return
    const next = { ...placed }
    const target = (id: AppId) => ({ c: clamp(placed[id].c + dc, 0, cols - 1), r: clamp(placed[id].r + dr, 0, rows - 1) })
    if (ids.length === 1) {
      // One icon swaps places with whatever it is dropped on.
      const to = target(ids[0])
      const other = launchers.find((o) => o !== ids[0] && placed[o].c === to.c && placed[o].r === to.r)
      if (other) next[other] = placed[ids[0]]
      next[ids[0]] = to
    } else {
      // A group keeps its shape; an icon whose spot is taken or off screen takes the nearest free cell.
      const taken = new Set(launchers.filter((o) => !ids.includes(o)).map((o) => cellKey(placed[o])))
      for (const id of ids) {
        const want = target(id)
        const at = taken.has(cellKey(want)) ? nearestFree(want, taken, cols, rows) : want
        taken.add(cellKey(at))
        next[id] = at
      }
      toast.success(`Moved ${ids.length} icons`)
    }
    setCells(next)
    saveCells(next)
  }

  const endIconDrag = useRef<(() => void) | null>(null)
  useEffect(() => () => endIconDrag.current?.(), [])
  const startIconDrag = (id: AppId, e: ReactPointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    setMenu(false)
    const toggle = e.shiftKey || e.ctrlKey || e.metaKey
    const group = selected.has(id) && !toggle ? launchers.filter((o) => selected.has(o)) : [id]
    const sx = e.clientX
    const sy = e.clientY
    let moved = false
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx
      const dy = ev.clientY - sy
      if (!moved && Math.hypot(dx, dy) < 5) return
      if (!moved && !selected.has(id)) setSelected(new Set([id]))
      moved = true
      setIconDrag({ ids: group, dx, dy })
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      endIconDrag.current = null
      setIconDrag(null)
      if (moved) return moveIcons(group, ev.clientX - sx, ev.clientY - sy)
      if (toggle)
        setSelected((cur) => {
          const next = new Set(cur)
          if (!next.delete(id)) next.add(id)
          return next
        })
      else {
        setSelected(new Set([id]))
        openApp(id)
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    endIconDrag.current = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }

  const startMarquee = (e: ReactPointerEvent) => {
    setMenu(false)
    if (e.button !== 0) return
    const additive = e.shiftKey || e.ctrlKey || e.metaKey
    const base = additive ? new Set(selected) : new Set<AppId>()
    setSelected(base)
    const x0 = e.clientX
    const y0 = e.clientY
    const move = (ev: PointerEvent) => {
      const [x1, y1] = [ev.clientX, ev.clientY]
      if (Math.hypot(x1 - x0, y1 - y0) < 4) return
      setMarquee({ x0, y0, x1, y1 })
      const [L, R, T, B] = [Math.min(x0, x1), Math.max(x0, x1), Math.min(y0, y1), Math.max(y0, y1)]
      const next = new Set(base)
      for (const id of launchers) {
        const x = GRID_X + placed[id].c * CELL
        const y = GRID_Y + placed[id].r * CELL
        if (x < R && x + CELL > L && y < B && y + CELL > T) next.add(id)
      }
      setSelected(next)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      endIconDrag.current = null
      setMarquee(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    endIconDrag.current = up
  }

  // Keys for selected icons when no window has focus: Escape, Ctrl+A, and Delete (which isn't allowed).
  useEffect(() => {
    if (!enabled) return
    const key = (e: KeyboardEvent) => {
      if (activeRef.current || isTyping(e.target) || document.querySelector('[role=menu]')) return
      if (e.key === 'Escape') setSelected(new Set())
      else if (e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setSelected(new Set(launchers))
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected.size) {
        e.preventDefault()
        toast.error(selected.size > 1 ? "Desktop icons can't be deleted" : `${apps[[...selected][0]].file} is a system icon and can't be deleted`)
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [enabled, selected])

  const closeTerm = useCallback(() => closeWin('term'), [closeWin])
  const term = useTerminal({ onOpen: openApp, onReboot, onExit: closeTerm })
  // The terminal takes the keyboard whenever it is the focused window.
  const termInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (enabled && ready && active === 'term') termInput.current?.focus({ preventScroll: true })
  }, [enabled, ready, active])

  const desktopMenu = (e: ReactMouseEvent) => {
    e.preventDefault()
    openMenu(e, [
      { label: 'Refresh  (reset icons)', icon: RefreshCw, onSelect: resetIcons },
      { label: '+ New note', disabled: true, hint: 'only in ~/notes', reason: 'New notes can only be made inside ~/notes' },
      { label: 'Select all', onSelect: () => setSelected(new Set(launchers)) },
      'sep',
      { label: 'Open terminal', onSelect: () => openWin('term') },
      { label: 'Open files', onSelect: () => openApp('work') },
      { label: 'Leave a note…', onSelect: () => openApp('notes') },
      { label: 'Download CV', icon: Download, onSelect: openCv },
      'sep',
      { label: 'Reboot', icon: Power, onSelect: onReboot, danger: true },
    ])
  }

  const win = (id: WindowId, title: string, children: ReactNode) => {
    const w = wins[id]
    const visible = w.open && !w.min
    return (
      <Window
        key={id}
        id={id}
        title={title}
        g={geom(id)}
        z={w.max ? w.z + 100 : w.z}
        visible={visible}
        resizing={resizing === id}
        focused={active === id}
        onFocus={() => focusWin(id)}
        onDrag={(e) => startDrag(id, e)}
        onMin={() => minWin(id)}
        onMax={() => maxWin(id)}
        onSnap={(z) => snapWin(id, z)}
        docked={w.max || !!w.snap}
        onClose={() => closeWin(id)}
      >
        {children}
      </Window>
    )
  }

  return (
    <>
      {/* Wallpaper */}
      <div onPointerDown={startMarquee} onContextMenu={desktopMenu} className="desk-grid absolute inset-0">
        <div aria-hidden className="absolute top-16 right-12 text-right text-[13px] leading-[1.7] font-medium text-amber">
          // developer + photographer
          <br />
          livno, bih ⇄ split, hr
        </div>
        <div aria-hidden className="outline-name absolute bottom-[12vh] left-[11.7vw] [-webkit-text-stroke-color:#476762]">
          PETAR
        </div>
        <div aria-hidden className="outline-name absolute bottom-[-7.5vh] left-[11.7vw] [-webkit-text-stroke-color:#df5e00]">
          POPOVIĆ
        </div>
        <HudCorners />
        <span aria-hidden className="absolute right-12 bottom-[30px] flex items-center gap-2 text-[11px] font-medium">
          <span className="size-2 rounded-full bg-signal" style={{ opacity: blink ? 1 : 0.2 }} />
          REC · LIVNO {clock?.hms ?? '--:--:--'}
        </span>
      </div>

      <h1 className="sr-only">
        {profile.name}: {profile.role.toLowerCase()}, {profile.locations}
      </h1>

      <nav aria-label="Desktop" className="pointer-events-none absolute inset-0 z-[1]">
        {launchers.map((id) => (
          <DesktopIcon
            key={id}
            id={id}
            at={placed[id]}
            selected={selected.has(id)}
            drag={iconDrag?.ids.includes(id) ? iconDrag : null}
            onPointerDown={(e) => startIconDrag(id, e)}
            onOpen={() => openApp(id)}
            onMenu={(e) => {
              const group = selected.has(id) ? launchers.filter((o) => selected.has(o)) : [id]
              if (!selected.has(id)) setSelected(new Set([id]))
              openMenu(e, [
                group.length > 1
                  ? { label: `Open ${group.length} apps`, onSelect: () => group.forEach(openApp) }
                  : { label: `Open ${apps[id].file}`, onSelect: () => openApp(id) },
                {
                  label: 'Delete',
                  disabled: true,
                  hint: 'system icon',
                  reason: group.length > 1 ? "Desktop icons can't be deleted" : `${apps[id].file} is a system icon and can't be deleted`,
                  danger: true,
                },
                'sep',
                { label: 'Refresh  (reset icons)', icon: RefreshCw, onSelect: resetIcons },
              ])
            }}
          />
        ))}
      </nav>
      {marquee && (
        <div
          aria-hidden
          className="marquee pointer-events-none absolute z-[2]"
          style={{
            left: Math.min(marquee.x0, marquee.x1),
            top: Math.min(marquee.y0, marquee.y1),
            width: Math.abs(marquee.x1 - marquee.x0),
            height: Math.abs(marquee.y1 - marquee.y0),
          }}
        />
      )}

      {win(
        'term',
        `guest@pop-os: ${term.cwd}`,
        <div ref={term.scrollRef} className="thin-scroll min-h-0 flex-1 overflow-auto px-4 py-3.5 text-[13px] leading-[1.6]">
          <TerminalBody term={term} inputRef={termInput} />
        </div>,
      )}
      {win('files', `Files — ~/${folder}`, <FilesWindow folder={folder} setFolder={setFolder} openWin={openWin} openMenu={openMenu} />)}
      {win(
        'cv',
        `petar-popovic-cv-${cvLang.toLowerCase()}.pdf`,
        <>
          <div className="flex h-[42px] flex-none items-center gap-3.5 border-b border-deep px-3 text-[11px] text-dim">
            <CvLangSwitch lang={cvLang} setLang={setCvLang} />
            <span>page 1 / 1</span>
            <button type="button" onClick={openCv} className="ml-auto cursor-pointer border-0 bg-amber px-3 py-[7px] font-mono text-[11px] font-bold text-ink hover:bg-signal">
              Download <Download aria-hidden className={ic} />
            </button>
          </div>
          <div className="thin-scroll min-h-0 flex-1 overflow-auto bg-deep p-[22px]">
            <CvDocument lang={cvLang} />
          </div>
        </>,
      )}
      {win('mail', 'Mail — new message', <MailApp />)}
      {win('spotify', 'Spotify', <SpotifyPlayer active={wins.spotify.open && !wins.spotify.min && ready} />)}

      {snapPreview && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-[850] border-2 border-amber bg-amber/10 backdrop-blur-[2px] transition-all duration-150"
          style={(() => {
            const r = snapPreview === 'max' ? { x: 0, y: BAR, w: size.W, h: size.H - BAR } : zoneRect(snapPreview, size.W, size.H)
            return { left: r.x + 6, top: r.y + 6, width: r.w - 12, height: r.h - 12 }
          })()}
        />
      )}

      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-[900] flex h-[34px] items-center gap-4 border-b border-deep bg-ink/92 pr-3.5 pl-1.5 text-xs font-medium">
        <button
          type="button"
          aria-expanded={menu}
          aria-haspopup="menu"
          onClick={() => setMenu((m) => !m)}
          className={`flex h-[26px] cursor-pointer items-center gap-2 border-0 px-2.5 font-mono text-xs font-bold ${menu ? 'bg-amber text-ink' : 'bg-transparent text-paper hover:bg-deep'}`}
        >
          ◆ pop-os
        </button>
        <span className="text-muted">{active ? WINDOW_NAME[active] : 'Desktop'}</span>
        <span className="ml-auto text-muted">EN</span>
        <span className="text-muted">
          <Wifi aria-hidden className={ic} /> wifi
        </span>
        <span className="text-muted">
          <BatteryIcon aria-hidden className={ic} /> {power ? `${power.pct}%` : ''}
        </span>
        <span className="whitespace-pre">{clock ? `${clock.day}  ${clock.hm}` : ''}</span>
      </header>

      {menu && (
        <div
          role="menu"
          onKeyDown={(e) => e.key === 'Escape' && setMenu(false)}
          className="absolute top-[38px] left-1.5 z-[901] flex w-[270px] flex-col border border-teal bg-ink p-1.5 text-xs shadow-[0_20px_50px_rgba(0,0,0,.6)]"
        >
          <div className="mb-1.5 flex flex-col gap-1 border-b border-deep px-2.5 pt-2.5 pb-3">
            <span className="font-sans text-xl font-extrabold">{profile.name}</span>
            <span className="text-dim">guest session · PopOS 26.10</span>
          </div>
          {launchers.map((id) => (
            <button
              key={id}
              role="menuitem"
              type="button"
              onClick={() => openApp(id)}
              className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent px-2.5 py-2 text-left font-mono text-xs text-paper hover:bg-deep"
            >
              <AppGlyph id={id} size={22} font={10} />
              {apps[id].label}
            </button>
          ))}
          <div className="my-1.5 h-px bg-deep" />
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setMenu(false)
              openCv()
            }}
            className="cursor-pointer border-0 bg-transparent px-2.5 py-2 text-left font-mono text-xs text-paper hover:bg-deep hover:text-amber"
          >
            Download CV <Download aria-hidden className={ic} />
          </button>
          <a role="menuitem" href={profile.github} target="_blank" rel="noreferrer" className="px-2.5 py-2 text-paper no-underline hover:bg-deep hover:text-amber">
            GitHub <ArrowUpRight aria-hidden className={ic} />
          </a>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setMenu(false)
              onReboot()
            }}
            className="cursor-pointer border-0 bg-transparent px-2.5 py-2 text-left font-mono text-xs text-signal hover:bg-deep"
          >
            <Power aria-hidden className={ic} /> Reboot
          </button>
        </div>
      )}

      {/* Dock */}
      <nav aria-label="Dock" className="absolute bottom-3.5 left-1/2 z-[900] flex -translate-x-1/2 gap-2 border border-teal bg-ink/88 p-2 backdrop-blur-[10px]">
        {launchers.map((id) => (
          <button
            key={id}
            type="button"
            title={apps[id].label}
            aria-label={apps[id].label}
            onClick={() => dockClick(id)}
            className="relative flex size-12 cursor-pointer items-center justify-center border-0 font-mono text-[15px] font-bold transition-transform duration-150 hover:-translate-y-1.5"
            style={{ background: apps[id].bg, color: apps[id].fg }}
          >
            {apps[id].glyph}
            <span className="absolute -bottom-1.5 left-1/2 -ml-[7px] h-0.5 w-3.5 bg-amber" style={{ opacity: isRunning(id) ? 1 : 0 }} />
          </button>
        ))}
      </nav>

      <ContextMenu menu={ctx} onClose={closeCtx} />
    </>
  )
}

// A desktop icon on the grid. The session handles clicks, drags and selection.
function DesktopIcon({
  id,
  at,
  selected,
  drag,
  onPointerDown,
  onOpen,
  onMenu,
}: {
  id: AppId
  at: Cell
  selected: boolean
  drag: { dx: number; dy: number } | null
  onPointerDown: (e: ReactPointerEvent) => void
  onOpen: () => void
  onMenu: (e: ReactMouseEvent) => void
}) {
  return (
    <a
      href={`/${apps[id].slug}`}
      aria-current={selected || undefined}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        e.preventDefault()
        // Keyboard activation (Enter) arrives as a click without a pointer.
        if (e.detail === 0) onOpen()
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onMenu(e)
      }}
      draggable={false}
      className={`pointer-events-auto absolute flex size-20 touch-none flex-col items-center justify-center gap-1.5 border text-paper no-underline ${
        drag ? 'z-10 cursor-grabbing border-amber bg-deep/70 opacity-90' : selected ? 'border-amber bg-amber/15' : 'border-transparent hover:border-teal hover:bg-deep/60'
      }`}
      style={{ left: GRID_X + at.c * CELL, top: GRID_Y + at.r * CELL, transform: drag ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined }}
    >
      <AppGlyph id={id} size={44} font={15} />
      <span className={`px-1 py-px text-[11px] font-medium ${selected ? 'bg-amber text-ink' : 'bg-ink'}`}>{apps[id].file}</span>
    </a>
  )
}

export function AppGlyph({ id, size, font }: { id: AppId; size: number; font: number }) {
  const a = apps[id]
  return (
    <span
      aria-hidden
      className="flex flex-none items-center justify-center font-mono font-bold"
      style={{ width: size, height: size, background: a.bg, color: a.fg, fontSize: font }}
    >
      {a.glyph}
    </span>
  )
}

function Window({
  id,
  title,
  g,
  z,
  visible,
  resizing,
  focused,
  onFocus,
  onDrag,
  onMin,
  onMax,
  onSnap,
  docked,
  onClose,
  children,
}: {
  id: WindowId
  title: string
  g: { x: number; y: number; w: number; h: number }
  z: number
  visible: boolean
  resizing: boolean
  focused: boolean
  onFocus: () => void
  onDrag: (e: ReactPointerEvent) => void
  onMin: () => void
  onMax: () => void
  onSnap: (z: Zone) => void
  docked: boolean
  onClose: () => void
  children: ReactNode
}) {
  // Hovering the maximise button opens the Snap Layouts flyout, as in Windows 11.
  const maxRef = useRef<HTMLButtonElement>(null)
  const [flyout, setFlyout] = useState<{ x: number; y: number } | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(hoverTimer.current), [])
  const showFlyout = (delay: number) => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => {
      const r = maxRef.current?.getBoundingClientRect()
      if (r) setFlyout({ x: Math.min(r.right - 228, window.innerWidth - 240), y: r.bottom + 6 })
    }, delay)
  }
  const hideFlyout = () => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setFlyout(null), 220)
  }
  const border = focused ? '#efab30' : '#476762'
  const btn = 'h-6 w-[26px] cursor-pointer border border-teal bg-transparent font-mono text-xs font-medium text-paper'
  return (
    <section
      id={`window-${WINDOW_SLUG[id]}`}
      role="dialog"
      aria-label={WINDOW_NAME[id]}
      inert={!visible}
      onPointerDown={onFocus}
      onFocus={onFocus}
      className="absolute flex flex-col overflow-hidden border bg-ink shadow-[0_24px_60px_rgba(0,0,0,.55)] transition-[opacity,transform] duration-[220ms]"
      style={{
        left: g.x,
        top: g.y,
        width: g.w,
        height: g.h,
        zIndex: z,
        borderColor: border,
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'scale(.94) translateY(18px)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: resizing
          ? ['left', 'top', 'width', 'height'].map((p) => `${p} .32s cubic-bezier(.2,.8,.2,1)`).join(', ') + ', opacity .22s, transform .22s'
          : undefined,
      }}
    >
      <div
        onPointerDown={onDrag}
        onDoubleClick={onMax}
        className="flex h-[34px] flex-none cursor-grab items-center gap-2.5 bg-deep pr-[5px] pl-3 text-xs font-medium select-none active:cursor-grabbing"
      >
        <span className="size-2" style={{ background: border }} />
        <h2 className="m-0 flex-1 overflow-hidden text-xs font-medium whitespace-nowrap">{title}</h2>
        <button type="button" aria-label="Minimise" onClick={(e) => (e.stopPropagation(), onMin())} className={`${btn} hover:bg-teal`}>
          <Minus aria-hidden className={ic} />
        </button>
        <button
          ref={maxRef}
          type="button"
          aria-label={docked ? 'Restore' : 'Maximise'}
          aria-haspopup="menu"
          aria-expanded={!!flyout}
          onClick={(e) => (e.stopPropagation(), setFlyout(null), clearTimeout(hoverTimer.current), onMax())}
          onPointerEnter={() => showFlyout(380)}
          onPointerLeave={hideFlyout}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              showFlyout(0)
            }
          }}
          className={`${btn} hover:bg-teal`}
        >
          {docked ? <Copy aria-hidden className={ic} /> : <Square aria-hidden className={ic} />}
        </button>
        <button type="button" aria-label="Close" onClick={(e) => (e.stopPropagation(), onClose())} className={`${btn} hover:border-signal hover:bg-signal hover:text-ink`}>
          <X aria-hidden className={ic} />
        </button>
      </div>
      {children}
      {flyout && visible && (
        <div
          role="menu"
          aria-label="Snap layouts"
          onPointerEnter={() => clearTimeout(hoverTimer.current)}
          onPointerLeave={hideFlyout}
          onKeyDown={(e) => e.key === 'Escape' && setFlyout(null)}
          className="fixed z-[2000] grid w-[228px] grid-cols-2 gap-2 border border-teal bg-ink p-2.5 shadow-[0_18px_40px_rgba(0,0,0,.6)]"
          style={{ left: flyout.x, top: flyout.y }}
        >
          {LAYOUTS.map((layout, i) => (
            <div key={i} className="relative h-[58px] border border-deep bg-deep/40">
              {layout.map((z) => {
                const r = ZONES[z]
                return (
                  <button
                    key={z}
                    type="button"
                    role="menuitem"
                    aria-label={`Snap to ${r.label}`}
                    title={r.label}
                    onClick={(e) => {
                      e.stopPropagation()
                      setFlyout(null)
                      onSnap(z)
                    }}
                    className="absolute cursor-pointer border border-teal bg-teal/30 p-0 hover:border-amber hover:bg-amber focus-visible:border-amber focus-visible:bg-amber"
                    style={{ left: `calc(${r.x * 100}% + 2px)`, top: `calc(${r.y * 100}% + 2px)`, width: `calc(${r.w * 100}% - 4px)`, height: `calc(${r.h * 100}% - 4px)` }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function MailApp() {
  const mail = useMailto()
  if (mail.sent) return <MailSent onReset={mail.reset} big={44} />
  const row = 'flex gap-2.5 border-b border-deep px-3.5 py-2.5'
  const input = 'flex-1 border-0 bg-transparent font-mono text-xs text-paper caret-amber outline-none focus-visible:outline-none'
  return (
    <form
      className="flex flex-1 flex-col text-xs select-text"
      onSubmit={(e) => {
        e.preventDefault()
        mail.send(e.currentTarget)
      }}
    >
      <div className={row}>
        <span className="w-[60px] text-dim">To</span>
        <span className="text-amber">{profile.email}</span>
      </div>
      <label className={row}>
        <span className="w-[60px] text-dim">From</span>
        <input name="from" type="email" placeholder="you@email.com" className={input} />
      </label>
      <label className={row}>
        <span className="w-[60px] text-dim">Subject</span>
        <input name="subject" placeholder="Project, job or photo shoot" className={input} />
      </label>
      <textarea
        name="message"
        aria-label="Message"
        required
        placeholder="Hi Petar, …"
        className="flex-1 resize-none border-0 bg-transparent p-3.5 font-sans text-sm leading-[1.5] text-paper caret-amber outline-none"
      />
      <div className="flex items-center gap-2.5 border-t border-deep px-3.5 py-2.5">
        <span className="text-dim">replies within a day or two</span>
        <button type="submit" className="ml-auto cursor-pointer border-0 bg-amber px-[18px] py-[9px] font-mono text-xs font-bold text-ink hover:bg-signal">
          Send <CornerDownLeft aria-hidden className={ic} />
        </button>
      </div>
    </form>
  )
}
