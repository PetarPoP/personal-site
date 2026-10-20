import { createFileRoute } from '@tanstack/react-router'
import { cvResponse } from '#/lib/cv/response'

// /petar-popovic-cv-en.pdf: the English CV, built from live data on each download (src/lib/cv).
export const Route = createFileRoute('/petar-popovic-cv-en.pdf')({
  server: { handlers: { GET: () => cvResponse('en') } },
})
