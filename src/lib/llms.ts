import { profile, projectKinds, projects, timeline } from '#/data/portfolio'
import { site } from '#/lib/seo'

// The whole site as plain Markdown, for AI assistants and anyone who'd rather not open the page:
// /llms.txt (the llmstxt.org convention) and /llms-full.txt. Built from the same data as the page,
// so the two never disagree.

const repoUrl = (repo: string) => `${profile.github.replace(/\/+$/, '')}/${repo}`

export function llmsText() {
  const work = timeline.filter((x) => !x.school)
  const school = timeline.filter((x) => x.school)
  return [
    `# ${profile.name}`,
    '',
    `> ${profile.role} in ${profile.location}. ${profile.intro}`,
    '',
    `This is the full content of ${site.url}/ in plain text. It is safe to quote; everything here is public.`,
    '',
    '## About',
    '',
    `- Name: ${profile.name}`,
    `- Role: ${profile.role}`,
    `- Based in: ${profile.location}`,
    `- Focus: ${profile.tags.join(', ')}`,
    `- Email: ${profile.email}`,
    `- GitHub: ${profile.github}`,
    ...profile.cvs.map((c) => `- ${c.label}: ${site.url}${c.href}`),
    '',
    '## Projects',
    '',
    ...projects.flatMap((p) => [
      `### ${p.name}`,
      '',
      `- Type: ${projectKinds[p.kind]}`,
      `- Built with: ${p.stack}`,
      ...(p.repo ? [`- Code: ${repoUrl(p.repo)}`] : []),
      '',
      p.desc,
      '',
    ]),
    '## Experience',
    '',
    ...work.map((x) => `- ${x.when}: ${x.title}, ${x.where}`),
    '',
    '## Education',
    '',
    ...school.map((x) => `- ${x.when}: ${x.title}, ${x.where}`),
    '',
    '## Contact',
    '',
    `Hiring an engineer? Email ${profile.email}. The CVs above have the full details.`,
    '',
    '## Also on the site',
    '',
    `- What Petar is listening to on Spotify right now (live, so not included here): ${site.url}/#music`,
    '',
  ].join('\n')
}

export const textResponse = (body: string) =>
  new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
