import { createFileRoute, notFound } from '@tanstack/react-router'
import { appFromSlug } from '#/lib/os'
import { appHead } from '#/lib/seo'

// /projects, /photos, /cv, … open that window or app inside POP/OS (the _os layout draws it).
export const Route = createFileRoute('/_os/$app')({
  beforeLoad: ({ params }) => {
    if (!appFromSlug(params.app)) throw notFound()
  },
  head: ({ params }) => appHead(params.app),
})
