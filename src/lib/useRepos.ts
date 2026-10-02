import { useEffect, useState } from 'react'
import { getRepos } from './github'
import type { Repo, RepoList } from './github'

type State = { repos: Repo[]; loading: boolean; error?: string }

// Asked once per page load and shared by the desktop and phone shells.
let request: Promise<RepoList> | null = null
let settled: State | null = null

export function useRepos(active = true): State {
  const [state, setState] = useState<State>(settled ?? { repos: [], loading: true })
  useEffect(() => {
    if (!active || settled) return
    let alive = true
    request ??= getRepos()
    request
      .then((res): State => {
        if ('error' in res) {
          request = null
          return { repos: [], loading: false, error: res.error }
        }
        return (settled = { repos: res.repos, loading: false })
      })
      .catch((): State => {
        request = null
        return { repos: [], loading: false, error: "Couldn't reach GitHub." }
      })
      .then((s) => alive && setState(s))
    return () => {
      alive = false
    }
  }, [active])
  return settled ?? state
}

// "Mar 2025", for when a repo was made.
export const repoDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
