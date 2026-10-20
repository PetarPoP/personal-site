import { projects } from '#/data/portfolio'
import type { Project, ProjectKind } from '#/data/portfolio'
import type { Repo } from '#/lib/github'

// One ranking for the project list and the CV. Projects with public code come first, best
// first: more code and more recent work score higher. A new public repo joins on its own, named
// from GitHub. Projects without public code keep the order they have in portfolio.ts, at the end.

export type RankedProject = Project & { url?: string; pushed?: string; score?: number }

// ~1 point per 10x more code (10 KB ≈ 4, 100 KB ≈ 5, 1 MB ≈ 6), plus up to 2 points for
// recent work, halving about every six months.
export function score(repo: Repo, now = Date.now()) {
  const bytes = Object.values(repo.languages).reduce((a, b) => a + b, 0)
  const months = Math.max(0, (now - Date.parse(repo.pushed)) / (30.4 * 864e5))
  return Math.log10(bytes + 1) + 2 * Math.pow(0.5, months / 6)
}

const EMBEDDED = new Set(['C', 'C++', 'Assembly', 'Arduino', 'Makefile', 'CMake'])

// "zlatarna-popovic" → "Zlatarna popovic", "IdeaPlanner" stays.
const title = (name: string) => {
  const words = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[-_\s]+/)
    .filter(Boolean)
  if (words.length === 1) return name
  const s = words.join(' ').toLowerCase()
  return s[0].toUpperCase() + s.slice(1)
}

function fromRepo(repo: Repo): Project {
  const langs = Object.entries(repo.languages).sort((a, b) => b[1] - a[1])
  const kind: ProjectKind = langs.length && EMBEDDED.has(langs[0][0]) ? 'embedded' : 'web'
  const stack = langs.slice(0, 3).map(([l]) => l).join(' · ')
  return {
    name: title(repo.name),
    kind,
    stack: stack || 'Code',
    desc: repo.description || (langs.length ? `A ${langs[0][0]} project.` : 'A project on GitHub.'),
    repo: repo.name,
  }
}

export function rankProjects(repos: Repo[], now = Date.now()): RankedProject[] {
  const byName = new Map(repos.map((r) => [r.name.toLowerCase(), r]))
  const curated = new Set(projects.flatMap((p) => (p.repo ? [p.repo.toLowerCase()] : [])))
  const live: RankedProject[] = []
  const rest: RankedProject[] = []
  for (const p of projects) {
    const r = p.repo ? byName.get(p.repo.toLowerCase()) : undefined
    // A repo that went private or was deleted drops to the end with the others without code.
    if (r) live.push({ ...p, url: r.url, pushed: r.pushed, score: score(r, now) })
    else rest.push({ ...p, repo: undefined })
  }
  for (const r of repos) if (!curated.has(r.name.toLowerCase())) live.push({ ...fromRepo(r), url: r.url, pushed: r.pushed, score: score(r, now) })
  live.sort((a, b) => b.score! - a.score!)
  return [...live, ...rest]
}
