import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { bootLog, profile } from '#/data/portfolio'
import { appFolder, apps, folderApp, formatClock, windowIds } from '#/lib/os'
import type { AppId, Folder, WindowId } from '#/lib/os'
import { blinkOn, markBooted, shouldSkipBoot, useNow, useTerminal } from '#/lib/hooks'
import { useCvPicker } from './CvPicker'
import { ContextMenu } from './ContextMenu'
import type { MenuItem, MenuState } from './ContextMenu'
import { FilesWindow } from './Files'
import { CvPaper, HudCorners, LogoBox, MailSent, ProgressBar, Wordmark, useMailto } from './shared'
import { TerminalBody } from './Terminal'

const BAR = 34
// Default geometry on the design's 1280×800 desktop; scaled to the real viewport.
const DEF: Record<WindowId, { x: number; y: number; w: number; h: number }> = {
  term: { x: 600, y: 300, w: 620, h: 410 },
  files: { x: 130, y: 62, w: 920, h: 560 },
  cv: { x: 340, y: 48, w: 620, h: 700 },
  mail: { x: 420, y: 130, w: 540, h: 460 },
}
const WINDOW_NAME: Record<WindowId, string> = { term: 'Terminal', files: 'Files', cv: 'Document Viewer', mail: 'Mail' }
const WINDOW_SLUG: Record<WindowId, string> = { term: 'terminal', files: 'files', cv: 'cv', mail: 'mail' }

// Desktop icons, dock and app menu, in this order.
const launchers: AppId[] = ['term', 'work', 'photos', 'notes', 'cv', 'mail']

type Win = { open: boolean; min: boolean; max: boolean; pos: { x: number; y: number } | null; z: number }
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// ---- desktop icon positions: snapped to the 80px wallpaper grid, kept in localStorage until a reboot or refresh.

const CELL = 80
const ICONS_KEY = 'popos-icons'
type Cell = { c: number; r: number }
const defaultCells = (): Record<string, Cell> => Object.fromEntries(launchers.map((id, i) => [id, { c: 0, r: i + 1 }]))
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
            Type <span className="text-amber">help</span> in the terminal, open an app from the dock, or right-click the desktop. Icons and windows drag.
          </span>
        </div>
        <button type="button" aria-label="Dismiss" onClick={() => setToast(false)} className="cursor-pointer self-start border-0 bg-transparent text-sm text-paper">
          ×
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
              skip boot ›
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
  const blink = blinkOn(now)
  const openCv = useCvPicker()

  // ---- windows
  const [wins, setWins] = useState<Record<WindowId, Win>>(() =>
    Object.fromEntries(windowIds.map((id) => [id, { open: id === 'term', min: false, max: false, pos: null, z: id === 'term' ? 2 : 1 }])) as Record<
      WindowId,
      Win
    >,
  )
  const zRef = useRef(2)
  const [active, setActive] = useState<WindowId | null>('term')
  const [folder, setFolder] = useState<Folder>('projects')
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
    setWins((w) => ({ ...w, [id]: { ...w[id], open: false, max: false } }))
    setActive((a) => (a === id ? null : a))
  }, [])
  const minWin = (id: WindowId) => {
    patch(id, { min: true })
    setActive(null)
  }
  const maxWin = (id: WindowId) => {
    setWins((w) => ({ ...w, [id]: { ...w[id], max: !w[id].max } }))
    focusWin(id)
  }
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

  const geom = (id: WindowId) => {
    const { W, H } = size
    const d = DEF[id]
    if (wins[id].max) return { x: 0, y: BAR, w: W, h: H - BAR }
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
    if (wins[id].max) return
    e.preventDefault()
    focusWin(id)
    const g = geom(id)
    const sx = e.clientX
    const sy = e.clientY
    const move = (ev: PointerEvent) => {
      const x = Math.round(clamp(g.x + ev.clientX - sx, 80 - g.w, size.W - 80))
      const y = Math.round(clamp(g.y + ev.clientY - sy, BAR, size.H - 60))
      patch(id, { pos: { x, y } })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      endDrag.current = null
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

  // ---- icons
  const [cells, setCells] = useState<Record<string, Cell>>(defaultCells)
  useEffect(() => setCells(loadCells()), [])
  const resetIcons = useCallback(() => {
    saveCells(null)
    setCells(defaultCells())
  }, [])
  const moveIcon = (id: AppId, to: Cell) => {
    setCells((cur) => {
      const next = { ...cur }
      const other = launchers.find((o) => o !== id && cur[o].c === to.c && cur[o].r === to.r)
      if (other) next[other] = cur[id]
      next[id] = to
      saveCells(next)
      return next
    })
  }

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
      { label: '⟳ Refresh  (reset icons)', onSelect: resetIcons },
      { label: '+ New note', disabled: true, hint: 'only in ~/notes' },
      'sep',
      { label: 'Open terminal', onSelect: () => openWin('term') },
      { label: 'Open files', onSelect: () => openApp('work') },
      { label: 'Leave a note…', onSelect: () => openApp('notes') },
      { label: 'Download CV ↓', onSelect: openCv },
      'sep',
      { label: '⟳ Reboot', onSelect: onReboot, danger: true },
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
        focused={active === id}
        onFocus={() => focusWin(id)}
        onDrag={(e) => startDrag(id, e)}
        onMin={() => minWin(id)}
        onMax={() => maxWin(id)}
        onClose={() => closeWin(id)}
      >
        {children}
      </Window>
    )
  }

  return (
    <>
      {/* Wallpaper */}
      <div onPointerDown={() => menu && setMenu(false)} onContextMenu={desktopMenu} className="desk-grid absolute inset-0">
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
            cell={cells[id]}
            size={size}
            onOpen={() => openApp(id)}
            onMove={(to) => moveIcon(id, to)}
            onMenu={(e) =>
              openMenu(e, [
                { label: `Open ${apps[id].file}`, onSelect: () => openApp(id) },
                'sep',
                { label: '⟳ Refresh  (reset icons)', onSelect: resetIcons },
              ])
            }
          />
        ))}
      </nav>

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
        'PetarPopovic_CV.pdf',
        <>
          <div className="flex h-[42px] flex-none items-center gap-3.5 border-b border-deep px-3 text-[11px] text-dim">
            <span>page 1 / 1</span>
            <span>100%</span>
            <button type="button" onClick={openCv} className="ml-auto cursor-pointer border-0 bg-amber px-3 py-[7px] font-mono text-[11px] font-bold text-ink hover:bg-signal">
              Download ↓
            </button>
          </div>
          <div className="thin-scroll min-h-0 flex-1 overflow-auto bg-deep p-[22px]">
            <CvPaper />
          </div>
        </>,
      )}
      {win('mail', 'Mail — new message', <MailApp />)}

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
        <span className="text-muted">▂▄▆ wifi</span>
        <span className="text-muted">BAT 87%</span>
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
            Download CV ↓
          </button>
          <a role="menuitem" href={profile.github} target="_blank" rel="noreferrer" className="px-2.5 py-2 text-paper no-underline hover:bg-deep hover:text-amber">
            GitHub ↗
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
            ⟳ Reboot
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

// A desktop icon: click opens, drag moves it to another grid cell.
function DesktopIcon({
  id,
  cell,
  size,
  onOpen,
  onMove,
  onMenu,
}: {
  id: AppId
  cell: Cell
  size: { W: number; H: number }
  onOpen: () => void
  onMove: (to: Cell) => void
  onMenu: (e: ReactMouseEvent) => void
}) {
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null)
  const moved = useRef(false)
  const maxC = Math.max(0, Math.floor(size.W / CELL) - 1)
  const maxR = Math.max(1, Math.floor((size.H - 90) / CELL) - 1)
  const c = clamp(cell.c, 0, maxC)
  const r = clamp(cell.r, 1, maxR)

  const onPointerDown = (e: ReactPointerEvent<HTMLAnchorElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    const sx = e.clientX
    const sy = e.clientY
    moved.current = false
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx
      const dy = ev.clientY - sy
      if (!moved.current && Math.hypot(dx, dy) < 5) return
      moved.current = true
      setDrag({ dx, dy })
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setDrag(null)
      if (!moved.current) return onOpen()
      const nc = clamp(Math.round((c * CELL + ev.clientX - sx) / CELL), 0, maxC)
      const nr = clamp(Math.round((r * CELL + ev.clientY - sy) / CELL), 1, maxR)
      if (nc !== c || nr !== r) onMove({ c: nc, r: nr })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <a
      href={`/?app=${apps[id].slug}`}
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
      className={`pointer-events-auto absolute flex size-20 touch-none flex-col items-center justify-center gap-1.5 border text-paper no-underline ${drag ? 'z-10 cursor-grabbing border-amber bg-deep/70 opacity-90' : 'border-transparent hover:border-teal hover:bg-deep/60'}`}
      style={{ left: c * CELL, top: r * CELL, transform: drag ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined }}
    >
      <AppGlyph id={id} size={44} font={15} />
      <span className="bg-ink px-1 py-px text-[11px] font-medium">{apps[id].file}</span>
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
  focused,
  onFocus,
  onDrag,
  onMin,
  onMax,
  onClose,
  children,
}: {
  id: WindowId
  title: string
  g: { x: number; y: number; w: number; h: number }
  z: number
  visible: boolean
  focused: boolean
  onFocus: () => void
  onDrag: (e: ReactPointerEvent) => void
  onMin: () => void
  onMax: () => void
  onClose: () => void
  children: ReactNode
}) {
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
          –
        </button>
        <button type="button" aria-label="Maximise" onClick={(e) => (e.stopPropagation(), onMax())} className={`${btn} hover:bg-teal`}>
          □
        </button>
        <button type="button" aria-label="Close" onClick={(e) => (e.stopPropagation(), onClose())} className={`${btn} hover:border-signal hover:bg-signal hover:text-ink`}>
          ×
        </button>
      </div>
      {children}
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
          Send ⏎
        </button>
      </div>
    </form>
  )
}
