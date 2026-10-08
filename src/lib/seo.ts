import { profile } from '#/data/portfolio'
import { appFromSlug, apps } from './os'
import type { AppId } from './os'

// What search engines and link previews see. petarpopovic.com is the main domain;
// petarpop.com redirects to it (set up in Cloudflare, see README).
export const site = {
  url: 'https://petarpopovic.com',
  title: 'Petar Popović — Developer & Photographer',
  description:
    'Petar Popović is a computer science student in Split and a web developer (Next.js, React) and embedded programmer (C, STM32) from Livno, BiH. Also a photographer.',
  image: 'https://petarpopovic.com/og.png',
}

const pages: Record<AppId, string> = {
  work: "Petar Popović's public GitHub repositories: web apps, embedded firmware and side projects, newest first.",
  photos: 'Photography by Petar Popović: portraits, events and landscapes from Livno, Split and around.',
  notes: 'Guest notes: leave Petar Popović a short note on his site.',
  cv: 'CV of Petar Popović: experience, education, skills and key projects. Download it in English or Croatian.',
  mail: 'Contact Petar Popović about a web or embedded project, a job, or a photo shoot.',
  spotify: 'What Petar Popović is listening to on Spotify right now.',
  term: "A terminal inside POP/OS, Petar Popović's site: type help to explore his work, CV and photos.",
  about: 'About Petar Popović: computer science student in Split, web and embedded developer, and photographer from Livno.',
}

// Title, description, canonical URL and link preview for /<app>.
export function appHead(slug: string) {
  const id = appFromSlug(slug)
  if (!id) return {}
  const title = `${apps[id].label} — ${profile.name}`
  const url = `${site.url}/${slug}`
  return {
    meta: [
      { title },
      { name: 'description', content: pages[id] },
      { property: 'og:title', content: title },
      { property: 'og:description', content: pages[id] },
      { property: 'og:url', content: url },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: pages[id] },
    ],
    links: [{ rel: 'canonical', href: url }],
  }
}

// Structured data for Google: who Petar is and where else he is online.
export const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: profile.name,
  url: site.url,
  image: site.image,
  email: `mailto:${profile.email}`,
  jobTitle: 'Web developer and photographer',
  description: site.description,
  address: { '@type': 'PostalAddress', addressLocality: 'Livno', addressCountry: 'BA' },
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'University Department of Professional Studies, Split' },
  sameAs: [profile.github],
}
