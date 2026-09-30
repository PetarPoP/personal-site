// All of the site's copy lives here, so content changes never touch layout.

export const profile = {
  firstName: 'PETAR',
  lastName: 'POPOVIĆ',
  tagline: '// developer + photographer — livno, bih',
  email: 'petarpopovic0712@gmail.com',
  github: 'https://github.com/PetarPoP',
  cvs: [
    { lang: 'EN', label: 'English', href: '/cv.pdf', file: 'PetarPopovic_CV_EN.pdf' },
    { lang: 'HR', label: 'Hrvatski', href: '/cv-hr.pdf', file: 'PetarPopovic_CV_HRV.pdf' },
  ],
  // Drop a photo in /public and set its path here to replace the placeholder.
  portrait: undefined as string | undefined,
  facts: [
    { label: 'Based in', value: 'Livno, BiH / Split, HR' },
    { label: 'Studying', value: 'Applied computing, year 5' },
    { label: 'Stack', value: 'Next.js · React · C/C++' },
  ],
  about: [
    'Fifth-year computer science student.',
    'I build web apps and real-time embedded software,',
    'and shoot people and places.',
  ],
  marquee:
    'Next.js / React / TanStack / C / C++ / STM32 / CAN / Python / Photography /',
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
    title: ['FESB RACING', 'WEBSITE'],
    stack: 'TanStack Start, React, TS',
    type: 'Team website',
    href: 'https://github.com/PetarPoP',
    caption: 'SCREEN_01 · fesb racing',
    stripe: 'var(--color-deep)',
  },
  {
    title: ['STEERING WHEEL', 'CAN NODE'],
    stack: 'C, STM32F4, CAN',
    type: 'Embedded firmware',
    href: 'https://github.com/PetarPoP',
    caption: 'CAPTURE_02 · steering wheel',
    stripe: 'color-mix(in srgb, #df5e00 28%, #0d1b1c)',
  },
  {
    title: ['IDEA', 'PLANNER'],
    stack: 'Next.js, Tauri, Rust',
    type: 'Desktop app',
    href: 'https://github.com/PetarPoP',
    caption: 'SCREEN_03 · ideaplanner',
    stripe: 'var(--color-deep)',
  },
  {
    title: ['OBD BLE', 'MONITOR'],
    stack: 'C, ESP32, React Native',
    type: 'Car diagnostics',
    href: 'https://github.com/PetarPoP',
    caption: 'CAPTURE_04 · obd monitor',
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
    when: '2025.09 — now',
    title: 'Embedded developer',
    where: 'FESB Racing — VCU software for an electric formula student car, CAN bus on STM32',
  },
  {
    when: '2023.09 — 2025.09',
    title: 'Software developer',
    where: 'Kibernetika, Split — Next.js & React apps for SCST, SSR and performance',
  },
  {
    when: '2024.09 — 2025.02',
    title: 'Demonstrator',
    where: 'Univ. Dept. of Professional Studies — data structures & algorithms',
  },
  {
    when: '2023.01 — 2024.01',
    title: 'Photographer',
    where: 'Foto Marin, Livno — portraits & events',
  },
  {
    when: '2021.05 — 2025',
    title: 'Sales associate',
    where: 'Popović Jewelry — sales & client relationships',
  },
  {
    when: '2022 — now',
    title: 'Applied computing',
    where: 'Univ. Dept. of Professional Studies, Split',
    education: true,
  },
  {
    when: '2024.03 — 2024.05',
    title: 'React course',
    where: 'Digitalna Dalmacija, Junior DEV — highest marks',
    education: true,
  },
  {
    when: '2018 — 2022',
    title: 'Computer technician',
    where: 'S. S. Kranjčević High School, Livno',
    education: true,
  },
]
