import { useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { certificates, education, experience, languages, otherWork, profile, skills } from '#/data/portfolio'
import { stripes } from '#/lib/os'
import type { Terminal } from '#/lib/hooks'

// A photo or screenshot: the real image when there is one, the striped placeholder otherwise.
export function Shot({
  src,
  tone,
  label,
  alt,
  className = '',
  style,
  labelClassName = 'text-[10px] text-muted',
  keepLabel = false,
}: {
  src?: string
  tone: string
  label?: ReactNode
  alt: string
  className?: string
  style?: CSSProperties
  labelClassName?: string
  // Placeholder labels disappear once a real image is set, unless kept (photo captions).
  keepLabel?: boolean
}) {
  return (
    <span className={`relative flex items-end overflow-hidden ${className}`} style={{ background: stripes(tone), ...style }}>
      {src ? (
        <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" />
      ) : (
        <span role="img" aria-label={`Placeholder: ${alt}`} className="absolute inset-0" />
      )}
      {label && (!src || keepLabel) && <span className={`relative font-mono ${labelClassName}`}>{label}</span>}
    </span>
  )
}

export function HudCorners({ size = 30, inset = 16, top = 50, bottom = 16 }: { size?: number; inset?: number; top?: number; bottom?: number }) {
  const base = 'pointer-events-none absolute border-amber'
  const s = { width: size, height: size }
  return (
    <>
      <span aria-hidden className={`${base} border-t-2 border-l-2`} style={{ ...s, left: inset, top }} />
      <span aria-hidden className={`${base} border-t-2 border-r-2`} style={{ ...s, right: inset, top }} />
      <span aria-hidden className={`${base} border-b-2 border-l-2`} style={{ ...s, left: inset, bottom }} />
      <span aria-hidden className={`${base} border-r-2 border-b-2`} style={{ ...s, right: inset, bottom }} />
    </>
  )
}

export function LogoBox({ size = 76, font = 34, style }: { size?: number; font?: number; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      className="flex items-center justify-center border-2 border-amber font-sans font-extrabold text-amber"
      style={{ width: size, height: size, fontSize: font, ...style }}
    >
      P/
    </div>
  )
}

export function Wordmark({ size }: { size: number }) {
  return (
    <div className="font-sans leading-[0.9] font-extrabold tracking-[-0.06em]" style={{ fontSize: size }}>
      POP<span className="text-signal">/</span>OS
    </div>
  )
}

export function ProgressBar({ width, value }: { width: number; value: number }) {
  return (
    <div className="h-[3px] bg-deep" style={{ width }} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-amber shadow-[0_0_12px_#efab30]" style={{ width: `${value}%` }} />
    </div>
  )
}

// ---- Terminal -------------------------------------------------------------

const ascii = ' ██████╗ \n ██╔══██╗\n ██████╔╝\n ██╔═══╝ \n ██║     \n ╚═╝     '
const swatches = ['#1c3132', '#476762', '#efab30', '#df5e00', '#f1ede4']

function Neofetch({ compact }: { compact: boolean }) {
  const rows: [string, string][] = compact
    ? [
        ['OS', 'PopOS 26.10 mobile'],
        ['User', profile.name],
        ['Role', profile.roles],
        ['Stack', 'Next.js · React · C/C++'],
      ]
    : [
        ['OS', 'PopOS 26.10 "Livno"'],
        ['User', profile.name],
        ['Role', profile.roles],
        ['Uptime', '5th year of CS, Split'],
        ['Stack', 'Next.js · React · TanStack'],
        ['Embedded', 'C · STM32 · CAN'],
        ['Lens', 'always on'],
      ]
  const pad = compact ? 7 : 10
  return (
    <div className={`my-1.5 mb-2.5 flex ${compact ? 'flex-col gap-2' : 'items-start gap-7'}`}>
      <div className={`font-bold whitespace-pre text-amber ${compact ? 'text-[11px] leading-[1.2]' : 'text-[13px] leading-[1.25]'}`}>{ascii}</div>
      <div className="flex flex-col">
        {!compact && (
          <>
            <div>
              <span className="font-bold text-amber">guest</span>@<span className="font-bold text-amber">pop-os</span>
            </div>
            <div className="text-teal">----------------------</div>
          </>
        )}
        {rows.map(([k, v]) => (
          <div key={k} className="whitespace-pre-wrap">
            <span className="text-signal">{k}</span>
            {' '.repeat(Math.max(1, pad - k.length))}
            {v}
          </div>
        ))}
        {!compact && (
          <div className="mt-2 flex">
            <span className="h-3 w-6 border border-teal bg-ink" />
            {swatches.map((c) => (
              <span key={c} className="h-3 w-6" style={{ background: c }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function TerminalBody({ term, compact = false, user = 'guest@pop-os' }: { term: Terminal; compact?: boolean; user?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div
      onClick={() => {
        if (!String(window.getSelection?.() ?? '')) inputRef.current?.focus()
      }}
      className="cursor-text select-text"
    >
      {term.lines.map((l, i) =>
        l.kind === 'in' ? (
          <div key={i} className="whitespace-pre-wrap">
            <span className="text-amber">{user}</span>
            <span className="text-mist">:~$ </span>
            {l.text}
          </div>
        ) : l.kind === 'out' ? (
          <div key={i} className="whitespace-pre-wrap" style={{ color: l.color ?? '#f1ede4' }}>
            {l.text}
          </div>
        ) : (
          <Neofetch key={i} compact={compact} />
        ),
      )}
      <form
        className="flex"
        onSubmit={(e) => {
          e.preventDefault()
          term.run(term.input)
          term.setInput('')
        }}
      >
        <label htmlFor={compact ? 'term-m' : 'term-d'} className="whitespace-pre">
          <span className="text-amber">{user}</span>
          <span className="text-mist">:~$ </span>
          <span className="sr-only">command</span>
        </label>
        <input
          id={compact ? 'term-m' : 'term-d'}
          ref={inputRef}
          value={term.input}
          onChange={(e) => term.setInput(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          enterKeyHint="send"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 font-[inherit] text-paper caret-amber outline-none focus-visible:outline-none"
        />
      </form>
    </div>
  )
}

// ---- CV document ------------------------------------------------------------

function CvHeading({ children }: { children: ReactNode }) {
  return <h3 className="m-0 border-b-2 border-ink pb-1 font-mono text-[11px] font-bold tracking-[0.1em] max-lg:text-[10px]">{children}</h3>
}

export function CvPaper({ compact = false }: { compact?: boolean }) {
  const row = compact ? 'flex flex-col' : 'grid grid-cols-[130px_1fr] gap-3.5'
  const date = compact ? 'font-mono text-[10px] font-medium text-teal' : 'font-mono text-[11px] leading-[1.8] font-medium text-teal'
  return (
    <article
      className={`flex flex-col bg-paper font-sans text-ink select-text ${compact ? 'gap-[18px] px-5 py-6' : 'gap-[22px] px-10 py-[38px]'}`}
    >
      <header>
        <h2 className={`m-0 leading-none font-extrabold tracking-[-0.03em] ${compact ? 'text-[30px]' : 'text-[38px]'}`}>{profile.name}</h2>
        <div className={`mt-1.5 ${compact ? 'text-sm' : 'text-[15px]'}`}>{profile.role}</div>
        <div className={`mt-2 font-mono leading-[1.6] font-medium text-teal ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
          {compact ? (
            <>
              {profile.email}
              <br />
              {profile.phones.join(' · ')}
              <br />
              {profile.githubLabel}
            </>
          ) : (
            <>
              {profile.email} · {profile.phones.join(' · ')}
              <br />
              {profile.githubLabel} · Split, HR / Livno, BiH
            </>
          )}
        </div>
      </header>
      <p className={`m-0 leading-[1.5] ${compact ? 'text-[13px]' : 'text-sm'}`}>{profile.summary}</p>
      <section className="flex flex-col gap-3">
        <CvHeading>EXPERIENCE</CvHeading>
        {experience.map((e) => (
          <div key={e.title + e.when} className={row}>
            <span className={date}>{e.when}</span>
            <div>
              <div className="text-[15px] font-bold">
                {e.title} <span className="font-normal">— {e.where}</span>
              </div>
              {e.text && <div className="text-[13px] leading-[1.45]">{e.text}</div>}
            </div>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-3">
        <CvHeading>EDUCATION</CvHeading>
        {education.map((e) => (
          <div key={e.title} className={row}>
            <span className={date}>{e.when}</span>
            <div>
              <div className="text-[15px] font-bold">{e.title}</div>
              <div className="text-[13px]">{e.where}</div>
            </div>
          </div>
        ))}
      </section>
      <div className={compact ? 'flex flex-col gap-[18px]' : 'grid grid-cols-2 gap-6'}>
        <section className="flex flex-col gap-2.5">
          <CvHeading>SKILLS</CvHeading>
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {skills.map((s) => (
              <li key={s} className="border border-ink px-2 py-[3px] font-mono text-[11px] font-medium max-lg:text-[10px]">
                {s}
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-2.5">
          <CvHeading>CERTIFICATES &amp; LANGUAGES</CvHeading>
          <div className="text-[13px] leading-[1.6]">
            {certificates.map((c) => (
              <div key={c}>{c}</div>
            ))}
            <div>{languages}</div>
          </div>
        </section>
      </div>
      <section className="flex flex-col gap-2.5">
        <CvHeading>OTHER WORK</CvHeading>
        <div className="text-[13px] leading-[1.6]">{otherWork.join(' · ')}</div>
      </section>
    </article>
  )
}

// ---- Mail -------------------------------------------------------------------

// There is no mail backend: sending opens the visitor's mail app with the
// message filled in.
export function useMailto() {
  const [sent, setSent] = useState(false)
  const send = (form: HTMLFormElement) => {
    const data = new FormData(form)
    const from = String(data.get('from') ?? '').trim()
    const subject = String(data.get('subject') ?? '').trim() || 'Hello from your website'
    const message = String(data.get('message') ?? '').trim()
    const body = from ? `${message}\n\n— ${from}` : message
    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }
  return { sent, send, reset: () => setSent(false) }
}

export function MailSent({ onReset, big }: { onReset: () => void; big: number }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="font-sans font-extrabold text-amber" style={{ fontSize: big }}>
        Sent ✓
      </span>
      <span className="max-w-[320px] text-xs leading-[1.6] text-muted">
        Your mail app has the message ready. You can also write to {profile.email} directly.
      </span>
      <button
        type="button"
        onClick={onReset}
        className="mt-2 h-10 cursor-pointer border border-teal bg-transparent px-3.5 font-mono text-[11px] font-medium text-paper hover:border-amber"
      >
        New message
      </button>
    </div>
  )
}
