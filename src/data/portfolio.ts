// All of the site's copy lives here, so content changes never touch layout.

export const profile = {
  firstName: 'PETAR',
  lastName: 'POPOVIĆ',
  tagline: '// developer + photographer — livno, bih',
  email: 'petarpopovic0712@gmail.com',
  github: 'https://github.com/PetarPoP',
  cv: '/cv.pdf',
  // Drop a photo in /public and set its path here to replace the placeholder.
  portrait: undefined as string | undefined,
  facts: [
    { label: 'Based in', value: 'Livno, BiH / Split, HR' },
    { label: 'Studying', value: 'Computer science, year 4' },
    { label: 'Stack', value: 'Next.js · React · C++' },
  ],
  about: [
    'Motivated fourth-year CS student.',
    'I ship web apps in Next.js and React,',
    'and shoot people and places.',
  ],
  marquee:
    'Next.js / React / Tailwind / C++ / Python / Photography / UI Design /',
}

export type Project = {
  title: [string, string]
  stack: string
  type: string
  href: string
  caption: string
  stripe: string
  image?: string
}

export const projects: Project[] = [
  {
    title: ['WEB SHOP', 'APPLICATION'],
    stack: 'Next.js, Tailwind',
    type: 'E‑commerce',
    href: 'https://github.com/PetarPoP',
    caption: 'SCREEN_01 · web shop',
    stripe: 'var(--color-deep)',
  },
  {
    title: ['STUDENTSKI', 'POSLOVI'],
    stack: 'React',
    type: 'Job board',
    href: 'https://github.com/PetarPoP',
    caption: 'SCREEN_02 · studentski poslovi',
    stripe: 'color-mix(in srgb, #df5e00 28%, #0d1b1c)',
  },
  {
    title: ['CATERING', 'SITE'],
    stack: 'Next.js',
    type: 'Business site',
    href: 'https://github.com/PetarPoP',
    caption: 'SCREEN_03 · catering',
    stripe: 'var(--color-deep)',
  },
  {
    title: ['SPACE', 'INVADERS'],
    stack: 'C++',
    type: 'Desktop game',
    href: 'https://github.com/PetarPoP',
    caption: 'CAPTURE_04 · gameplay',
    stripe: 'var(--color-teal)',
  },
]

export type Photo = {
  id: string
  caption: string
  width: number
  height: number
  warm?: boolean
  src?: string
}

export const photos: Photo[] = [
  { id: 'IMG_001', caption: 'Buško jezero', width: 520, height: 390 },
  { id: 'IMG_002', caption: 'Portrait', width: 300, height: 440, warm: true },
  { id: 'IMG_003', caption: 'Cincar at dusk', width: 600, height: 400 },
  { id: 'IMG_004', caption: 'Street detail', width: 340, height: 340 },
  { id: 'IMG_005', caption: 'Wedding, Livno', width: 360, height: 460, warm: true },
  { id: 'IMG_006', caption: 'Wild horses, Kruzi', width: 500, height: 360 },
]

export type Role = {
  when: string
  title: string
  where: string
  education?: boolean
}

export const experience: Role[] = [
  {
    when: '2024.10 — 2025.10',
    title: 'Programmer',
    where: 'Kibernetika, Split — Next.js & React apps for students',
  },
  {
    when: '2024.09 — 2025.02',
    title: 'Demonstrator',
    where: 'Univ. Dept. for Professional Studies — data structures & algorithms',
  },
  {
    when: '2023.10 — 2025.01',
    title: 'Photographer',
    where: 'Foto Marin, Livno — portraits & events',
  },
  {
    when: '2022 — now',
    title: 'BSc Computer science',
    where: 'Split — React course, top marks',
    education: true,
  },
  {
    when: '2018 — 2022',
    title: 'Computer technician',
    where: 'S. S. Kranjčević High School, Livno',
    education: true,
  },
]
