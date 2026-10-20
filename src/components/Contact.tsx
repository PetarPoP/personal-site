import { useEffect, useId, useRef, useState } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { profile } from '#/data/portfolio'
import { sendMessage } from '#/lib/contact'

// The contact form, opened by every "Email me" link (without JavaScript those links are plain
// mailto: links). It rises over a blurred page, the fields follow one after another, and a
// sent message ends on a check mark that draws itself.

const OPEN = 'contact:open'

export const openContact = (e?: React.MouseEvent) => {
  e?.preventDefault()
  window.dispatchEvent(new Event(OPEN))
}

type State = 'idle' | 'sending' | 'sent'

export function ContactDialog({ onLock }: { onLock: (locked: boolean) => void }) {
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState('')
  const panel = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLElement | null>(null)
  const title = useId()

  useEffect(() => {
    const open = () => {
      back.current = document.activeElement as HTMLElement | null
      setMounted(true)
    }
    window.addEventListener(OPEN, open)
    return () => window.removeEventListener(OPEN, open)
  }, [])

  // Mounted first, then shown on the next frame, so the entrance animates.
  useEffect(() => {
    if (!mounted) return
    onLock(true)
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
    const t = window.setTimeout(() => panel.current?.querySelector<HTMLElement>('input:not([tabindex="-1"])')?.focus({ preventScroll: true }), 120)
    return () => {
      cancelAnimationFrame(id)
      window.clearTimeout(t)
      onLock(false)
    }
  }, [mounted, onLock])

  const close = () => {
    setShown(false)
    window.setTimeout(() => {
      setMounted(false)
      if (state === 'sent') setState('idle')
      setError('')
      back.current?.focus({ preventScroll: true })
    }, 380)
  }

  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const form = e.currentTarget
    setState('sending')
    setError('')
    try {
      const r = await sendMessage({ data: { name: String(f.get('name')), email: String(f.get('email')), message: String(f.get('message')), website: String(f.get('website') ?? '') } })
      if (r.ok) {
        setState('sent')
        form.reset()
      } else {
        setState('idle')
        setError(r.error)
      }
    } catch {
      setState('idle')
      setError('Something went wrong.')
    }
  }

  if (!mounted) return null
  // Each field rises a moment after the one above it.
  const step = (i: number) => ({
    className: `transition-[opacity,translate] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`,
    style: { transitionDelay: shown ? `${140 + i * 60}ms` : '0ms' },
  })
  const field =
    'w-full border-0 border-b-2 border-ink/25 bg-transparent px-0 py-2.5 text-[18px] text-ink outline-none transition-colors placeholder:text-muted/50 focus:border-teal'
  const label = 'font-mono text-[11px] font-semibold tracking-[.1em] text-teal-2 uppercase'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" data-lenis-prevent>
      <div
        aria-hidden
        onClick={close}
        className={`absolute inset-0 bg-[#0d2624]/55 backdrop-blur-[6px] transition-opacity duration-400 ${shown ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title}
        className={`relative max-h-[100svh] w-full max-w-[560px] overflow-y-auto border border-ink bg-sand p-[clamp(24px,5vw,44px)] text-ink shadow-[0_30px_80px_rgba(13,38,36,.45)] transition-[opacity,translate,scale] duration-500 ease-[cubic-bezier(.2,.9,.25,1)] ${
          shown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-10 scale-[.97] opacity-0'
        }`}
      >
        <button type="button" onClick={close} aria-label="Close" className="absolute top-4 right-4 cursor-pointer border-0 bg-transparent p-1.5 text-ink transition-[rotate,color] duration-300 hover:rotate-90 hover:text-teal">
          <X size={22} strokeWidth={1.75} />
        </button>

        {state === 'sent' ? (
          <div className="flex flex-col items-start gap-5 py-6">
            <svg viewBox="0 0 52 52" className="size-16 text-teal" aria-hidden>
              <circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2.5" className="draw" style={{ '--len': 151 } as React.CSSProperties} />
              <path d="M15 27l7 7 15-16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" className="draw" style={{ '--len': 36, animationDelay: '.35s' } as React.CSSProperties} />
            </svg>
            <h2 id={title} className="m-0 text-[clamp(30px,4vw,40px)] leading-none font-semibold tracking-[-.035em]">
              Thanks, it’s on its way.
            </h2>
            <p className="m-0 text-[17px] leading-normal text-muted">I’ll read it and write back to the address you gave.</p>
            <button type="button" onClick={close} className="mt-2 cursor-pointer border-0 bg-transparent p-0 text-[17px] font-semibold text-ink underline decoration-2 underline-offset-[6px] transition-colors hover:text-teal">
              Back to the site
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-6">
            <div {...step(0)}>
              <span className={label}>Contact</span>
              <h2 id={title} className="m-0 mt-2 text-[clamp(34px,5vw,48px)] leading-[.95] font-semibold tracking-[-.04em]">
                Let’s talk.
              </h2>
            </div>
            <label {...step(1)}>
              <span className={label}>Name</span>
              <input name="name" required maxLength={120} autoComplete="name" placeholder="Your name" className={field} />
            </label>
            <label {...step(2)}>
              <span className={label}>Email</span>
              <input name="email" type="email" required maxLength={200} autoComplete="email" placeholder="you@company.com" className={field} />
            </label>
            <label {...step(3)}>
              <span className={label}>Message</span>
              <textarea name="message" required maxLength={5000} rows={4} placeholder="What are you working on?" className={`${field} resize-none`} />
            </label>
            {/* Hidden from people; bots fill it in. */}
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-px w-px opacity-0" />
            <div {...step(4)}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                  type="submit"
                  disabled={state === 'sending'}
                  className="group flex cursor-pointer items-center gap-2 border border-ink bg-deep px-6 py-3.5 text-[17px] font-semibold text-paper transition-[background-color,translate] hover:-translate-y-0.5 hover:bg-teal-2 disabled:cursor-wait disabled:opacity-70"
                >
                  {state === 'sending' ? 'Sending…' : 'Send message'}
                  <ArrowUpRight size={18} strokeWidth={2} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
                <a href={`mailto:${profile.email}`} className="text-[15px] text-muted underline decoration-1 underline-offset-4 transition-colors hover:text-teal">
                  or email {profile.email}
                </a>
              </div>
              {error && (
                <p role="alert" className="m-0 mt-4 text-[15px] font-medium text-coral-2">
                  {error}
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
