import { useCallback, useEffect, useRef, useState } from 'react'
import { initialTerm, runCommand } from './os'
import type { AppId, TermLine } from './os'

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

// Terminal state shared by both shells: lines, the input, and the command runner.
export function useTerminal({ onOpen, onReboot }: { onOpen: (app: AppId) => void; onReboot: () => void }) {
  const [lines, setLines] = useState<TermLine[]>(initialTerm)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const run = useCallback(
    (cmd: string) => {
      const res = runCommand(cmd)
      if (res.action === 'clear') setLines([])
      else if (res.action === 'reboot') {
        setLines(initialTerm())
        onReboot()
      } else {
        setLines((l) => [...l, ...res.lines])
        if (res.open && res.open !== 'term') onOpen(res.open)
      }
    },
    [onOpen, onReboot],
  )

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  return { lines, input, setInput, run, scrollRef }
}

export type Terminal = ReturnType<typeof useTerminal>
