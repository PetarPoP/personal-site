// All of the site's copy lives here, so content changes never touch layout.
// Desktop and mobile shells, the terminal and the CV viewer all read from it.

export const profile = {
  name: 'Petar Popović',
  firstName: 'Petar',
  lastName: 'Popović',
  role: 'Developer & photographer',
  roles: 'developer · photographer',
  locations: 'Livno, BiH ⇄ Split, HR',
  email: 'petarpopovic0712@gmail.com',
  phones: ['+387 63 632 005', '+385 99 373 2936'],
  github: 'https://github.com/PetarPoP',
  githubLabel: 'github.com/PetarPoP',
  cvs: [
    { lang: 'EN', label: 'English', href: '/cv.pdf', file: 'PetarPopovic_CV_EN.pdf' },
    { lang: 'HR', label: 'Hrvatski', href: '/cv-hr.pdf', file: 'PetarPopovic_CV_HRV.pdf' },
  ],
  summary:
    'Fifth-year Computer Science student with hands-on experience in full-stack web development (Next.js) and embedded systems programming (C/C++, Python). Currently focused on bridging these two domains, from developing intuitive user interfaces to writing code for real-time hardware communication.',
  about:
    'Fifth-year computer science student in Split, from Livno. I build web apps with Next.js and React, write real-time firmware for the FESB Racing electric car, and shoot portraits, events and landscapes.',
  // Drop a photo in /public and set its path here to replace the placeholder.
  portrait: undefined as string | undefined,
  lockWallpaper: undefined as string | undefined,
}

// Placeholder stripe tones from the design: teal, orange, olive.
export type Tone = 'a' | 'o' | 'y'
export const toneColor: Record<Tone, string> = { a: '#1c3132', o: '#482e14', y: '#463f21' }

export type Project = {
  slug: string
  name: string
  stack: string
  desc: string
  tone: Tone
  href: string
  demo?: string
  image?: string
}

// "Key projects" from the CV.
export const projects: Project[] = [
  {
    slug: 'fesb-racing-web',
    name: 'FESB Racing website',
    stack: 'TanStack Start · React · TS',
    desc: 'Website for the FESB Racing formula student team.',
    tone: 'y',
    href: profile.github,
  },
  {
    slug: 'steering-wheel-can',
    name: 'Steering wheel CAN node',
    stack: 'C · STM32F4 · CAN',
    desc: 'Firmware for the race car steering wheel, talking to the rest of the car over CAN.',
    tone: 'o',
    href: profile.github,
  },
  {
    slug: 'mock-bms-node',
    name: 'Mock BMS node',
    stack: 'Arduino · CAN',
    desc: 'A stand-in battery management node for testing CAN communication on the bench.',
    tone: 'a',
    href: profile.github,
  },
  {
    slug: 'ideaplanner',
    name: 'IdeaPlanner',
    stack: 'Next.js · Tauri · Rust',
    desc: 'Desktop app for planning and organising ideas.',
    tone: 'y',
    href: profile.github,
  },
  {
    slug: 'obd-ble-monitor',
    name: 'OBD BLE Monitor',
    stack: 'C · ESP32 · React Native',
    desc: 'Car diagnostics read over OBD and streamed to a phone over Bluetooth LE.',
    tone: 'a',
    href: profile.github,
  },
  {
    slug: 'coffee-shop',
    name: 'Coffee shop web app',
    stack: 'React · Express · MongoDB',
    desc: 'Full-stack web app for a coffee shop.',
    tone: 'o',
    href: profile.github,
  },
  {
    slug: 'stm32-tasks',
    name: 'STM32 embedded tasks',
    stack: 'C · STM32 · Wokwi',
    desc: 'Embedded programming exercises on STM32, simulated in Wokwi.',
    tone: 'y',
    href: profile.github,
  },
  {
    slug: 'smart-city',
    name: 'Smart city mockup',
    stack: 'C · ESP32 · Arduino',
    desc: 'A smart city model driven by microcontrollers.',
    tone: 'a',
    href: profile.github,
  },
  {
    slug: 'student-jobs',
    name: 'Student job portal',
    stack: 'React',
    desc: 'Job board connecting students with part-time work.',
    tone: 'o',
    href: profile.github,
  },
]

export const photoCategories = ['All', 'Landscape', 'Portrait', 'Wildlife', 'Street'] as const
export type PhotoCategory = Exclude<(typeof photoCategories)[number], 'All'>

export type Photo = {
  caption: string
  category: PhotoCategory
  tone: Tone
  // Grid span and height on desktop ("All" view), and height on mobile.
  span: number
  height: number
  mobileHeight: number
  src?: string
}

export const photos: Photo[] = [
  { caption: 'Buško jezero', category: 'Landscape', tone: 'a', span: 4, height: 230, mobileHeight: 200 },
  { caption: 'Portrait session', category: 'Portrait', tone: 'o', span: 2, height: 230, mobileHeight: 260 },
  { caption: 'Wild horses, Kruzi', category: 'Wildlife', tone: 'y', span: 2, height: 190, mobileHeight: 170 },
  { caption: 'Cincar at dusk', category: 'Landscape', tone: 'a', span: 4, height: 190, mobileHeight: 230 },
  { caption: 'Wedding, Livno', category: 'Portrait', tone: 'o', span: 3, height: 210, mobileHeight: 250 },
  { caption: 'Street detail', category: 'Street', tone: 'y', span: 3, height: 210, mobileHeight: 160 },
  { caption: 'Old town at night', category: 'Street', tone: 'a', span: 2, height: 200, mobileHeight: 210 },
  { caption: 'Horses on the ridge', category: 'Wildlife', tone: 'o', span: 4, height: 200, mobileHeight: 180 },
]

export const photoCode = (i: number) => `IMG_${String(i + 1).padStart(3, '0')}`

export type CvEntry = { when: string; title: string; where: string; text?: string }

export const experience: CvEntry[] = [
  {
    when: '09.2025 – now',
    title: 'Embedded developer',
    where: 'FESB Racing, FESB',
    text: 'Software for the Vehicle Control Unit (VCU) of an electric formula student car: CAN bus communication and real-time sensor systems on STM32.',
  },
  {
    when: '09.2023 – 09.2025',
    title: 'Software developer',
    where: 'Kibernetika, Split',
    text: 'Web applications for SCST with Next.js and React, focused on performance, server-side rendering and intuitive UX.',
  },
  {
    when: '09.2024 – 02.2025',
    title: 'Demonstrator',
    where: 'Univ. Dept. of Professional Studies',
    text: 'Mentored students in Data Structures and Algorithms, helping with complex programming problems and debugging.',
  },
  {
    when: '01.2023 – 01.2024',
    title: 'Photographer',
    where: 'Foto Marin, Livno',
    text: 'Portraits and events: creative problem-solving, precision and high-level client communication.',
  },
  {
    when: '05.2021 – 2025',
    title: 'Sales associate',
    where: 'Popović Jewelry',
    text: 'Direct sales and customer relationships in a high-responsibility environment.',
  },
]

export const education: CvEntry[] = [
  { when: '2022 – now', title: 'Applied computing', where: 'University Dept. of Professional Studies, Split' },
  { when: '2018 – 2022', title: 'Computer technician', where: 'S. S. Kranjčević Vocational High School, Livno' },
]

export const certificates = [
  'Junior DEV, Digitalna Dalmacija: React course, highest marks (2024)',
  'English language course, B2: top grades',
]
export const languages = 'Croatian (native) · English B2'
export const otherWork = ['Car wash attendant, NK', 'Pizza delivery driver, Mirakul']

export const skills = ['Next.js', 'React', 'TanStack', 'TypeScript', 'Tailwind', 'C', 'C++', 'STM32', 'CAN', 'Python', 'Git']

// Boot log, written from CV facts. o = [  OK  ], l = kernel timestamp, p = plain.
export const bootLog: ([kind: 'o', text: string] | [kind: 'l', stamp: string, text: string] | [kind: 'p', text: string])[] = [
  ['p', 'PopOS 26.10 "Livno" — kernel 6.9.2-pp (guest@workstation)'],
  ['l', '0.000000', 'Command line: BOOT_IMAGE=/vmlinuz root=/dev/portfolio quiet splash'],
  ['l', '0.004211', 'Memory: 16384M available'],
  ['l', '0.118902', 'CPU0: curiosity @ 4.20GHz, 8 cores'],
  ['l', '0.302114', 'Detected camera module'],
  ['o', 'Mounted /home/petar'],
  ['o', 'Started Next.js runtime'],
  ['o', 'Started React renderer'],
  ['o', 'Loaded Tailwind stylesheet'],
  ['o', 'Loaded C / C++ toolchain'],
  ['o', 'Started Python 3 interpreter'],
  ['o', 'Reached target Git'],
  ['o', 'Started fesb-racing.service: VCU, CAN bus on STM32'],
  ['o', 'Started kibernetika.service (2023 – 2025)'],
  ['o', 'Started demonstrator.service: data structures & algorithms'],
  ['o', 'Reached target Computer Science, year 5'],
  ['o', 'Started junior-dev-certificate.service'],
  ['o', 'Started lensd — camera daemon'],
  ['o', `Mounted /home/petar/photos (${photos.length} frames)`],
  ['o', 'Mounted /docs/cv.pdf (en, hr)'],
  ['o', 'Set locale: hr_BA.UTF-8, en (B2)'],
  ['o', 'Started network: Livno ⇄ Split'],
  ['o', 'Reached target Graphical Interface'],
  ['p', ''],
  ['p', 'pop-os login: guest (automatic login)'],
]
