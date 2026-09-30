import { useEffect } from 'react'

// One requestAnimationFrame loop drives every scroll effect on the page.
// Elements opt in with data attributes, the same contract the design used:
//   data-fx="x|y"        parallax drift, strength in data-k (px)
//   data-fx="glitch"     RGB split proportional to scroll velocity
//   data-fx="scramble"   text decodes once it enters the viewport
//   data-fx="marquee"    endless ticker that speeds up with scrolling
//   data-fx="pin"        sticky section that swaps [data-panel] children
//   data-fx="hscroll"    sticky section that slides its [data-track] sideways
//   data-progress, data-meter, data-blink, data-readout   HUD chrome
//   data-section / data-label    named sections for the HUD readout
//   data-goto            click to scroll to a data-section

const GLYPHS = '!<>-_/[]{}=+*^?#01'
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

type ScrambleEl = HTMLElement & { _txt?: string; _t0?: number; _done?: boolean }
type PinEl = HTMLElement & { _idx?: number }

export function useScrollFx({ intensity = 1 }: { intensity?: number } = {}) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const I = reduced ? 0 : intensity
    // Smooth (lerped) wheel scrolling only for fine pointers; touch keeps native momentum.
    const smooth = !reduced && window.matchMedia('(pointer: fine)').matches

    const root = document.documentElement
    const maxScroll = () => root.scrollHeight - window.innerHeight
    const s = { cur: window.scrollY, target: window.scrollY, last: window.scrollY, prev: window.scrollY, vel: 0, mx: new Map<Element, number>() }

    const scrollToSection = (name: string) => {
      const t = document.querySelector<HTMLElement>(`[data-section="${name}"]`)
      if (!t) return
      const off = Math.max(0, Math.min(maxScroll(), t.getBoundingClientRect().top + window.scrollY))
      if (smooth) s.target = off
      else window.scrollTo({ top: off, behavior: reduced ? 'auto' : 'smooth' })
    }

    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest<HTMLElement>('[data-goto]')
      if (!a?.dataset.goto) return
      e.preventDefault()
      scrollToSection(a.dataset.goto)
      history.replaceState(null, '', a.dataset.goto === 'top' ? location.pathname : `#${a.dataset.goto}`)
    }

    const onWheel = (e: WheelEvent) => {
      if (!smooth || e.ctrlKey || e.metaKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      e.preventDefault()
      const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY
      s.target = Math.max(0, Math.min(maxScroll(), s.target + d))
    }

    document.addEventListener('click', onClick)
    window.addEventListener('wheel', onWheel, { passive: false })

    if (location.hash.length > 1) {
      const name = location.hash.slice(1)
      requestAnimationFrame(() => {
        const t = document.querySelector(`[data-section="${name}"]`)
        if (t) {
          const off = t.getBoundingClientRect().top + window.scrollY
          window.scrollTo(0, off)
          s.cur = s.target = s.last = s.prev = off
        }
      })
    }

    const clockFmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Sarajevo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const top = window.scrollY
      if (smooth) {
        // Keyboard, scrollbar or find-in-page moved us: adopt the new position.
        if (Math.abs(top - s.last) > 2) s.cur = s.target = top
        s.cur += (s.target - s.cur) * 0.1
        if (Math.abs(s.target - s.cur) < 0.3) s.cur = s.target
        if (Math.abs(s.cur - top) >= 0.5) window.scrollTo(0, s.cur)
      } else s.cur = s.target = top
      s.last = window.scrollY
      s.vel = s.last - s.prev
      s.prev = s.last

      const vh = window.innerHeight
      // Parallax strengths were tuned on a 1200px-wide frame; scale them down on narrow screens.
      const kScale = Math.min(1, window.innerWidth / 1200)
      const max = maxScroll()
      const pct = max > 0 ? s.last / max : 0

      document.querySelectorAll<HTMLElement>('[data-progress]').forEach((b) => {
        b.style.width = pct * 100 + '%'
      })

      document.querySelectorAll<HTMLElement>('[data-fx]').forEach((f) => {
        const r = f.getBoundingClientRect()
        const fx = f.dataset.fx
        const k = parseFloat(f.dataset.k || '0') * I * kScale
        const p = clamp01((vh - r.top) / (vh + r.height))
        const h = clamp01(-r.top / Math.max(1, r.height - vh))

        if (fx === 'x') f.style.transform = `translate3d(${((p - 0.5) * k).toFixed(1)}px,0,0)`
        else if (fx === 'y') f.style.transform = `translate3d(0,${((p - 0.5) * k).toFixed(1)}px,0)`
        else if (fx === 'scramble') {
          const el = f as ScrambleEl
          if (el._txt == null) el._txt = el.textContent || ''
          if (!el._t0 && r.top < vh * 0.92) {
            el._t0 = performance.now()
            el.style.opacity = '1'
            if (reduced) el._done = true
          }
          if (el._t0 && !el._done) {
            const dt = performance.now() - el._t0
            const T = el._txt
            let out = ''
            let done = true
            for (let i = 0; i < T.length; i++) {
              const c = T[i]
              if (c === ' ' || dt > i * 22 + 250) out += c
              else {
                done = false
                out += GLYPHS[(Math.random() * GLYPHS.length) | 0]
              }
            }
            el.textContent = out
            if (done) el._done = true
          }
        } else if (fx === 'glitch') {
          const v = Math.max(-9, Math.min(9, s.vel * 0.45 * I))
          f.style.textShadow =
            Math.abs(v) < 0.4 ? 'none' : `${v.toFixed(1)}px 0 var(--color-signal), ${(-v).toFixed(1)}px 0 var(--color-mist)`
        } else if (fx === 'hscroll') {
          const tr = f.querySelector<HTMLElement>('[data-track]')
          if (!tr?.parentElement) return
          const dist = Math.max(0, tr.scrollWidth - tr.parentElement.clientWidth)
          tr.style.transform = `translate3d(${(-h * dist).toFixed(1)}px,0,0)`
          const bar = f.querySelector<HTMLElement>('[data-bar]')
          if (bar) bar.style.width = h * 100 + '%'
        } else if (fx === 'pin') {
          const el = f as PinEl
          const ps = el.querySelectorAll<HTMLElement>('[data-panel]')
          const n = ps.length
          if (!n) return
          const idx = Math.min(n - 1, Math.floor(h * n))
          if (el._idx === idx) return
          el._idx = idx
          ps.forEach((pn, i) => {
            const on = i === idx
            pn.style.opacity = on ? '1' : '0'
            pn.style.transform = `translateY(${i < idx ? -40 : i > idx ? 40 : 0}px)`
            pn.style.pointerEvents = on ? 'auto' : 'none'
            pn.setAttribute('aria-hidden', on ? 'false' : 'true')
            pn.inert = !on
          })
          const c = el.querySelector('[data-pin-count]')
          if (c) c.textContent = String(idx + 1).padStart(2, '0')
        } else if (fx === 'marquee') {
          const tr = f.firstElementChild as HTMLElement | null
          if (!tr) return
          let x = s.mx.get(f) || 0
          x -= (0.7 + Math.min(Math.abs(s.vel), 60) * 0.3) * I
          const half = tr.scrollWidth / 2
          if (half && -x >= half) x += half
          s.mx.set(f, x)
          tr.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`
        }
      })

      document.querySelectorAll<HTMLElement>('[data-meter]').forEach((m) => {
        const tp = m.querySelector<HTMLElement>('[data-tape]')
        const nd = m.querySelector<HTMLElement>('[data-needle]')
        if (tp) tp.style.transform = `translate3d(0,${(-pct * 500).toFixed(1)}px,0)`
        if (nd) nd.style.width = (28 + Math.min(Math.abs(s.vel), 40) * 0.9).toFixed(1) + 'px'
      })

      document.querySelectorAll<HTMLElement>('[data-blink]').forEach((bk) => {
        bk.style.opacity = Math.floor(performance.now() / 650) % 2 ? '1' : '0.25'
      })

      const outs = document.querySelectorAll<HTMLElement>('[data-readout]')
      if (outs.length) {
        let name = ''
        document.querySelectorAll<HTMLElement>('[data-section]').forEach((sec) => {
          if (sec.getBoundingClientRect().top <= vh * 0.4) name = sec.dataset.label || sec.dataset.section || ''
        })
        outs.forEach((o) => {
          const t = o.dataset.readout
          const v =
            t === 'pct'
              ? String(Math.round(pct * 100)).padStart(3, '0') + '%'
              : t === 'section'
                ? name.toUpperCase()
                : t === 'clock'
                  ? clockFmt.format(new Date())
                  : ''
          if (o.textContent !== v) o.textContent = v
        })
      }
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('click', onClick)
      window.removeEventListener('wheel', onWheel)
    }
  }, [intensity])
}
