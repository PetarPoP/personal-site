import { useEffect, useState } from 'react'
import { profile } from '#/data/portfolio'
import { getActivity } from '#/lib/github'

type Days = { date: string; count: number }[]

const LEVELS = ['bg-ink/[.07]', 'bg-teal/35', 'bg-teal/65', 'bg-teal', 'bg-deep']

// A small GitHub contribution graph: one square per day for the last year, a column per week.
// Narrow screens show only the newest weeks. The box keeps its height while loading, so nothing
// below it moves.
export function Activity() {
  const [data, setData] = useState<{ total: number; days: Days } | null>(null)
  useEffect(() => {
    let alive = true
    getActivity()
      .then((a) => alive && 'days' in a && setData(a))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const days = data?.days ?? []
  // Levels split the busy days into quarters, like GitHub's own graph.
  const counts = days.map((d) => d.count).filter(Boolean).sort((a, b) => a - b)
  const q = (p: number) => counts[Math.floor(p * (counts.length - 1))] ?? 1
  const cut = [q(0.25), q(0.5), q(0.75)]
  const level = (n: number) => (n === 0 ? 0 : n <= cut[0] ? 1 : n <= cut[1] ? 2 : n <= cut[2] ? 3 : 4)
  // Empty cells before the first day, so each column starts on a Sunday.
  const pad = days.length ? new Date(`${days[0].date}T00:00:00Z`).getUTCDay() : 0

  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-10 gap-y-5 transition-opacity duration-700 ${data ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!data}>
      <div className="flex flex-col gap-1.5">
        <span className="text-[clamp(20px,1.8vw,24px)] leading-tight font-semibold tracking-[-.02em]">
          {data ? `${data.total.toLocaleString('en-GB')} contributions` : '\u00a0'}
        </span>
        <span className="text-[15px] text-muted">
          on GitHub in the last year ·{' '}
          <a href={profile.github} target="_blank" rel="noreferrer" className="text-muted underline decoration-1 underline-offset-4 transition-colors hover:text-teal">
            see my profile
          </a>
        </span>
      </div>
      {/* Right-aligned and clipped, so a narrow screen drops the oldest weeks. */}
      <div className="flex h-[88px] max-w-full justify-end overflow-hidden">
        <div className="grid shrink-0 grid-flow-col grid-rows-7 gap-[3px]">
          {Array.from({ length: pad }, (_, i) => (
            <span key={`p${i}`} />
          ))}
          {days.map((d) => (
            <span key={d.date} title={`${d.count} on ${d.date}`} className={`size-[10px] ${LEVELS[level(d.count)]}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
