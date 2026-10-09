import { profile, projects, timeline } from '#/data/portfolio'

// What search engines, link previews and AI assistants see. petarpopovic.com is the main domain;
// petarpop.com redirects to it (set up in Cloudflare, see README).
export const site = {
  url: 'https://petarpopovic.com',
  title: 'Petar Popović — Firmware & Web Engineer in Split, Croatia',
  description:
    'Petar Popović is a firmware and web engineer in Split, Croatia. He writes real-time C firmware (STM32, CAN) for the FESB Racing electric race car and builds web apps with React, Next.js and TanStack Start.',
  image: 'https://petarpopovic.com/og.png',
}

const repoUrl = (repo: string) => `${profile.github.replace(/\/+$/, '')}/${repo}`
const current = timeline.find((x) => !x.school && x.when.includes('now'))

// Structured data for Google and AI search: the page, the person, and the projects on it.
export const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${site.url}/#website`,
      url: `${site.url}/`,
      name: profile.name,
      alternateName: ['Petar Popovic', 'petarpopovic.com'],
      description: site.description,
      inLanguage: 'en',
      publisher: { '@id': `${site.url}/#person` },
    },
    {
      '@type': 'ProfilePage',
      '@id': `${site.url}/#page`,
      url: `${site.url}/`,
      name: site.title,
      isPartOf: { '@id': `${site.url}/#website` },
      mainEntity: { '@id': `${site.url}/#person` },
      primaryImageOfPage: site.image,
      inLanguage: 'en',
    },
    {
      '@type': 'Person',
      '@id': `${site.url}/#person`,
      name: profile.name,
      // How people type it without the "ć", and the handle used online.
      alternateName: ['Petar Popovic', 'PetarPoP'],
      givenName: 'Petar',
      familyName: 'Popović',
      mainEntityOfPage: { '@id': `${site.url}/#page` },
      url: `${site.url}/`,
      image: site.image,
      email: `mailto:${profile.email}`,
      jobTitle: 'Firmware and web engineer',
      description: site.description,
      address: { '@type': 'PostalAddress', addressLocality: 'Split', addressCountry: 'HR' },
      ...(current ? { worksFor: { '@type': 'Organization', name: current.where } } : {}),
      alumniOf: timeline.filter((x) => x.school).map((x) => ({ '@type': 'EducationalOrganization', name: x.where })),
      knowsAbout: ['Embedded firmware', 'C', 'STM32', 'CAN bus', 'ESP32', 'React', 'Next.js', 'TypeScript', 'TanStack Start', 'Photography'],
      knowsLanguage: ['en', 'hr'],
      sameAs: [profile.github],
    },
    {
      '@type': 'ItemList',
      '@id': `${site.url}/#work`,
      name: "Things I've built",
      itemListElement: projects.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': p.repo ? 'SoftwareSourceCode' : 'CreativeWork',
          name: p.name,
          description: p.desc,
          keywords: p.stack.split(' · ').join(', '),
          creator: { '@id': `${site.url}/#person` },
          ...(p.repo ? { codeRepository: repoUrl(p.repo) } : {}),
        },
      })),
    },
  ],
}
