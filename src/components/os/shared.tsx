import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { certificates, education, experience, languages, otherWork, profile, skills } from '#/data/portfolio'
import { sendMail } from '#/lib/mail'
import { stripes } from '#/lib/os'
import { toast } from './Toaster'

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
  contain = false,
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
  // Show the whole image (photo viewers) instead of filling the box.
  contain?: boolean
}) {
  return (
    <span className={`relative flex items-end overflow-hidden ${className}`} style={{ background: stripes(tone), ...style }}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" decoding="async" className={`absolute inset-0 size-full ${contain ? 'bg-ink object-contain' : 'object-cover'}`} />
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

// ---- CV document ------------------------------------------------------------

// The CV exactly as the PDF looks (a rendered page), with the same text underneath for
// screen readers and search engines.
export type CvLang = 'EN' | 'HR'
export function CvDocument({ lang }: { lang: CvLang }) {
  const cv = profile.cvs.find((c) => c.lang === lang) ?? profile.cvs[0]
  return (
    <figure className="m-0">
      <img
        src={cv.href.replace(/\.pdf$/, '.png')}
        width={1700}
        height={2200}
        alt={`${profile.name} — CV (${cv.label})`}
        className="block h-auto w-full bg-white shadow-[0_10px_30px_rgba(0,0,0,.35)]"
      />
      <div className="sr-only">
        <CvPaper />
      </div>
    </figure>
  )
}

export function CvLangSwitch({ lang, setLang }: { lang: CvLang; setLang: (l: CvLang) => void }) {
  return (
    <div role="group" aria-label="CV language" className="flex">
      {profile.cvs.map((c) => (
        <button
          key={c.lang}
          type="button"
          aria-pressed={c.lang === lang}
          onClick={() => setLang(c.lang as CvLang)}
          className={`cursor-pointer border px-2.5 py-[5px] font-mono text-[11px] font-bold ${c.lang === lang ? 'border-amber bg-amber text-ink' : 'border-teal bg-transparent text-paper hover:border-amber'}`}
        >
          {c.lang}
        </button>
      ))}
    </div>
  )
}

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

// Sends the Mail form through the server and confirms with a toast.
export function useMail() {
  const [sending, setSending] = useState(false)
  const send = async (form: HTMLFormElement) => {
    if (sending) return
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>
    setSending(true)
    try {
      const res = await sendMail({ data })
      if (res.ok) {
        toast.success('Message sent', { description: `Petar will reply to ${data.from}.` })
        form.reset()
      } else toast.error(res.error)
    } catch {
      toast.error(`Couldn't send right now. Write to ${profile.email} directly.`)
    } finally {
      setSending(false)
    }
  }
  return { sending, send }
}

// Hidden from people; bots that fill every field get ignored by the server.
export function Honeypot() {
  return <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />
}
