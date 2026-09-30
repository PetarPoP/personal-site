import { useRef } from 'react'
import { profile } from '#/data/portfolio'

const buttonClass =
  'bg-amber px-[18px] py-3 font-mono text-[13px] font-bold text-ink uppercase transition-colors hover:bg-[color-mix(in_srgb,var(--color-amber)_80%,#fff)]'

function Corner({ className }: { className: string }) {
  return <span aria-hidden="true" className={`absolute size-4 border-amber ${className}`} />
}

// "Download CV.pdf" asks which language the visitor wants before downloading.
export function CvDownload() {
  const dialog = useRef<HTMLDialogElement>(null)
  const close = () => dialog.current?.close()

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={`cursor-pointer border-0 ${buttonClass}`}>
        Download CV.pdf ↓
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="cv-dialog-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) close()
        }}
        className="m-auto w-[min(420px,calc(100%-32px))] overflow-visible border border-teal bg-ink p-0 text-paper backdrop:bg-ink/80 backdrop:backdrop-blur-sm"
      >
        <Corner className="-top-1.5 -left-1.5 border-t-2 border-l-2" />
        <Corner className="-top-1.5 -right-1.5 border-t-2 border-r-2" />
        <Corner className="-bottom-1.5 -left-1.5 border-b-2 border-l-2" />
        <Corner className="-right-1.5 -bottom-1.5 border-r-2 border-b-2" />
        <div className="flex flex-col gap-6 p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="m-0 mb-2.5 font-mono text-xs font-medium text-amber">// select language</p>
              <h3 id="cv-dialog-title" className="m-0 text-[32px] leading-[0.95] font-bold tracking-[-0.04em]">
                DOWNLOAD CV
              </h3>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="shrink-0 cursor-pointer border border-teal bg-transparent whitespace-nowrap px-2.5 py-1.5 font-mono text-[11px] font-medium text-dim uppercase transition-colors hover:border-amber hover:text-amber"
            >
              Esc ✕
            </button>
          </div>
          <div className="flex flex-col border-t border-teal">
            {profile.cvs.map((cv) => (
              <a
                key={cv.lang}
                href={cv.href}
                download={cv.file}
                onClick={close}
                className="group flex items-center justify-between gap-4 border-b border-deep px-3 py-4 text-paper no-underline transition-colors hover:bg-deep"
              >
                <span className="flex items-baseline gap-4">
                  <span className="font-mono text-[13px] font-bold text-amber">[{cv.lang}]</span>
                  <span className="text-xl font-semibold">{cv.label}</span>
                </span>
                <span className="font-mono text-xs text-dim uppercase group-hover:text-amber">PDF ↓</span>
              </a>
            ))}
          </div>
        </div>
      </dialog>
    </>
  )
}
