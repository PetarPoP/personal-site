import { useCallback, useEffect, useRef, useState } from 'react'
import { bootLog, photoCategories, photoCode, photos, profile, projects, toneColor } from '#/data/portfolio'
import type { PhotoCategory } from '#/data/portfolio'
import { appFromSlug, apps, formatClock, stripes } from '#/lib/os'
import type { AppId } from '#/lib/os'
import { blinkOn, markBooted, shouldSkipBoot, useNow, useTerminal } from '#/lib/hooks'
import { useCvPicker } from './CvPicker'
import { CvDocument, CvLangSwitch, HudCorners, LogoBox, MailSent, ProgressBar, Shot, Wordmark, useMailto } from './shared'
import type { CvLang } from './shared'
import { SpotifyPlayer } from './Spotify'
import { toast } from './Toaster'
import { TerminalBody } from './Terminal'
import { ConfirmDelete, NoteEditor, NoteView, noteLimitHint } from './Notes'
import { useNotes } from '#/lib/useNotes'
import type { Note } from '#/lib/notes'

const homeApps: (AppId | 'github')[] = ['work', 'photos', 'notes', 'cv', 'mail', 'spotify', 'term', 'about', 'github']
const chips = ['help', 'projects', 'about', 'experience', 'ls', 'contact', 'cv', 'open notes', 'spotify', 'fortune', 'coffee', 'sudo hire petar', 'clear']

const bootLines = bootLog.map((b) =>
  b[0] === 'o' ? { tag: '[  OK  ]', color: '#efab30', text: b[1] } : b[0] === 'l' ? { tag: `[${b[1]}]`, color: '#8fb3ad', text: b[2] } : { tag: '', color: '#f1ede4', text: b[1] },
)

export function Mobile({
  enabled,
  initialApp,
  onActiveChange,
}: {
  enabled: boolean | null
  initialApp?: AppId
  onActiveChange: (app: AppId | null, push?: boolean) => void
}) {
  const now = useNow()
  const clock = now === null ? null : formatClock(now)
  const blink = blinkOn(now)
  const openCv = useCvPicker()

  const [phase, setPhase] = useState<'boot' | 'lock' | 'home'>('boot')
  const [progress, setProgress] = useState(0)
  // Keep the app id while it slides down so its content doesn't vanish mid-animation.
  const [app, setApp] = useState<AppId>('work')
  const [appOpen, setAppOpen] = useState(false)
  const [cvLang, setCvLang] = useState<CvLang>('EN')
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)

  // Opening an app from the home screen adds a history entry, so the phone's back button
  // closes the app instead of leaving the site.
  const stacked = useRef(false)
  const leaving = useRef(false)
  useEffect(() => {
    if (!enabled) return
    if (leaving.current) {
      // history.back() already takes the URL back to the home screen.
      leaving.current = false
      return
    }
    const push = appOpen && !stacked.current
    if (push) stacked.current = true
    onActiveChange(appOpen ? app : null, push)
  }, [app, appOpen, enabled, onActiveChange])
  useEffect(() => {
    if (!enabled) return
    const onPop = () => {
      if (stacked.current) {
        stacked.current = false
        setAppOpen(false)
        return
      }
      // Forward again after going back: reopen the app in the URL.
      const id = appFromSlug(new URLSearchParams(window.location.search).get('app') ?? undefined)
      if (id) {
        stacked.current = true
        setApp(id)
        setAppOpen(true)
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [enabled])

  const resetSession = useRef<() => void>(() => {})
  const boot = useCallback(() => {
    clearInterval(timer.current)
    setPhase('boot')
    setProgress(0)
    // The boot screen covers everything first; then the session resets underneath.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setAppOpen(false)
        resetSession.current()
      }),
    )
    let p = 0
    timer.current = setInterval(() => {
      p += 1.4
      if (p < 100) {
        setProgress(p)
        return
      }
      clearInterval(timer.current)
      setProgress(100)
      setPhase('lock')
      markBooted()
    }, 40)
  }, [])

  const openApp = useCallback((id: AppId | 'github') => {
    if (id === 'github') {
      window.open(profile.github, '_blank', 'noopener')
      return
    }
    setApp(id)
    setAppOpen(true)
  }, [])

  const started = useRef(false)
  useEffect(() => {
    if (enabled === null || started.current) return
    started.current = true
    if (initialApp) {
      setPhase('home')
      // Put the home screen under a deep-linked app, so back lands there too.
      onActiveChange(null)
      openApp(initialApp)
    } else if (!enabled) setPhase('home')
    else if (shouldSkipBoot()) setPhase('lock')
    else boot()
  }, [enabled, initialApp, openApp, boot, onActiveChange])
  useEffect(() => () => clearInterval(timer.current), [])

  const back = useCallback(() => {
    if (stacked.current) {
      stacked.current = false
      leaving.current = true
      window.history.back()
    }
    setAppOpen(false)
  }, [])
  const term = useTerminal({ onOpen: openApp, onReboot: boot, onExit: back })
  resetSession.current = term.reset

  // Lock screen: tap or swipe up.
  const touchY = useRef<number | null>(null)
  const unlock = () => setPhase('home')

  const subtitle: Record<AppId, string> = {
    work: `${projects.length} repos`,
    photos: `${photos.length} frames`,
    notes: 'guest notes',
    cv: 'pdf · en / hr',
    mail: 'new message',
    spotify: 'now playing',
    term: 'guest@pop-os',
    about: 'petar popović',
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-ink font-mono text-paper select-none">
      {/* Home */}
      <div
        inert={phase !== 'home' || appOpen}
        className="phone-grid thin-scroll absolute inset-0 flex flex-col gap-4 overflow-y-auto px-[18px] pt-14 pb-12"
      >
        <div aria-hidden className="pointer-events-none fixed bottom-[30px] left-2.5 font-sans text-[150px] leading-[0.8] font-extrabold tracking-[-0.06em] text-transparent [-webkit-text-stroke:1.5px_#476762]">
          P/OS
        </div>
        <section className="relative flex flex-col gap-2 border border-teal bg-deep/85 p-[18px]">
          <div className="flex justify-between text-[11px]">
            <span className="flex items-center gap-[7px] text-amber">
              <span className="size-[7px] bg-amber" style={{ opacity: blink ? 1 : 0.2 }} />
              OPEN TO WORK
            </span>
            <span className="text-muted">{clock?.day}</span>
          </div>
          <h1 className="m-0 font-sans text-[38px] leading-[0.92] font-extrabold tracking-[-0.04em]">
            {profile.firstName}
            <br />
            {profile.lastName}
          </h1>
          <div className="text-xs text-muted">
            {profile.roles}
            <br />
            {profile.locations}
          </div>
        </section>
        <button
          type="button"
          onClick={() => openApp('term')}
          className="relative flex h-[50px] flex-none cursor-pointer items-center gap-2.5 border border-teal bg-ink px-4 text-left font-mono text-xs font-medium text-dim hover:border-amber"
        >
          <span className="text-amber">›_</span>run a command…
        </button>
        <nav aria-label="Apps" className="relative mt-1.5 grid grid-cols-4 gap-x-2 gap-y-5">
          {homeApps.map((id) => {
            const a =
              id === 'github'
                ? { label: 'GitHub', glyph: '↗', bg: '#0d1b1c', fg: '#efab30', border: '#efab30', slug: 'github' }
                : apps[id]
            return (
              <a
                key={id}
                href={id === 'github' ? profile.github : `/?app=${a.slug}`}
                target={id === 'github' ? '_blank' : undefined}
                rel={id === 'github' ? 'noreferrer' : undefined}
                onClick={(e) => {
                  if (id === 'github') return
                  e.preventDefault()
                  openApp(id)
                }}
                className="group flex flex-col items-center gap-2 text-paper no-underline"
              >
                <span
                  aria-hidden
                  className="flex size-[62px] items-center justify-center border font-mono text-[17px] font-bold transition-transform duration-150 group-hover:scale-[1.06]"
                  style={{ background: a.bg, color: a.fg, borderColor: a.border }}
                >
                  {a.glyph}
                </span>
                <span className="font-sans text-xs font-semibold">{a.label}</span>
              </a>
            )
          })}
        </nav>
      </div>

      {/* App layer */}
      <section
        role="dialog"
        aria-label={apps[app].label}
        inert={!appOpen}
        onKeyDown={(e) => e.key === 'Escape' && back()}
        className="absolute inset-0 z-20 flex flex-col bg-ink transition-transform duration-[450ms] ease-[cubic-bezier(.2,.8,.2,1)]"
        style={{ transform: appOpen ? 'none' : 'translateY(104%)' }}
      >
        <div className="mt-9 flex h-14 flex-none items-center gap-1.5 border-b border-deep px-2.5">
          <button type="button" aria-label="Back" onClick={back} className="size-11 cursor-pointer border-0 bg-transparent text-xl text-paper">
            ←
          </button>
          <h2 className="m-0 flex-1 font-sans text-[22px] font-extrabold tracking-[-0.02em]">{apps[app].label}</h2>
          <span className="pr-2 text-[11px] text-dim">{subtitle[app]}</span>
        </div>
        <div ref={app === 'term' ? term.scrollRef : undefined} className="thin-scroll relative min-h-0 flex-1 overflow-auto">
          {app === 'work' && <ProjectsApp />}
          {app === 'photos' && <PhotosApp />}
          {app === 'cv' && (
            <div className="min-h-full bg-deep px-3.5 pt-3.5 pb-[100px]">
              <div className="mb-3 flex justify-end">
                <CvLangSwitch lang={cvLang} setLang={setCvLang} />
              </div>
              <CvDocument lang={cvLang} />
            </div>
          )}
          {app === 'mail' && <MailApp />}
          {app === 'term' && (
            <div className="px-3.5 pt-3 pb-[120px] text-xs leading-[1.6]">
              <TerminalBody term={term} compact user="guest" />
            </div>
          )}
          {app === 'about' && <AboutApp />}
          {app === 'notes' && <NotesApp />}
          {app === 'spotify' && <SpotifyPlayer active={appOpen && phase === 'home'} compact />}
        </div>
        {app === 'term' && (
          <div className="thin-scroll absolute inset-x-0 bottom-6 flex gap-1.5 overflow-x-auto border-t border-deep bg-ink px-3 py-2.5">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => term.run(c)}
                className="h-9 flex-none cursor-pointer border border-teal bg-deep px-3 font-mono text-[11px] font-medium text-paper active:bg-amber active:text-ink"
              >
                {c}
              </button>
            ))}
          </div>
        )}
        {app === 'cv' && (
          <button
            type="button"
            onClick={openCv}
            className="absolute inset-x-4 bottom-[34px] flex h-[52px] cursor-pointer items-center justify-center border-0 bg-amber font-mono text-[13px] font-bold text-ink shadow-[0_10px_30px_rgba(0,0,0,.5)]"
          >
            Download CV.pdf ↓
          </button>
        )}
      </section>

      {/* Lock screen */}
      <div
        data-boot
        role="button"
        tabIndex={phase === 'lock' ? 0 : -1}
        aria-label="Unlock"
        aria-hidden={phase === 'home'}
        inert={phase === 'home'}
        onClick={unlock}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && unlock()}
        onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
        onTouchEnd={(e) => {
          if (touchY.current !== null && e.changedTouches[0].clientY - touchY.current < -40) unlock()
          touchY.current = null
        }}
        className="absolute inset-0 z-30 cursor-pointer bg-ink transition-transform duration-[550ms] ease-[cubic-bezier(.7,0,.2,1)]"
        style={{ transform: phase === 'home' ? 'translateY(-102%)' : 'none' }}
      >
        {profile.lockWallpaper ? (
          <img src={profile.lockWallpaper} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: stripes('#1c3132') }} />
        )}
        <div className="absolute inset-0 bg-linear-to-b from-ink/20 to-ink/85" />
        <HudCorners size={26} inset={18} top={50} bottom={40} />
        <div className="absolute inset-x-0 top-[110px] flex flex-col items-center gap-1.5">
          <span className="font-sans text-[104px] leading-[0.9] font-extrabold tracking-[-0.05em]">{clock?.hm ?? ' '}</span>
          <span className="text-[13px] text-muted">{clock ? `${clock.longDate} · Livno` : ' '}</span>
        </div>
        <div className="absolute inset-x-4 top-[330px] flex gap-3 border border-teal bg-deep/92 p-3.5">
          <LogoBox size={38} font={15} style={{ borderWidth: 1.5 }} />
          <div className="flex flex-1 flex-col gap-[3px] text-[11px]">
            <span className="flex justify-between text-dim">
              <span>POP/OS</span>
              <span>now</span>
            </span>
            <span className="font-sans text-sm leading-[1.4]">Hi, I'm Petar. Unlock to see my work, photos and CV.</span>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-14 flex flex-col items-center gap-2 text-xs">
          <span className="bob text-lg text-amber">↑</span>
          Tap to unlock
        </div>
      </div>

      {/* Status bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex h-9 items-center justify-between px-6 text-xs font-medium">
        <span>{clock?.hm}</span>
        <span>5G ▂▄▆ 87%</span>
      </div>

      {/* Boot */}
      <div
        data-boot
        aria-hidden={phase !== 'boot'}
        className="absolute inset-0 z-[60] bg-ink"
        style={{
          opacity: phase === 'boot' ? 1 : 0,
          pointerEvents: phase === 'boot' ? 'auto' : 'none',
          transition: phase === 'boot' ? 'none' : 'opacity .6s',
        }}
      >
        <HudCorners size={26} inset={18} top={50} bottom={40} />
        <div className="absolute inset-x-0 top-[32%] flex flex-col items-center gap-5">
          <LogoBox font={32} style={{ transform: `rotate(${progress * 3.6}deg)` }} />
          <Wordmark size={40} />
          <ProgressBar width={180} value={progress} />
        </div>
        <div className="absolute inset-x-6 bottom-[70px] flex flex-col gap-0.5 overflow-hidden text-[10px] leading-[1.5] text-dim">
          {bootLines
            .slice(0, Math.round((progress / 100) * bootLines.length))
            .slice(-5)
            .map((l, i) => (
              <div key={i} className="truncate whitespace-nowrap">
                <span style={{ color: l.color }}>{l.tag}</span> {l.text}
              </div>
            ))}
        </div>
      </div>

      {/* Gesture bar: home / unlock */}
      <button
        type="button"
        aria-label="Home"
        onClick={() => (phase === 'lock' ? unlock() : back())}
        className="absolute bottom-0 left-1/2 z-[70] -ml-[90px] flex h-6 w-[180px] cursor-pointer items-center justify-center border-0 bg-transparent"
      >
        <span className="h-1 w-[120px] rounded-sm bg-paper" />
      </button>
    </div>
  )
}

function ProjectsApp() {
  return (
    <ul className="m-0 flex list-none flex-col gap-3.5 p-4">
      {projects.map((p) => (
        <li key={p.slug}>
          <a href={p.href} target="_blank" rel="noreferrer" className="flex flex-col border border-deep text-paper no-underline">
            <Shot src={p.image} tone={toneColor[p.tone]} alt={`${p.name} screenshot`} label={`screenshot · ${p.slug}`} className="h-[170px] p-2" />
            <span className="flex flex-col gap-1.5 p-3.5">
              <span className="flex items-baseline justify-between">
                <h3 className="m-0 font-sans text-[21px] font-extrabold tracking-[-0.02em]">{p.name}</h3>
                <span className="text-amber">↗</span>
              </span>
              <span className="text-[10px] text-amber uppercase">{p.stack}</span>
              <span className="font-sans text-sm leading-[1.45] text-muted">{p.desc}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function PhotosApp() {
  const [filter, setFilter] = useState<'All' | PhotoCategory>('All')
  const [viewer, setViewer] = useState(-1)
  const list = photos.map((p, i) => ({ ...p, i })).filter((p) => filter === 'All' || p.category === filter)
  const step = (dir: number) => {
    const j = list.findIndex((p) => p.i === viewer)
    setViewer(list[(j + dir + list.length) % list.length].i)
  }
  const cur = viewer >= 0 ? photos[viewer] : null
  return (
    <div className="flex flex-col gap-3 p-3.5">
      <div role="tablist" aria-label="Filter photos" className="thin-scroll flex gap-1.5 overflow-x-auto pb-0.5">
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
            className={`h-[34px] flex-none cursor-pointer border px-3 font-mono text-[11px] font-medium ${c === filter ? 'border-amber bg-amber text-ink' : 'border-teal bg-transparent text-paper'}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="columns-2 gap-2">
        {list.map((p) => (
          <button
            key={p.i}
            type="button"
            aria-label={`Open ${p.caption}`}
            onClick={() => setViewer(p.i)}
            className="mb-2 block w-full cursor-pointer break-inside-avoid border border-deep p-0"
          >
            <Shot
              src={p.src}
              tone={toneColor[p.tone]}
              alt={p.caption}
              label={photoCode(p.i)}
              className="w-full p-1.5"
              style={{ height: p.mobileHeight }}
              labelClassName="bg-ink px-[5px] py-0.5 text-[9px] text-paper"
              keepLabel
            />
          </button>
        ))}
      </div>
      {cur && (
        <div role="dialog" aria-label={cur.caption} className="fixed inset-0 z-[5] flex flex-col bg-ink pt-12 pb-[30px]">
          <Shot
            src={cur.src}
            tone={toneColor[cur.tone]}
            alt={cur.caption}
            className="flex-1"
            label={cur.src ? undefined : `full‑res · ${cur.caption}`}
            labelClassName="text-[10px] text-muted m-auto"
          />
          <div className="flex items-center gap-2 px-4 py-3.5 text-xs">
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="font-sans text-base font-bold">{cur.caption}</span>
              <span className="text-dim">
                {photoCode(viewer)} · {cur.category}
              </span>
            </div>
            <button type="button" aria-label="Previous" onClick={() => step(-1)} className="size-11 cursor-pointer border border-teal bg-transparent text-paper">
              ‹
            </button>
            <button type="button" aria-label="Next" onClick={() => step(1)} className="size-11 cursor-pointer border border-teal bg-transparent text-paper">
              ›
            </button>
            <button type="button" aria-label="Close" autoFocus onClick={() => setViewer(-1)} className="size-11 cursor-pointer border border-signal bg-signal text-ink">
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MailApp() {
  const mail = useMailto()
  if (mail.sent) return <MailSent onReset={mail.reset} big={46} />
  const field = 'border border-teal bg-ink font-[inherit] text-paper outline-none focus:border-amber focus-visible:outline-none'
  return (
    <form
      className="flex flex-col gap-3 p-4 text-xs select-text"
      onSubmit={(e) => {
        e.preventDefault()
        mail.send(e.currentTarget)
      }}
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-dim">TO</span>
        <span className="text-[13px] text-amber">{profile.email}</span>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-dim">FROM</span>
        <input name="from" type="email" placeholder="you@email.com" className={`h-[46px] px-3 font-mono text-sm ${field}`} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-dim">MESSAGE</span>
        <textarea name="message" required placeholder="Hi Petar, …" className={`h-[200px] resize-none p-3 font-sans text-[15px] leading-[1.5] ${field}`} />
      </label>
      <button type="submit" className="h-[52px] cursor-pointer border-0 bg-amber font-mono text-sm font-bold text-ink active:bg-signal">
        Send ⏎
      </button>
    </form>
  )
}

function AboutApp() {
  const openCv = useCvPicker()
  return (
    <div className="flex flex-col gap-[18px] px-[18px] py-5">
      <Shot src={profile.portrait} tone="#1c3132" alt="Portrait of Petar Popović" label="portrait · your photo" className="h-[260px] border border-teal p-2.5" />
      <h3 className="m-0 font-sans text-[34px] leading-[0.95] font-extrabold tracking-[-0.04em]">
        I write code and
        <br />
        <span className="text-amber">chase good light.</span>
      </h3>
      <p className="m-0 font-sans text-[15px] leading-[1.55] text-muted">{profile.about}</p>
      <div className="grid grid-cols-2 gap-2">
        <a href={profile.github} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center bg-amber text-xs font-bold text-ink no-underline">
          GitHub ↗
        </a>
        <button type="button" onClick={openCv} className="flex h-12 cursor-pointer items-center justify-center border border-teal bg-transparent font-mono text-xs text-paper">
          CV.pdf ↓
        </button>
      </div>
    </div>
  )
}

function NotesApp() {
  const { status, notes, mineLeft, admin, remove } = useNotes()
  const [open, setOpen] = useState<string | 'new' | null>(null)
  const [confirm, setConfirm] = useState<Note | null>(null)
  const [error, setError] = useState<string | null>(null)
  const current = open && open !== 'new' ? notes.find((n) => n.id === open) : undefined
  const del = async (n: Note) => {
    setConfirm(null)
    const err = await remove(n.id)
    setError(err)
    if (err) toast.error(err)
    else {
      toast.success(`Deleted ${n.name}`)
      setOpen(null)
    }
  }

  if (open === 'new' || current) {
    return (
      <div className="flex min-h-full flex-col gap-3 p-4">
        <button type="button" onClick={() => setOpen(null)} className="cursor-pointer self-start border-0 bg-transparent p-0 font-mono text-xs text-dim">
          ← all notes
        </button>
        <h3 className="m-0 truncate font-sans text-2xl font-extrabold">{current ? current.name : 'New note'}</h3>
        {open === 'new' ? (
          <NoteEditor compact onSaved={(n) => setOpen(n.id)} onCancel={() => setOpen(null)} />
        ) : current!.mine ? (
          <NoteEditor compact key={current!.id} note={current} onSaved={() => setOpen(null)} onDelete={() => setConfirm(current!)} />
        ) : (
          <>
            <NoteView note={current!} />
            {admin && (
              <button type="button" onClick={() => setConfirm(current!)} className="h-11 cursor-pointer border border-signal bg-transparent font-mono text-xs text-signal">
                Delete (admin)
              </button>
            )}
          </>
        )}
        {confirm && <ConfirmDelete name={confirm.name} onConfirm={() => void del(confirm)} onCancel={() => setConfirm(null)} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="m-0 font-sans text-sm leading-[1.5] text-muted">Leave Petar a note. Everyone who opens Notes can read it; you can edit or delete your own.</p>
      {status === 'ready' && (
        <button
          type="button"
          disabled={mineLeft === 0}
          onClick={() => setOpen('new')}
          className="h-12 cursor-pointer border-0 bg-amber font-mono text-[13px] font-bold text-ink disabled:cursor-default disabled:opacity-50"
        >
          + New note <span className="font-normal">· {noteLimitHint(mineLeft)}</span>
        </button>
      )}
      {status === 'loading' && <p className="m-0 text-xs text-dim">loading notes…</p>}
      {status === 'offline' && <p className="m-0 text-xs text-dim">Notes aren't connected yet.</p>}
      {status === 'error' && <p className="m-0 text-xs text-signal">Could not load notes.</p>}
      {error && <p className="m-0 text-xs text-signal">{error}</p>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {notes.map((n) => (
          <li key={n.id}>
            <button type="button" onClick={() => setOpen(n.id)} className="flex w-full cursor-pointer flex-col gap-1 border border-deep bg-transparent p-3 text-left text-paper">
              <span className="flex w-full items-center justify-between gap-2">
                <span className="truncate font-mono text-[13px] font-bold">{n.name}</span>
                {n.mine && <span className="text-[10px] text-amber">yours</span>}
              </span>
              <span className="line-clamp-2 font-sans text-sm text-muted">{n.text}</span>
              {n.sig && <span className="font-sans text-xs text-amber">— {n.sig}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
