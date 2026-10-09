import { createFileRoute } from '@tanstack/react-router'
import { llmsText, textResponse } from '#/lib/llms'

// /llms-full.txt: the whole site as Markdown for AI assistants (see src/lib/llms.ts).
export const Route = createFileRoute('/llms-full.txt')({
  server: { handlers: { GET: () => textResponse(llmsText()) } },
})
