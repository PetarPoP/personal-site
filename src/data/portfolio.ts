// All of the site's copy lives here, so content changes never touch layout.

export const profile = {
  name: 'Petar Popović',
  role: 'Firmware & web developer',
  location: 'Split, Croatia',
  email: 'petarpopovic0712@gmail.com',
  github: 'https://github.com/PetarPoP',
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
export type Project = { name: string; kind: ProjectKind; stack: string; desc: string; repo?: string }

// "Key projects" from the CV.
export const projects: Project[] = [
  {
    name: 'Steering-wheel CAN node',
    kind: 'embedded',
    stack: 'C · STM32F4 · CAN',
    desc: 'Firmware for the race car steering wheel, talking to the rest of the car over CAN.',
  },
  {
    name: 'BMS node simulation',
    kind: 'embedded',
    stack: 'Arduino · CAN',
    desc: 'A stand-in battery management node for testing CAN communication on the bench.',
  },
  {
    name: 'FESB Racing website',
    kind: 'web',
    stack: 'TanStack Start · React · TS',
    desc: 'Website for the FESB Racing Formula Student team.',
    repo: 'fesb-racing-site',
  },
  {
    name: 'OBD BLE monitor',
    kind: 'embedded',
    stack: 'C · ESP32 · React Native',
    desc: 'Car diagnostics read over OBD and streamed to a phone over Bluetooth LE.',
    repo: 'esp32-obd',
  },
  {
    name: 'STM32 embedded tasks',
    kind: 'embedded',
    stack: 'C · STM32 · Wokwi',
    desc: 'Embedded programming exercises on STM32, simulated in Wokwi.',
    repo: 'FESB_racing',
  },
  {
    name: 'IdeaPlanner',
    kind: 'web',
    stack: 'Next.js · Tauri · Rust',
    desc: 'Desktop app for planning and organising ideas.',
    repo: 'IdeaPlanner',
  },
  {
    name: 'Smart city model',
    kind: 'iot',
    stack: 'C · ESP32 · Arduino',
    desc: 'A working scale model of a smart city, driven by microcontrollers.',
  },
  {
    name: 'Café web app',
    kind: 'web',
    stack: 'React · Express · MongoDB',
    desc: 'Full-stack web app for a coffee shop.',
    repo: 'coffe-page',
  },
  {
    name: 'Student jobs portal',
    kind: 'web',
    stack: 'React',
    desc: 'Job board connecting students with part-time work.',
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
