import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { profile, projectKinds, projects, timeline } from '#/data/portfolio'
import { getRepos } from '#/lib/github'
import type { Repo } from '#/lib/github'
import type { ProjectKind } from '#/data/portfolio'
import Lenis from 'lenis'
import { createDither } from '#/lib/dither-renderer'

// The Spotify ticket (and its QR code library) loads separately; it sits at the very bottom.
const Spotify = lazy(() => import('./Spotify').then((m) => ({ default: m.Spotify })))

const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

// The whole site: one scrolling page. The hero's dithered water grows to fill the screen as
// you scroll, the content sheet slides over it, and dithered bands blend each section into
// the next.
export function Site() {
  const h1Ref = useRef<HTMLHeadingElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLCanvasElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const footRef = useRef<HTMLDivElement>(null)
  const markRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Bigger dither pixels on phones: cheaper to draw and the pattern reads better small.
    const px = () => (window.innerWidth < 700 ? 3 : 2)
    const t0 = performance.now()
    let raf = 0
    let lastHero = 0
    let lastBands = 0
    let dirty = true
    let phase = 0
    let top0: number | null = null

    const measure = () => {
      const h = h1Ref.current
      if (!h) return
      const prev = h.style.transform
      h.style.transform = 'none'
      top0 = h.offsetTop + h.offsetHeight + Math.max(24, window.innerHeight * 0.04)
      h.style.transform = prev
      onScroll()
    }

    const onScroll = () => {
      const H = window.innerHeight
      const p = ease(clamp01(window.scrollY / (H * 0.85)))
      const pad = 16 * (1 - p)
      const top = (top0 ?? H * 0.46) * (1 - p)
      const pn = panelRef.current
      const c = heroRef.current
      const h = h1Ref.current
      if (pn) {
        pn.style.top = `${top}px`
        pn.style.left = pn.style.right = pn.style.bottom = `${pad}px`
        pn.style.borderWidth = 1 - p > 0.02 ? '1px' : '0'
      }
      if (c) {
        c.style.left = `${-pad - 1}px`
        c.style.top = `${-top - 1}px`
      }
      if (h) {
        h.style.transform = `translateY(${-p * H * 0.35}px)`
        h.style.opacity = String(Math.max(0, 1 - p * 1.6))
      }
      const ft = footRef.current
      if (ft) {
        const r = ft.getBoundingClientRect()
        // 1 once the footer is fully on screen (it can be shorter than the screen on phones).
        const ph = clamp01((H - r.top) / Math.min(r.height, H))
        if (Math.abs(ph - phase) > 0.004) phase = ph
        const mk = markRef.current
        if (mk) {
          const e = Math.max(0, (ph - 0.55) / 0.45)
          mk.style.transform = `translateY(${(1 - e) * 40}%)`
          mk.style.opacity = String(e)
        }
      }
      // Which colour is under the header: light text and a dark fade over dark sections.
      const nav = navRef.current
      if (nav) {
        const y = nav.offsetHeight / 2
        const el = document.elementFromPoint(window.innerWidth / 2, y)?.closest<HTMLElement>('[data-tone]')
        let tone = el?.dataset.tone ?? 'light'
        if (el && tone.includes(',')) {
          const r = el.getBoundingClientRect()
          tone = tone.split(',')[(y - r.top) / r.height < 0.5 ? 0 : 1]
        }
        if (nav.dataset.tone !== tone) nav.dataset.tone = tone
      }
      dirty = true
    }

    // The hero is hidden once the sheet covers the whole screen.
    const heroVisible = () => {
      const r = sheetRef.current?.getBoundingClientRect()
      return !r || !(r.top < 0 && r.bottom > window.innerHeight)
    }

    // The dithered canvases are drawn in a worker where the browser allows it (dither-renderer.ts).
    const dither = createDither(heroRef.current, [...(sheetRef.current?.querySelectorAll<HTMLCanvasElement>('canvas[data-dither]') ?? [])])

    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop)
      const t = reduce ? 0 : (ts - t0) / 1000
      const bands = dirty || (!reduce && ts - lastBands > 66)
      const hero = dirty || (!reduce && ts - lastHero >= 80)
      if (!bands && !hero) return
      if (bands) lastBands = ts
      if (hero) lastHero = ts
      dirty = false
      dither.frame(t, phase, px(), { bands, hero: hero && heroVisible() })
    }

    // Smooth wheel scrolling (touch keeps the phone's own scrolling). Anchor links glide too.
    const lenis = reduce ? null : new Lenis({ autoRaf: true, anchors: { offset: -16 } })

    const onResize = () => measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    measure()
    document.fonts?.ready.then(measure)
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis?.destroy()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <main className="relative bg-sand text-ink">
      <Nav navRef={navRef} />

      <div id="top" data-tone="light" className="sticky top-0 z-0 h-svh overflow-hidden bg-sand">
        <h1
          ref={h1Ref}
          className="m-0 px-4 pt-[clamp(88px,13vh,150px)] text-center text-[clamp(46px,8.4vw,168px)] leading-[.92] font-semibold tracking-[-.035em] will-change-[transform,opacity]"
        >
          {profile.headline[0]}
          <br />
          {profile.headline[1]}
        </h1>
        <div ref={panelRef} data-tone="dark" className="absolute top-[46vh] right-4 bottom-4 left-4 overflow-hidden border border-ink bg-teal">
          <canvas ref={heroRef} aria-hidden className="pixelated absolute top-0 left-0 h-lvh w-screen" />
        </div>
      </div>

      <div className="h-[85svh]" />

      <div ref={sheetRef} className="relative z-[2]">
        <Band colors="none,#2f8f8a,#c9c0ad,#e2d8c4,#e9dfca" tone="dark,light" className="h-[clamp(240px,48vw,760px)]" />

        <div data-tone="light" className="flex flex-col gap-[clamp(96px,16vw,240px)] bg-sand px-[clamp(20px,6vw,110px)] py-[clamp(56px,9vw,150px)]">
          <Intro />
          <Work />
        </div>

        <Band colors="#e9dfca,#e2d8c4,#c9c0ad,#2f8f8a" tone="light,dark" className="h-[clamp(220px,44vw,700px)]" />

        <section data-tone="dark" className="relative flex flex-col gap-[clamp(120px,16vw,240px)] bg-deep px-[clamp(20px,6vw,110px)] py-[clamp(110px,18vw,280px)] text-paper">
          <canvas data-dither="#2f8f8a,#22706c,#1d4f4c" data-mode="field" aria-hidden className="pixelated absolute inset-0 h-full w-full" />
          <div id="experience" className="relative z-[1] flex scroll-mt-24 flex-col gap-[clamp(40px,6vw,88px)]">
            <h2 className="heading">Where I've been</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-x-[clamp(32px,4vw,56px)] gap-y-[clamp(36px,5vw,72px)]">
              {timeline.map((x) => (
                <div key={x.when + x.title} className="rise flex flex-col gap-2">
                  <span className="text-[15px] text-mint">
                    {x.when}
                    {x.school && ' · School'}
                  </span>
                  <span className="text-[clamp(22px,2vw,28px)] leading-[1.1] font-semibold tracking-[-.025em]">{x.title}</span>
                  <span className="text-[16px] leading-snug text-paper/75">{x.where}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Contact footRef={footRef} markRef={markRef} />
      </div>
    </main>
  )
}

// `tone` is the colour under the header in the band's top and bottom half (see Nav).
function Band({ colors, tone, className }: { colors: string; tone: string; className: string }) {
  return <canvas data-dither={colors} data-tone={tone} aria-hidden className={`pixelated -my-px block w-full ${className}`} />
}

function Logo({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden className={`grid grid-cols-[9px_9px] gap-0.5 ${className}`}>
      <span className="size-[9px] bg-current" />
      <span className="size-[9px] border-[1.5px] border-current" />
      <span className="size-[9px] rounded-full border-[1.5px] border-current" />
      <span className="size-[9px] bg-current" />
    </span>
  )
}

function Nav({ navRef }: { navRef: React.RefObject<HTMLElement | null> }) {
  const link = 'pointer-events-auto transition-opacity hover:opacity-60'
  return (
    <nav
      ref={navRef}
      data-tone="light"
      className="group/nav pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-4 px-[clamp(16px,3vw,40px)] py-[clamp(16px,2vw,22px)] text-[15px] font-medium tracking-[-.01em] whitespace-nowrap text-ink transition-colors duration-300 data-[tone=dark]:text-paper sm:text-base"
    >
      {/* A soft fade behind the links, dark over dark sections and cream over light ones. */}
      <span aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[170%] bg-linear-to-b from-sand/90 via-sand/60 to-transparent transition-opacity duration-300 group-data-[tone=dark]/nav:opacity-0" />
      <span aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[170%] bg-linear-to-b from-[#0d2624]/55 via-[#0d2624]/25 to-transparent opacity-0 transition-opacity duration-300 group-data-[tone=dark]/nav:opacity-100" />
      <a href="#top" className={`${link} flex items-center gap-2.5 font-semibold`}>
        <Logo />
        {profile.name}
      </a>
      <span className="flex items-center gap-[clamp(14px,3vw,36px)]">
        <a href="#work" className={link}>
          Work
        </a>
        <a href="#music" className={`${link} max-sm:hidden`}>
          Music
        </a>
        <a href="#experience" className={`${link} max-sm:hidden`}>
          Experience
        </a>
        <a href={`mailto:${profile.email}`} className={`${link} flex items-center gap-1.5`}>
          <ArrowUpRight size={18} strokeWidth={1.75} />
          Email<span className="max-[380px]:hidden"> me</span>
        </a>
      </span>
    </nav>
  )
}

function Intro() {
  return (
    <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] items-center gap-[clamp(24px,6vw,110px)]">
      <h2 className="heading">{profile.name}</h2>
      <div className="flex flex-col gap-7">
        <p className="m-0 max-w-[32ch] text-[clamp(20px,2.2vw,32px)] leading-[1.25] tracking-[-.02em] text-pretty text-muted">{profile.intro}</p>
        <div className="flex flex-wrap gap-x-7 gap-y-3 text-[17px] font-medium">
          {profile.tags.map((t) => (
            <span key={t} className="whitespace-nowrap">
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function Work() {
  const [kind, setKind] = useState<ProjectKind | 'all'>('all')
  const filters: [ProjectKind | 'all', string][] = [['all', 'All'], ...(Object.entries(projectKinds) as [ProjectKind, string][])]
  const shown = projects.filter((p) => kind === 'all' || p.kind === kind)
  // Until GitHub answers, cards link to the repos named in portfolio.ts; after that, only to
  // the ones that are public, with when they last changed.
  const [repos, setRepos] = useState<Record<string, Repo> | null>(null)
  useEffect(() => {
    let alive = true
    getRepos()
      .then((r) => alive && 'repos' in r && setRepos(r.repos))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return (
    <section id="work" className="flex scroll-mt-24 flex-col gap-[clamp(36px,6vw,88px)]">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <h2 className="heading">Things I've built</h2>
        <div role="group" aria-label="Filter projects" className="flex flex-wrap gap-x-6 gap-y-2">
          {filters.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={kind === id}
              onClick={() => setKind(id)}
              className={`cursor-pointer border-0 border-b-2 bg-transparent py-1.5 text-base font-medium transition-colors hover:text-teal ${
                kind === id ? 'border-teal text-teal' : 'border-transparent text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-x-[clamp(32px,4vw,56px)] gap-y-[clamp(36px,5vw,72px)]">
        {shown.map((p) => (
          <article key={p.name} className="rise flex flex-col gap-3">
            <span className={`text-sm font-medium ${p.kind === 'iot' ? 'text-coral' : 'text-teal'}`}>{projectKinds[p.kind]}</span>
            <h3 className="m-0 text-[clamp(24px,2.2vw,32px)] leading-[1.05] font-semibold tracking-[-.03em]">{p.name}</h3>
            <p className="m-0 text-base leading-normal text-pretty text-muted">{p.desc}</p>
            <span className="text-sm text-muted/80">{p.stack}</span>
            <Code repo={p.repo} live={repos} />
          </article>
        ))}
      </div>
    </section>
  )
}

function Code({ repo, live }: { repo?: string; live: Record<string, Repo> | null }) {
  if (!repo) return null
  const info = live?.[repo.toLowerCase()]
  if (live && !info) return null
  return (
    <span className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <a
        href={info?.url ?? `${profile.github.replace(/\/+$/, '')}/${repo}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 text-[15px] font-medium text-ink underline decoration-1 underline-offset-4 transition-colors hover:text-teal"
      >
        Code on GitHub
        <ArrowUpRight size={16} strokeWidth={1.75} />
      </a>
      {info && <span className="text-sm text-muted/80">updated {month(info.pushed)}</span>}
    </span>
  )
}

const month = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

function Contact({ footRef, markRef }: { footRef: React.RefObject<HTMLDivElement | null>; markRef: React.RefObject<HTMLDivElement | null> }) {
  const links = [
    { label: 'Email me', href: `mailto:${profile.email}` },
    { label: 'GitHub', href: profile.github },
    ...profile.cvs.map((c) => ({ label: c.label, href: c.href })),
  ]
  return (
    // Top padding = the space from Work to "Where I've been" (sand padding + band), so the
    // headings are evenly spaced.
    <footer
      id="contact"
      data-tone="dark"
      ref={footRef}
      className="relative flex scroll-mt-24 flex-col gap-[clamp(80px,14vw,200px)] overflow-hidden bg-teal pt-[calc(clamp(56px,9vw,150px)+clamp(220px,44vw,700px))] pb-3 text-paper"
    >
      <canvas data-dither="#e9dfca,#c9c0ad,#2f8f8a,#22706c,#1d4f4c" data-mode="foot" aria-hidden className="pixelated absolute inset-0 h-full w-full" />
      <div className="relative z-[1] flex flex-wrap items-end justify-between gap-[clamp(28px,4vw,64px)] px-[clamp(20px,6vw,110px)]">
        <p className="heading m-0 max-w-[16ch] flex-[1_1_640px] text-[clamp(44px,6.4vw,112px)]">Hiring an engineer? Let's talk.</p>
        <div className="flex flex-wrap gap-x-9 gap-y-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
              className="text-[clamp(20px,1.8vw,26px)] font-semibold tracking-[-.02em] text-paper underline decoration-2 underline-offset-[6px] transition-opacity hover:opacity-70"
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
      <div id="music" className="relative z-[1] scroll-mt-24 px-[clamp(20px,6vw,110px)] empty:hidden">
        <Suspense fallback={null}>
          <Spotify />
        </Suspense>
      </div>
      <div className="pointer-events-none relative z-[1] flex flex-col gap-4 px-4">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[15px] text-sand">
          <span>© {new Date().getFullYear()}</span>
          <span>{profile.role}</span>
          <span>{profile.location}</span>
        </div>
        <div ref={markRef} aria-hidden className="-ml-[.04em] text-[13.2vw] leading-[.8] font-semibold tracking-[-.055em] whitespace-nowrap text-sand will-change-[transform,opacity]">
          {profile.name}
        </div>
      </div>
    </footer>
  )
}
