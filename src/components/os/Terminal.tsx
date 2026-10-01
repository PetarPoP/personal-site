import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { profile } from '#/data/portfolio'
import type { Terminal } from '#/lib/hooks'

const ascii = ' ██████╗ \n ██╔══██╗\n ██████╔╝\n ██╔═══╝ \n ██║     \n ╚═╝     '
const banner = [
  '██████╗  ██████╗ ██████╗     ██╗  ██████╗ ███████╗',
  '██╔══██╗██╔═══██╗██╔══██╗   ██╔╝ ██╔═══██╗██╔════╝',
  '██████╔╝██║   ██║██████╔╝  ██╔╝  ██║   ██║███████╗',
  '██╔═══╝ ██║   ██║██╔═══╝  ██╔╝   ██║   ██║╚════██║',
  '██║     ╚██████╔╝██║     ██╔╝    ╚██████╔╝███████║',
  '╚═╝      ╚═════╝ ╚═╝     ╚═╝      ╚═════╝ ╚══════╝',
].join('\n')
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

function Prompt({ user, cwd }: { user: string; cwd: string }) {
  return (
    <>
      <span className="text-amber">{user}</span>
      <span className="text-mist">:{cwd}$ </span>
    </>
  )
}

export function TerminalBody({
  term,
  compact = false,
  user = 'guest@pop-os',
  inputRef: externalRef,
}: {
  term: Terminal
  compact?: boolean
  user?: string
  inputRef?: RefObject<HTMLInputElement | null>
}) {
  const ownRef = useRef<HTMLInputElement>(null)
  const inputRef = externalRef ?? ownRef
  const [focused, setFocused] = useState(false)
  const [caret, setCaret] = useState(0)
  const id = compact ? 'term-m' : 'term-d'

  // Keep the block cursor where the real caret is, including after ↑/↓ and Tab.
  useEffect(() => {
    setCaret(inputRef.current?.selectionStart ?? term.input.length)
  }, [term.input, inputRef])

  const runAndFocus = (cmd: string) => {
    term.run(cmd)
    if (!compact) inputRef.current?.focus()
  }

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        if (!String(window.getSelection?.() ?? '')) inputRef.current?.focus()
      }}
      className="cursor-text select-text"
    >
      {term.lines.map((l, i) =>
        l.kind === 'in' ? (
          <div key={i} className="whitespace-pre-wrap">
            <Prompt user={user} cwd={l.cwd} />
            {l.text}
          </div>
        ) : l.kind === 'out' ? (
          l.cmd ? (
            <button
              key={i}
              type="button"
              title={`run: ${l.cmd}`}
              onClick={() => runAndFocus(l.cmd!)}
              className="block w-full cursor-pointer border-0 bg-transparent p-0 text-left font-[inherit] whitespace-pre-wrap hover:bg-deep hover:underline"
              style={{ color: l.color ?? '#f1ede4' }}
            >
              {l.text}
            </button>
          ) : (
            <div key={i} className="whitespace-pre-wrap" style={{ color: l.color ?? '#f1ede4' }}>
              {l.text || ' '}
            </div>
          )
        ) : l.kind === 'table' ? (
          <div key={i} className="my-1">
            {l.title && <div className="text-amber">{l.title}</div>}
            <div className={`grid grid-cols-[max-content_minmax(0,1fr)] ${compact ? 'gap-x-3' : 'gap-x-6'}`}>
              {l.rows.map((r, j) => {
                if ('heading' in r)
                  return (
                    <div key={j} className={`col-span-2 text-amber ${j > 0 ? 'mt-1.5' : ''}`}>
                      {r.heading}
                    </div>
                  )
                const cells = (
                  <>
                    <span className="pl-2 whitespace-pre text-paper">{r.left}</span>
                    <span className="whitespace-pre-wrap text-muted">{r.right}</span>
                  </>
                )
                return r.cmd ? (
                  <button
                    key={j}
                    type="button"
                    title={`run: ${r.cmd}`}
                    onClick={() => runAndFocus(r.cmd!)}
                    className="col-span-2 grid cursor-pointer grid-cols-subgrid border-0 bg-transparent p-0 text-left font-[inherit] hover:bg-deep [&:hover>span:first-child]:text-amber"
                  >
                    {cells}
                  </button>
                ) : (
                  <div key={j} className="col-span-2 grid grid-cols-subgrid">
                    {cells}
                  </div>
                )
              })}
            </div>
          </div>
        ) : l.kind === 'neo' ? (
          <Neofetch key={i} compact={compact} />
        ) : (
          <div key={i} className={`my-2 overflow-hidden font-bold whitespace-pre text-amber ${compact ? 'text-[6px] leading-[1.15]' : 'text-[11px] leading-[1.15]'}`}>
            {banner}
          </div>
        ),
      )}
      <form
        className="flex"
        onSubmit={(e) => {
          e.preventDefault()
          term.run(term.input)
        }}
      >
        <label htmlFor={id} className="whitespace-pre">
          <Prompt user={user} cwd={term.cwd} />
          <span className="sr-only">command</span>
        </label>
        <span className="relative min-w-0 flex-1">
          <input
            id={id}
            ref={inputRef}
            value={term.input}
            onChange={(e) => term.setInput(e.target.value)}
            onKeyDown={term.onKeyDown}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            enterKeyHint="send"
            placeholder={focused ? '' : 'click here and type a command…'}
            className="w-full border-0 bg-transparent p-0 font-[inherit] text-paper caret-transparent outline-none placeholder:text-teal focus-visible:outline-none"
          />
          {focused && (
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 whitespace-pre text-transparent">
              {term.input.slice(0, caret)}
              <span className="term-cursor">{term.input[caret] ?? ' '}</span>
            </span>
          )}
        </span>
      </form>
    </div>
  )
}
