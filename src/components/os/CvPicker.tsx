import { createContext, useCallback, useContext, useRef } from 'react'
import type { ReactNode } from 'react'
import { profile } from '#/data/portfolio'

// Every "Download CV" button opens one picker that asks for the language first.
const CvPickerContext = createContext<() => void>(() => {})
export const useCvPicker = () => useContext(CvPickerContext)

export function CvPickerProvider({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const open = useCallback(() => dialog.current?.showModal(), [])
  const close = () => dialog.current?.close()

  return (
    <CvPickerContext.Provider value={open}>
      {children}
      <dialog
        ref={dialog}
        aria-labelledby="cv-dialog-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) close()
        }}
        className="m-auto w-[min(400px,calc(100%-32px))] border border-amber bg-ink p-0 font-mono text-paper shadow-[0_24px_60px_rgba(0,0,0,.55)] backdrop:bg-ink/75 backdrop:backdrop-blur-sm"
      >
        <div className="flex h-[34px] items-center gap-2.5 bg-deep pr-[5px] pl-3 text-xs font-medium">
          <span className="size-2 bg-amber" />
          <span id="cv-dialog-title" className="flex-1">
            Download CV — choose language
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="h-6 w-[26px] cursor-pointer border border-teal bg-transparent text-xs text-paper hover:border-signal hover:bg-signal hover:text-ink"
          >
            ×
          </button>
        </div>
        <div className="flex flex-col p-2">
          {profile.cvs.map((cv) => (
            <a
              key={cv.lang}
              href={cv.href}
              download={cv.file}
              onClick={close}
              className="group flex items-center justify-between gap-4 px-3 py-3.5 text-paper no-underline hover:bg-deep"
            >
              <span className="flex items-baseline gap-3.5">
                <span className="text-[13px] font-bold text-amber">[{cv.lang}]</span>
                <span className="font-sans text-lg font-semibold">{cv.label}</span>
              </span>
              <span className="text-[11px] text-dim group-hover:text-amber">{cv.file} ↓</span>
            </a>
          ))}
        </div>
      </dialog>
    </CvPickerContext.Provider>
  )
}
