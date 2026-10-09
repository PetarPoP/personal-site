import { createServerFn } from '@tanstack/react-start'
import { profile } from '#/data/portfolio'

// Petar's public GitHub repositories, read from GitHub's API with the GITHUB_TOKEN secret, so a
// project card only links to a repo that is really public and can show when it last changed.

export type Repo = { url: string; stars: number; pushed: string }
export type RepoMap = { repos: Record<string, Repo> } | { error: string }

const user = profile.github.replace(/\/+$/, '').split('/').pop()!

type ApiRepo = { name: string; html_url: string; stargazers_count: number; pushed_at: string; private: boolean }

// Kept for ten minutes per Worker, which stays far under GitHub's rate limits.
let cache: { at: number; repos: Record<string, Repo> } | null = null
const TTL = 10 * 60 * 1000

export const getRepos = createServerFn({ method: 'GET' }).handler(async (): Promise<RepoMap> => {
  if (cache && Date.now() - cache.at < TTL) return { repos: cache.repos }
  const token = process.env.GITHUB_TOKEN?.trim().replace(/^(['"])(.*)\1$/, '$2')
  try {
    const res = await fetch(`https://api.github.com/users/${user}/repos?type=owner&per_page=100`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'petarpopovic.com',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
    const repos: Record<string, Repo> = {}
    for (const r of (await res.json()) as ApiRepo[]) {
      if (!r.private) repos[r.name.toLowerCase()] = { url: r.html_url, stars: r.stargazers_count, pushed: r.pushed_at }
    }
    cache = { at: Date.now(), repos }
    return { repos }
  } catch (e) {
    // An older list beats an error while GitHub is down or rate limited.
    if (cache) return { repos: cache.repos }
    return { error: e instanceof Error ? e.message : "Couldn't reach GitHub." }
  }
})
