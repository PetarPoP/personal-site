import type { CvLang } from '#/data/cv'
import { fetchRepos } from '#/lib/github'
import { rankProjects } from '#/lib/projects'
import { renderCv } from '#/lib/cv/render'

// The CV PDFs are built per request, so the key projects always follow the live ranking. A
// built CV is reused while the ranking doesn't change.
const built = new Map<string, Uint8Array>()

export async function cvResponse(lang: CvLang) {
  // Without GitHub the CV still comes out, with the projects in portfolio.ts order.
  const ranked = rankProjects(await fetchRepos().catch(() => []))
  const key = `${lang}:${ranked.slice(0, 9).map((p) => `${p.name}|${p.stack}|${p.url}`).join(';')}`
  let pdf = built.get(key)
  if (!pdf) {
    pdf = renderCv(lang, ranked)
    for (const k of built.keys()) if (k.startsWith(`${lang}:`)) built.delete(k)
    built.set(key, pdf)
  }
  return new Response(pdf as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="petar-popovic-cv-${lang}.pdf"`,
      'Cache-Control': 'public, max-age=600',
    },
  })
}
