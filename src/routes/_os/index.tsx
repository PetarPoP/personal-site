import { createFileRoute, redirect } from '@tanstack/react-router'
import { appSlugs } from '#/lib/os'
import { site } from '#/lib/seo'

// The home screen. Old links like /?app=projects go to the app's own address.
export const Route = createFileRoute('/_os/')({
  validateSearch: (search: Record<string, unknown>): { app?: string } =>
    typeof search.app === 'string' && appSlugs.includes(search.app) ? { app: search.app } : {},
  beforeLoad: ({ search }) => {
    if (search.app) throw redirect({ to: '/$app', params: { app: search.app }, replace: true })
  },
  head: () => ({
    meta: [{ property: 'og:url', content: `${site.url}/` }],
    links: [{ rel: 'canonical', href: `${site.url}/` }],
  }),
})
