import { createFileRoute } from '@tanstack/react-router'
import { cvResponse } from '#/lib/cv/response'

// /petar-popovic-cv-hr.pdf: the Croatian CV, built from live data on each download (src/lib/cv).
export const Route = createFileRoute('/petar-popovic-cv-hr.pdf')({
  server: { handlers: { GET: () => cvResponse('hr') } },
})
