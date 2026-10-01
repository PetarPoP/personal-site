import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { profile } from '#/data/portfolio'
import { complete, initialTerm, runCommand } from './terminal'
import type { TermLine } from './terminal'
import type { AppId } from './os'
import { toast } from 'sonner'
import { setAdminKey } from './useNotes'

// Current time, ticking every 500ms. Null during SSR and the first render so
// server and client markup match.
export function useNow() {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])
  return now
}

export const blinkOn = (now: number | null) => (now === null ? true : Math.floor(now / 500) % 2 === 1)

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState<boolean | null>(null)
  useEffect(() => {
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const on = () => setMatches(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return matches
}

const BOOTED_KEY = 'popos-booted'

// Returning visitors (this tab session) and reduced-motion users skip the boot.
export function shouldSkipBoot() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
  try {
    return sessionStorage.getItem(BOOTED_KEY) === '1'
  } catch {
    return false
  }
}

export function markBooted() {
  try {
    sessionStorage.setItem(BOOTED_KEY, '1')
  } catch {
    // Storage can be blocked; the boot just plays again next time.
  }
}

// Terminal state shared by both shells: lines, input, cwd, history and the
// keyboard handling (↑/↓ history, Tab completion, Ctrl+L, Ctrl+C).
export function useTerminal({
  onOpen,
  onReboot,
  onExit,
}: {
  onOpen: (app: AppId) => void
  onReboot: () => void
  onExit: () => void
}) {
  const [lines, setLines] = useState<TermLine[]>(initialTerm)
  const [input, setInput] = useState('')
  const [cwd, setCwd] = useState('~')
  const history = useRef<string[]>([])
  const histIdx = useRef(-1)
  const startedAt = useRef(Date.now())
  const scrollRef = useRef<HTMLDivElement>(null)

  const run = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim()
      if (trimmed && history.current[history.current.length - 1] !== trimmed) history.current.push(trimmed)
      histIdx.current = -1
      setInput('')
      const res = runCommand(cmd, { cwd, history: history.current, startedAt: startedAt.current, now: Date.now() })
      if (res.action === 'clear') return setLines([])
      // The shell remounts the terminal under the boot screen, so nothing to reset here.
      if (res.action === 'reboot') return onReboot()
      setLines((l) => [...l, ...res.lines])
      setCwd(res.cwd)
      const fx = res.effect
      if (!fx) return
      if (fx.open && fx.open !== 'term') onOpen(fx.open)
      if (fx.url) window.open(fx.url, '_blank', 'noopener')
      if (fx.download) {
        const cv = profile.cvs.find((c) => c.lang === fx.download)
        if (cv) {
          const a = document.createElement('a')
          a.href = cv.href
          a.download = cv.file
          a.click()
          toast.success(`Downloading ${cv.file}`)
        }
      }
      if (fx.admin !== undefined) {
        setAdminKey(fx.admin)
        toast.success(fx.admin ? 'Admin key saved in this browser' : 'Admin key removed')
      }
      if (fx.exit) onExit()
    },
    [cwd, onOpen, onReboot, onExit],
  )

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const h = history.current
    if (e.key === 'ArrowUp' && h.length) {
      e.preventDefault()
      histIdx.current = histIdx.current < 0 ? h.length - 1 : Math.max(0, histIdx.current - 1)
      setInput(h[histIdx.current])
    } else if (e.key === 'ArrowDown' && histIdx.current >= 0) {
      e.preventDefault()
      histIdx.current += 1
      if (histIdx.current >= h.length) {
        histIdx.current = -1
        setInput('')
      } else setInput(h[histIdx.current])
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const { value, options } = complete(input, cwd)
      setInput(value)
      if (options.length > 1)
        setLines((l) => [...l, { kind: 'in', text: input, cwd }, { kind: 'out', text: options.join('   '), color: '#8fb3ad' }])
    } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault()
      setLines([])
    } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      if (window.getSelection?.()?.toString()) return
      e.preventDefault()
      setLines((l) => [...l, { kind: 'in', text: input + '^C', cwd }])
      setInput('')
    }
  }

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  const reset = useCallback(() => {
    setLines(initialTerm())
    setInput('')
    setCwd('~')
    history.current = []
    histIdx.current = -1
    startedAt.current = Date.now()
  }, [])

  return { lines, input, setInput, cwd, run, reset, onKeyDown, scrollRef }
}

export type Terminal = ReturnType<typeof useTerminal>
