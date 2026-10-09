import { createFileRoute } from '@tanstack/react-router'
import { Site } from '#/components/Site'
import { site } from '#/lib/seo'

export const Route = createFileRoute('/')({
  component: Site,
  head: () => ({
    meta: [{ property: 'og:url', content: `${site.url}/` }],
    links: [{ rel: 'canonical', href: `${site.url}/` }],
  }),
})
