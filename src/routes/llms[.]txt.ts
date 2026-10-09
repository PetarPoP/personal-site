import { createFileRoute } from '@tanstack/react-router'
import { llmsIndex, textResponse } from '#/lib/llms'

// /llms.txt: an llmstxt.org index of the site for AI assistants (see src/lib/llms.ts).
export const Route = createFileRoute('/llms.txt')({
  server: { handlers: { GET: () => textResponse(llmsIndex()) } },
})
