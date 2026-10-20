import { createServerFn } from '@tanstack/react-start'
import { profile } from '#/data/portfolio'
import { rankProjects } from '#/lib/projects'
import type { RankedProject } from '#/lib/projects'

// Petar's public GitHub repositories and activity, read from GitHub's API with the GITHUB_TOKEN
// secret. The project list and the CV are ranked from this (src/lib/projects.ts).

export type Repo = {
  name: string
  url: string
  description: string
  stars: number
  pushed: string
  // Bytes of code per language, as GitHub counts it (vendored and generated files left out).
  languages: Record<string, number>
}

type ApiRepo = {
  name: string
  html_url: string
  description: string | null
  stargazers_count: number
  pushed_at: string
  private: boolean
  fork: boolean
  archived: boolean
}

const user = profile.github.replace(/\/+$/, '').split('/').pop()!

const headers = () => {
  const token = process.env.GITHUB_TOKEN?.trim().replace(/^(['"])(.*)\1$/, '$2')
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'petarpopovic.com',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const api = async <T,>(path: string): Promise<T> => {
  const res = await fetch(`https://api.github.com${path}`, { headers: headers() })
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
  return res.json() as Promise<T>
}

// Kept for ten minutes per Worker, which stays far under GitHub's rate limits.
const TTL = 10 * 60 * 1000
let repoCache: { at: number; repos: Repo[] } | null = null

// Public repos that are Petar's own work (no forks or archived ones), with their languages.
export async function fetchRepos(): Promise<Repo[]> {
  if (repoCache && Date.now() - repoCache.at < TTL) return repoCache.repos
  if (process.env.NODE_ENV !== 'production' && process.env.GITHUB_MOCK) return (await import('#/lib/github-mock')).mockRepos
  try {
    const list = (await api<ApiRepo[]>(`/users/${user}/repos?type=owner&per_page=100`)).filter((r) => !r.private && !r.fork && !r.archived)
    const repos = await Promise.all(
      list.map(async (r) => ({
        name: r.name,
        url: r.html_url,
        description: r.description ?? '',
        stars: r.stargazers_count,
        pushed: r.pushed_at,
        languages: await api<Record<string, number>>(`/repos/${user}/${r.name}/languages`).catch(() => ({})),
      })),
    )
    repoCache = { at: Date.now(), repos }
    return repos
  } catch (e) {
    // An older list beats an error while GitHub is down or rate limited.
    if (repoCache) return repoCache.repos
    throw e
  }
}

export type ProjectList = { projects: RankedProject[] } | { error: string }

export const getProjects = createServerFn({ method: 'GET' }).handler(async (): Promise<ProjectList> => {
  try {
    return { projects: rankProjects(await fetchRepos()) }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't reach GitHub." }
  }
})

// Contributions per day for the last year, for the small activity graph.
export type Activity = { total: number; days: { date: string; count: number }[] } | { error: string }

let activityCache: { at: number; activity: Activity } | null = null

export const getActivity = createServerFn({ method: 'GET' }).handler(async (): Promise<Activity> => {
  if (activityCache && Date.now() - activityCache.at < TTL) return activityCache.activity
  if (process.env.NODE_ENV !== 'production' && process.env.GITHUB_MOCK) return (await import('#/lib/github-mock')).mockActivity()
  try {
    // The contribution calendar is only in GitHub's GraphQL API, which needs the token.
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar {
          totalContributions weeks { contributionDays { date contributionCount } } } } } }`,
        variables: { login: user },
      }),
    })
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
    const body = (await res.json()) as {
      data?: { user?: { contributionsCollection: { contributionCalendar: { totalContributions: number; weeks: { contributionDays: { date: string; contributionCount: number }[] }[] } } } }
    }
    const cal = body.data?.user?.contributionsCollection.contributionCalendar
    if (!cal) throw new Error('GitHub sent no calendar.')
    const activity = {
      total: cal.totalContributions,
      days: cal.weeks.flatMap((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))),
    }
    activityCache = { at: Date.now(), activity }
    return activity
  } catch (e) {
    if (activityCache) return activityCache.activity
    return { error: e instanceof Error ? e.message : "Couldn't reach GitHub." }
  }
})
