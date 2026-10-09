import { profile, projectKinds, projects, timeline } from '#/data/portfolio'
import { site } from '#/lib/seo'

// The site as Markdown for AI assistants and anyone who'd rather not open the page, built from the
// same data as the page so they never disagree. /llms.txt follows llmstxt.org: a title, a one-line
// summary, then sections of links. /llms-full.txt is the whole page as text.

const repoUrl = (repo: string) => `${profile.github.replace(/\/+$/, '')}/${repo}`

const md = (label: string, url: string) => `[${label}](${url})`

export function llmsIndex() {
  return [
    `# ${profile.name}`,
    '',
    `> ${profile.role} in ${profile.location}. ${profile.intro}`,
    '',
    `Personal site and portfolio at ${site.url}/. Everything linked here is public and safe to quote.`,
    '',
    '## About',
    '',
    `- ${md('Full page as text', `${site.url}/llms-full.txt`)}: projects, experience, education and contact in one file`,
    ...profile.cvs.map((c) => `- ${md(c.label, `${site.url}${c.href}`)}: CV as a PDF`),
    `- ${md('Website', `${site.url}/`)}: the portfolio itself`,
    '',
    '## Projects',
    '',
    ...projects.map((p) => `- ${md(p.name, p.repo ? repoUrl(p.repo) : `${site.url}/#work`)}: ${p.desc} Built with ${p.stack}.`),
    '',
    '## Contact',
    '',
    `- ${md('Email', `mailto:${profile.email}`)}: ${profile.email}, for job offers and questions`,
    `- ${md('GitHub', profile.github)}: code`,
    ...profile.profiles.map((u) => `- ${md(`Instagram @${u.split('/').filter(Boolean).pop()}`, u)}`),
    '',
    '## Optional',
    '',
    `- ${md('Now playing', `${site.url}/#music`)}: what Petar is listening to on Spotify right now (live, so not in these files)`,
    '',
  ].join('\n')
}

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
    `- Email: ${md(profile.email, `mailto:${profile.email}`)}`,
    `- GitHub: ${md(profile.github, profile.github)}`,
    ...profile.profiles.map((u) => `- Instagram: ${md(u, u)}`),
    ...profile.cvs.map((c) => `- ${c.label}: ${md(`${site.url}${c.href}`, `${site.url}${c.href}`)}`),
    '',
    '## Projects',
    '',
    ...projects.flatMap((p) => [
      `### ${p.name}`,
      '',
      `- Type: ${projectKinds[p.kind]}`,
      `- Built with: ${p.stack}`,
      ...(p.repo ? [`- Code: ${md(repoUrl(p.repo), repoUrl(p.repo))}`] : []),
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
    `- What Petar is listening to on Spotify right now (live, so not included here): ${md(`${site.url}/#music`, `${site.url}/#music`)}`,
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
