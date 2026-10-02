import { createServerFn } from '@tanstack/react-start'
import { profile } from '#/data/portfolio'

// Petar's public GitHub repositories, read live from GitHub's API, so a new repo shows up in
// ~/projects without touching the site. Newest first; forks are left out.

export type Repo = {
  name: string
  desc: string
  language: string | null
  stars: number
  url: string
  created: string
  pushed: string
}
export type RepoList = { repos: Repo[] } | { error: string }

const user = profile.github.replace(/\/+$/, '').split('/').pop()!

type ApiRepo = {
  name: string
  description: string | null
  language: string | null
  stargazers_count: number
  html_url: string
  created_at: string
  pushed_at: string
  fork: boolean
}

// Without a token GitHub allows 60 requests an hour per server, so the list is kept for ten
// minutes. GITHUB_TOKEN (optional, no scopes needed) raises that limit.
let cache: { at: number; list: Repo[] } | null = null
const TTL = 10 * 60 * 1000

export const getRepos = createServerFn({ method: 'GET' }).handler(async (): Promise<RepoList> => {
  if (cache && Date.now() - cache.at < TTL) return { repos: cache.list }
  const token = process.env.GITHUB_TOKEN?.trim()
  try {
    const res = await fetch(`https://api.github.com/users/${user}/repos?type=owner&sort=created&direction=desc&per_page=100`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'pop-os-portfolio/1.0',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
    const list = ((await res.json()) as ApiRepo[])
      .filter((r) => !r.fork)
      .map((r) => ({
        name: r.name,
        desc: r.description ?? '',
        language: r.language,
        stars: r.stargazers_count,
        url: r.html_url,
        created: r.created_at,
        pushed: r.pushed_at,
      }))
      .sort((a, b) => b.created.localeCompare(a.created))
    cache = { at: Date.now(), list }
    return { repos: list }
  } catch (e) {
    // An older list beats an error while GitHub is down or rate limited.
    if (cache) return { repos: cache.list }
    return { error: e instanceof Error ? e.message : "Couldn't reach GitHub." }
  }
})
