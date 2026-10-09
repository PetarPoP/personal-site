import { profile } from '#/data/portfolio'

// What search engines and link previews see. petarpopovic.com is the main domain;
// petarpop.com redirects to it (set up in Cloudflare, see README).
export const site = {
  url: 'https://petarpopovic.com',
  title: 'Petar Popović — Firmware & Web Developer',
  description:
    'Petar Popović is a computer science student in Split who writes real-time firmware (C, STM32, CAN) for the FESB Racing electric car and builds web apps with Next.js and React. Also a photographer.',
  image: 'https://petarpopovic.com/og.png',
}

// Structured data for Google: who Petar is and where else he is online.
export const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: profile.name,
  url: site.url,
  image: site.image,
  email: `mailto:${profile.email}`,
  jobTitle: 'Firmware and web developer',
  description: site.description,
  address: { '@type': 'PostalAddress', addressLocality: 'Split', addressCountry: 'HR' },
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'University Department of Professional Studies, Split' },
  sameAs: [profile.github],
}
