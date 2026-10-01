import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { bootLog, photoCategories, photoCode, photos, profile, projects, toneColor } from '#/data/portfolio'
import type { PhotoCategory } from '#/data/portfolio'
import { apps, formatClock, windowIds } from '#/lib/os'
import type { AppId, WindowId } from '#/lib/os'
import { blinkOn, markBooted, shouldSkipBoot, useNow, useTerminal } from '#/lib/hooks'
import { useCvPicker } from './CvPicker'
import { CvPaper, HudCorners, LogoBox, MailSent, ProgressBar, Shot, TerminalBody, Wordmark, useMailto } from './shared'

const BAR = 34
// Default geometry on the design's 1280×800 desktop; scaled to the real viewport.
const DEF: Record<WindowId, { x: number; y: number; w: number; h: number }> = {
  term: { x: 600, y: 300, w: 620, h: 410 },
  work: { x: 130, y: 62, w: 900, h: 540 },
  photos: { x: 170, y: 80, w: 860, h: 570 },
  cv: { x: 340, y: 48, w: 620, h: 700 },
  mail: { x: 420, y: 130, w: 540, h: 460 },
}
const TITLES: Record<WindowId, string> = {
  term: 'guest@pop-os: ~',
  work: 'Files — ~/projects',
  photos: 'Photos — ~/photos',
  cv: 'PetarPopovic_CV.pdf',
  mail: 'Mail — new message',
}

type Win = { open: boolean; min: boolean; max: boolean; pos: { x: number; y: number } | null; z: number }
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

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
  const clock = now === null ? null : formatClock(now)
  const blink = blinkOn(now)
  const openCv = useCvPicker()

  // ---- viewport size
  const rootRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ W: 1280, H: 800 })
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ W: el.clientWidth || 1280, H: el.clientHeight || 800 }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ---- windows
  const [wins, setWins] = useState<Record<WindowId, Win>>(() =>
    Object.fromEntries(windowIds.map((id) => [id, { open: id === 'term', min: false, max: false, pos: null, z: id === 'term' ? 2 : 1 }])) as Record<
      WindowId,
      Win
    >,
  )
  const zRef = useRef(2)
  const [active, setActive] = useState<WindowId | null>('term')
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    if (enabled) onActiveChange(active)
  }, [active, enabled, onActiveChange])

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
  const openApp = useCallback((app: AppId) => openWin(app === 'about' ? 'term' : app), [openWin])
  const closeWin = (id: WindowId) => {
    patch(id, { open: false, max: false })
    setActive((a) => (a === id ? null : a))
  }
  const minWin = (id: WindowId) => {
    patch(id, { min: true })
    setActive(null)
  }
  const maxWin = (id: WindowId) => {
    setWins((w) => ({ ...w, [id]: { ...w[id], max: !w[id].max } }))
    focusWin(id)
  }
  const dockClick = (id: WindowId) => {
    const w = wins[id]
    if (!w.open || w.min) openWin(id)
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

  // ---- boot: log → splash → desktop
  const [phase, setPhase] = useState<'boot' | 'splash' | 'desk'>('boot')
  const [bootN, setBootN] = useState(0)
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState(false)
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

  const boot = useCallback(() => {
    clearInterval(timer.current)
    setPhase('boot')
    setBootN(0)
    setProgress(0)
    setToast(false)
    setMenu(false)
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

  const started = useRef(false)
  useEffect(() => {
    if (enabled === null || started.current) return
    started.current = true
    if (initialApp) openApp(initialApp)
    if (enabled && !initialApp && !shouldSkipBoot()) boot()
    else finishBoot(enabled)
  }, [enabled, initialApp, openApp, boot, finishBoot])
  useEffect(
    () => () => {
      clearInterval(timer.current)
      clearTimeout(toastTimer.current)
    },
    [],
  )

  const term = useTerminal({ onOpen: openApp, onReboot: boot })

  const win = (id: WindowId, children: ReactNode) => {
    const w = wins[id]
    const g = geom(id)
    const visible = w.open && !w.min
    return (
      <Window
        key={id}
        id={id}
        title={TITLES[id]}
        g={g}
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

  const icons = windowIds.map((id) => ({ id, ...apps[id] }))

  return (
    <div ref={rootRef} className="relative h-dvh w-full overflow-hidden bg-ink font-mono text-paper select-none">
      {/* Wallpaper */}
      <div onPointerDown={() => menu && setMenu(false)} className="desk-grid absolute inset-0" aria-hidden>
        <div className="absolute top-16 right-12 text-right text-[13px] leading-[1.7] font-medium text-amber">
          // developer + photographer
          <br />
          livno, bih ⇄ split, hr
        </div>
        <div className="outline-name absolute bottom-[12vh] left-[11.7vw] [-webkit-text-stroke-color:#476762]">PETAR</div>
        <div className="outline-name absolute bottom-[-7.5vh] left-[11.7vw] [-webkit-text-stroke-color:#df5e00]">POPOVIĆ</div>
        <HudCorners />
        <span className="absolute right-12 bottom-[30px] flex items-center gap-2 text-[11px] font-medium">
          <span className="size-2 rounded-full bg-signal" style={{ opacity: blink ? 1 : 0.2 }} />
          REC · LIVNO {clock?.hms ?? '--:--:--'}
        </span>
      </div>

      <h1 className="sr-only">
        {profile.name}: {profile.role.toLowerCase()}, {profile.locations}
      </h1>

      {/* Desktop icons */}
      <nav aria-label="Desktop" className="absolute top-[62px] left-6 z-[1] flex flex-col gap-3.5">
        {icons.map((d) => (
          <a
            key={d.id}
            href={`/?app=${d.slug}`}
            onClick={(e) => {
              e.preventDefault()
              openWin(d.id)
            }}
            className="flex w-[84px] flex-col items-center gap-1.5 border border-transparent py-1.5 text-paper no-underline hover:border-teal hover:bg-deep/60"
          >
            <AppGlyph id={d.id} size={48} font={16} />
            <span className="bg-ink px-1 py-px text-[11px] font-medium">{d.file}</span>
          </a>
        ))}
      </nav>

      {win(
        'term',
        <div ref={term.scrollRef} className="thin-scroll min-h-0 flex-1 overflow-auto px-4 py-3.5 text-[13px] leading-[1.6]">
          <TerminalBody term={term} />
        </div>,
      )}
      {win('work', <FilesApp openWin={openWin} />)}
      {win('photos', <PhotosApp openWin={openWin} />)}
      {win(
        'cv',
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
      {win('mail', <MailApp />)}

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
        <span className="text-muted">{active ? apps[active].window : 'Desktop'}</span>
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
          {icons.map((d) => (
            <button
              key={d.id}
              role="menuitem"
              type="button"
              onClick={() => openWin(d.id)}
              className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent px-2.5 py-2 text-left font-mono text-xs text-paper hover:bg-deep"
            >
              <AppGlyph id={d.id} size={22} font={10} />
              {d.label}
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
            onClick={() => boot()}
            className="cursor-pointer border-0 bg-transparent px-2.5 py-2 text-left font-mono text-xs text-signal hover:bg-deep"
          >
            ⟳ Reboot
          </button>
        </div>
      )}

      {/* Dock */}
      <nav aria-label="Dock" className="absolute bottom-3.5 left-1/2 z-[900] flex -translate-x-1/2 gap-2 border border-teal bg-ink/88 p-2 backdrop-blur-[10px]">
        {icons.map((d) => (
          <button
            key={d.id}
            type="button"
            title={d.label}
            aria-label={d.label}
            onClick={() => dockClick(d.id)}
            className="relative flex size-12 cursor-pointer items-center justify-center border-0 font-mono text-[15px] font-bold transition-transform duration-150 hover:-translate-y-1.5"
            style={{ background: d.bg, color: d.fg }}
          >
            {d.glyph}
            <span className="absolute -bottom-1.5 left-1/2 -ml-[7px] h-0.5 w-3.5 bg-amber" style={{ opacity: wins[d.id].open ? 1 : 0 }} />
          </button>
        ))}
      </nav>

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
            Type <span className="text-amber">help</span> in the terminal, or open an app from the dock. Windows drag by their title bar.
          </span>
        </div>
        <button type="button" aria-label="Dismiss" onClick={() => setToast(false)} className="cursor-pointer self-start border-0 bg-transparent text-sm text-paper">
          ×
        </button>
      </div>

      {/* Boot */}
      <div
        data-boot
        aria-hidden={phase === 'desk'}
        className="absolute inset-0 z-[1000] bg-ink transition-opacity duration-600"
        style={{ opacity: phase === 'desk' ? 0 : 1, pointerEvents: phase === 'desk' ? 'none' : 'auto' }}
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
      id={`window-${apps[id].slug}`}
      role="dialog"
      aria-label={apps[id].window}
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
        <button
          type="button"
          aria-label="Close"
          onClick={(e) => (e.stopPropagation(), onClose())}
          className={`${btn} hover:border-signal hover:bg-signal hover:text-ink`}
        >
          ×
        </button>
      </div>
      {children}
    </section>
  )
}

function Places({ current, count, openWin }: { current: 'work' | 'photos'; count: number; openWin: (id: WindowId) => void }) {
  const openCv = useCvPicker()
  const item = 'cursor-pointer border-0 bg-transparent p-2 text-left font-mono text-xs whitespace-pre text-paper no-underline hover:bg-deep'
  const here = 'bg-deep p-2 whitespace-pre text-amber'
  return (
    <nav aria-label="Places" className="flex flex-col gap-0.5 border-r border-deep px-2.5 py-3.5 text-xs">
      <div className="px-2 pb-2 text-[10px] tracking-[0.1em] text-dim">PLACES</div>
      {current === 'work' ? (
        <div className={here}>▸ ~/projects</div>
      ) : (
        <button type="button" className={item} onClick={() => openWin('work')}>
          {'  ~/projects'}
        </button>
      )}
      {current === 'photos' ? (
        <div className={here}>▸ ~/photos</div>
      ) : (
        <button type="button" className={item} onClick={() => openWin('photos')}>
          {'  ~/photos'}
        </button>
      )}
      <button type="button" className={item} onClick={() => openWin('cv')}>
        {'  ~/docs/cv.pdf'}
      </button>
      <button type="button" className={item} onClick={openCv}>
        {'  download cv ↓'}
      </button>
      <a href={profile.github} target="_blank" rel="noreferrer" className={item}>
        {'  github ↗'}
      </a>
      <div className="mt-auto p-2 text-[11px] text-dim">{count} items</div>
    </nav>
  )
}

function FilesApp({ openWin }: { openWin: (id: WindowId) => void }) {
  const [sel, setSel] = useState(0)
  const p = projects[sel]
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[180px_minmax(0,1fr)_270px]">
      <Places current="work" count={projects.length} openWin={openWin} />
      <div className="thin-scroll flex flex-col gap-3 overflow-auto p-3.5">
        <div className="flex justify-between text-[11px] text-dim">
          <span>~/projects</span>
          <span>click a folder to preview</span>
        </div>
        <ul className="m-0 grid list-none grid-cols-3 gap-2.5 p-0">
          {projects.map((pr, i) => (
            <li key={pr.slug}>
              <button
                type="button"
                aria-pressed={i === sel}
                onClick={() => setSel(i)}
                className="flex h-full w-full cursor-pointer flex-col gap-2 border bg-ink p-2 text-left text-paper hover:bg-deep"
                style={{ borderColor: i === sel ? '#efab30' : '#1c3132' }}
              >
                <Shot
                  src={pr.image}
                  tone={toneColor[pr.tone]}
                  alt={`${pr.name} screenshot`}
                  label={`${pr.slug}/`}
                  className="h-24 w-full p-1.5"
                  labelClassName="text-[10px] font-medium text-muted truncate"
                />
                <h3 className="m-0 font-sans text-[15px] font-bold">{pr.name}</h3>
                <span className="text-[10px] font-medium text-amber uppercase">{pr.stack}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <aside aria-live="polite" className="thin-scroll flex flex-col gap-3 overflow-auto border-l border-deep p-3.5">
        <Shot src={p.image} tone={toneColor[p.tone]} alt={`${p.name} screenshot`} label={`screenshot · ${p.slug}`} className="h-40 w-full flex-none p-2" />
        <div className="font-sans text-2xl leading-[1.05] font-extrabold tracking-[-0.02em]">{p.name}</div>
        <div className="text-[11px] text-amber uppercase">{p.stack}</div>
        <p className="m-0 font-sans text-sm leading-[1.45] text-muted">{p.desc}</p>
        <div className="mt-auto flex gap-2">
          <a
            href={p.href}
            target="_blank"
            rel="noreferrer"
            className="flex-1 bg-amber p-2.5 text-center text-xs font-bold text-ink no-underline hover:bg-signal"
          >
            GitHub ↗
          </a>
          {p.demo && (
            <a
              href={p.demo}
              target="_blank"
              rel="noreferrer"
              className="flex-1 border border-teal p-2.5 text-center text-xs text-paper no-underline hover:border-amber hover:text-amber"
            >
              Live demo
            </a>
          )}
        </div>
      </aside>
    </div>
  )
}

function PhotosApp({ openWin }: { openWin: (id: WindowId) => void }) {
  const [filter, setFilter] = useState<'All' | PhotoCategory>('All')
  const [viewer, setViewer] = useState(-1)
  const list = photos.map((p, i) => ({ ...p, i })).filter((p) => filter === 'All' || p.category === filter)
  const step = (dir: number) => {
    const j = list.findIndex((p) => p.i === viewer)
    setViewer(list[(j + dir + list.length) % list.length].i)
  }
  const cur = viewer >= 0 ? photos[viewer] : null
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[180px_minmax(0,1fr)]">
      <Places current="photos" count={list.length} openWin={openWin} />
      <div className="relative flex min-h-0 flex-col">
        <div role="tablist" aria-label="Filter photos" className="flex items-center gap-1.5 border-b border-deep px-3 py-2.5">
          {photoCategories.map((c) => (
            <button
              key={c}
              role="tab"
              type="button"
              aria-selected={c === filter}
              onClick={() => {
                setFilter(c)
                setViewer(-1)
              }}
              className={`cursor-pointer border px-2.5 py-1.5 font-mono text-[11px] font-medium ${c === filter ? 'border-amber bg-amber text-ink' : 'border-teal bg-transparent text-paper'}`}
            >
              {c}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-dim">~/photos</span>
        </div>
        <ul className="thin-scroll m-0 grid flex-1 list-none grid-cols-6 content-start gap-2 overflow-auto p-3">
          {list.map((p) => (
            <li key={p.i} style={{ gridColumn: `span ${filter === 'All' ? p.span : 3}` }}>
              <button
                type="button"
                onClick={() => setViewer(p.i)}
                className="block w-full cursor-zoom-in border border-deep p-0 hover:border-amber"
                aria-label={`Open ${p.caption}`}
              >
                <Shot
                  src={p.src}
                  tone={toneColor[p.tone]}
                  alt={p.caption}
                  label={`${photoCode(p.i)} · ${p.caption}`}
                  className="w-full p-2"
                  style={{ height: filter === 'All' ? p.height : 210 }}
                  labelClassName="bg-ink px-1.5 py-0.5 text-[10px] font-medium text-paper"
                  keepLabel
                />
              </button>
            </li>
          ))}
        </ul>
        {cur && (
          <div
            role="dialog"
            aria-label={cur.caption}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setViewer(-1)
              if (e.key === 'ArrowLeft') step(-1)
              if (e.key === 'ArrowRight') step(1)
            }}
            className="absolute inset-0 z-[3] flex flex-col gap-2.5 bg-ink/97 p-3.5"
          >
            <Shot
              src={cur.src}
              tone={toneColor[cur.tone]}
              alt={cur.caption}
              className="flex-1 items-center justify-center border border-teal"
              label={cur.src ? undefined : `full‑res photo · ${cur.caption}`}
              labelClassName="text-[11px] text-muted m-auto"
            />
            <div className="flex items-center gap-2 text-xs">
              <span className="text-amber">{photoCode(viewer)}</span>
              <span>{cur.caption}</span>
              <span className="text-dim">· {cur.category}</span>
              <button type="button" aria-label="Previous" onClick={() => step(-1)} className="ml-auto h-[30px] w-[34px] cursor-pointer border border-teal bg-transparent text-paper hover:border-amber">
                ‹
              </button>
              <button type="button" aria-label="Next" onClick={() => step(1)} className="h-[30px] w-[34px] cursor-pointer border border-teal bg-transparent text-paper hover:border-amber">
                ›
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => setViewer(-1)}
                className="h-[30px] cursor-pointer border border-teal bg-transparent px-3 font-mono text-[11px] font-medium text-paper hover:border-signal hover:bg-signal hover:text-ink"
              >
                close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
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
