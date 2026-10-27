// All of the site's copy lives here, so content changes never touch layout.

export const profile = {
  name: 'Petar Popović',
  role: 'Firmware & web engineer',
  location: 'Split, Croatia',
  email: 'petarpopovic0712@gmail.com',
  github: 'https://github.com/PetarPoP',
  site: 'https://petarpopovic.com',
  linkedin: 'https://www.linkedin.com/in/petarpop',
  // Pop's other public profiles; search engines use them to tie the site to his name.
  profiles: ['https://www.instagram.com/pop_2110/', 'https://www.instagram.com/pop.perspektiva/'],
  cvs: [
    { lang: 'EN', label: 'CV (EN)', href: '/petar-popovic-cv-en.pdf' },
    { lang: 'HR', label: 'CV (HR)', href: '/petar-popovic-cv-hr.pdf' },
  ],
  headline: ['Firmware & web', 'engineer'],
  intro:
    'Fifth-year computer science student in Split, from Livno. I write real-time firmware for the FESB Racing electric car and build web apps with Next.js and React.',
  tags: ['Firmware', 'Web', 'FESB Racing', 'Photography', 'Livno to Split'],
}

export type ProjectKind = 'embedded' | 'web' | 'iot'
export const projectKinds: Record<ProjectKind, string> = { embedded: 'Embedded', web: 'Web', iot: 'IoT' }

// `repo` is the repository's name under profile.github, for projects whose code is public.
// `nameHr` is the name on the Croatian CV when it differs. `live` is the site itself, and
// `preview` a screenshot of it in public/previews.
export type Project = { name: string; nameHr?: string; kind: ProjectKind; stack: string; desc: string; repo?: string; live?: string; preview?: string }

// Projects with a public repo are ranked live by how recent and how big their code is
// (src/lib/projects.ts), and any new public repo joins the list on its own. This order is only
// what the page shows before GitHub answers.
export const projects: Project[] = [
  {
    // Named by its address, not "this website": the CV is read on its own, away from the site.
    name: 'petarpopovic.com',
    kind: 'web',
    stack: 'TanStack Start · React · Cloudflare Workers',
    desc: 'This portfolio: a dithered canvas drawn in a Web Worker, live Spotify and GitHub data, and a CV built on every download.',
    repo: 'personal-site',
    live: 'https://petarpopovic.com',
  },
  {
    name: 'IdeaPlanner',
    kind: 'web',
    stack: 'Next.js · Tauri · Rust',
    desc: 'Desktop app for planning and organising ideas.',
    repo: 'IdeaPlanner',
  },
  {
    name: 'OBD BLE monitor',
    kind: 'embedded',
    stack: 'C · ESP32 · React Native',
    desc: 'Car diagnostics read over OBD and streamed to a phone over Bluetooth LE.',
    repo: 'esp32-obd',
  },
  {
    name: 'FESB Racing website',
    nameHr: 'FESB Racing web stranica',
    kind: 'web',
    stack: 'TanStack Start · React · TS',
    desc: 'Website for the FESB Racing Formula Student team.',
    repo: 'fesb-racing-site',
    live: 'https://fesb-racing-site.pop-sites.workers.dev',
    preview: '/previews/fesb-racing.webp',
  },
  {
    name: 'Midnight Crew',
    nameHr: 'Midnight Crew',
    kind: 'web',
    stack: 'TanStack Start · React · TS',
    desc: 'Website for the Midnight Crew car club.',
    repo: 'midnight-crew-site',
    live: 'https://midnight-crew-site.pop-sites.workers.dev',
    preview: '/previews/midnight-crew.webp',
  },
  {
    name: 'Zlatarna Popović',
    kind: 'web',
    stack: 'TanStack Start · React · TS',
    desc: 'Website for the family jewellery shop in Livno.',
    repo: 'zlatarna-popovic',
    live: 'https://zlatarna-popovic.pop-sites.workers.dev',
    preview: '/previews/zlatarna-popovic.webp',
  },
  {
    name: 'STM32 embedded tasks',
    nameHr: 'STM32 ugradbeni zadaci',
    kind: 'embedded',
    stack: 'C · STM32 · Wokwi',
    desc: 'Embedded programming exercises on STM32, simulated in Wokwi.',
    repo: 'FESB_racing',
  },
  {
    name: 'Café web app',
    nameHr: 'Web aplikacija za kafić',
    kind: 'web',
    stack: 'React · Express · MongoDB',
    desc: 'Full-stack web app for a coffee shop.',
    repo: 'coffe-page',
  },
  // No public code, so always last, in the order Pop chose.
  {
    name: 'BMS node simulation',
    nameHr: 'Simulacija BMS čvora',
    kind: 'embedded',
    stack: 'Arduino · CAN',
    desc: 'A stand-in battery management node for testing CAN communication on the bench.',
  },
  {
    name: 'Student jobs portal',
    nameHr: 'Portal za studentske poslove',
    kind: 'web',
    stack: 'React',
    desc: 'Job board connecting students with part-time work, built at Kibernetika for the Split student centre.',
    live: 'https://www.scst.unist.hr/student/za-studente/ponuda-poslova',
    preview: '/previews/scst-jobs.webp',
  },
  {
    name: 'Steering-wheel CAN node',
    nameHr: 'CAN čvor volana',
    kind: 'embedded',
    stack: 'C · STM32F4 · CAN',
    desc: 'Firmware for the race car steering wheel, talking to the rest of the car over CAN.',
  },
  {
    name: 'Smart city model',
    nameHr: 'Maketa pametnog grada',
    kind: 'iot',
    stack: 'C · ESP32 · Arduino',
    desc: 'A working scale model of a smart city, driven by microcontrollers.',
  },
]

export type CvEntry = { when: string; title: string; where: string; school?: boolean }

// Work first, then school, newest first in each.
export const timeline: CvEntry[] = [
  { when: '09/2025 – now', title: 'Embedded developer', where: 'FESB Racing, FESB' },
  { when: '09/2023 – 09/2025', title: 'Software developer', where: 'Kibernetika, Split' },
  { when: '09/2024 – 02/2025', title: 'Demonstrator', where: 'University Dept. of Professional Studies' },
  { when: '01/2023 – 01/2024', title: 'Photographer', where: 'Foto Marin, Livno' },
  { when: '05/2021 – 2025', title: 'Sales associate', where: 'Popović Jewelry' },
  { when: '2022 – now', title: 'Applied computing', where: 'University Dept. of Professional Studies, Split', school: true },
  { when: '2018 – 2022', title: 'Computer technician', where: 'S. S. Kranjčević Vocational High School, Livno', school: true },
]
