import { photoCode, photos, profile, projects, skills } from '#/data/portfolio'

// The apps of POP/OS. Desktop shows the first five as windows; mobile adds About.
export type AppId = 'term' | 'work' | 'photos' | 'cv' | 'mail' | 'about'
export const windowIds = ['term', 'work', 'photos', 'cv', 'mail'] as const
export type WindowId = (typeof windowIds)[number]

export const apps: Record<
  AppId,
  { label: string; window: string; file: string; glyph: string; bg: string; fg: string; border: string; slug: string }
> = {
  term: { label: 'Terminal', window: 'Terminal', file: 'terminal', glyph: '>_', bg: '#1c3132', fg: '#efab30', border: '#476762', slug: 'terminal' },
  work: { label: 'Projects', window: 'Files', file: 'projects/', glyph: '{ }', bg: '#efab30', fg: '#0d1b1c', border: '#efab30', slug: 'projects' },
  photos: { label: 'Photos', window: 'Photos', file: 'photos/', glyph: '◉', bg: '#df5e00', fg: '#0d1b1c', border: '#df5e00', slug: 'photos' },
  cv: { label: 'CV', window: 'Document Viewer', file: 'cv.pdf', glyph: 'CV', bg: '#f1ede4', fg: '#0d1b1c', border: '#f1ede4', slug: 'cv' },
  mail: { label: 'Mail', window: 'Mail', file: 'contact', glyph: '@', bg: '#476762', fg: '#f1ede4', border: '#476762', slug: 'mail' },
  about: { label: 'About', window: 'About', file: 'about', glyph: 'i', bg: '#0d1b1c', fg: '#f1ede4', border: '#f1ede4', slug: 'about' },
}

// ?app=<slug> deep links open the matching window or app.
export const appSlugs = Object.values(apps).map((a) => a.slug)
export const appFromSlug = (slug?: string): AppId | undefined =>
  (Object.keys(apps) as AppId[]).find((id) => apps[id].slug === slug)

export const stripes = (color: string) =>
  `repeating-linear-gradient(135deg, ${color} 0 1px, #0d1b1c 1px 10px)`

// ---- Terminal -------------------------------------------------------------

export type TermLine = { kind: 'in'; text: string } | { kind: 'out'; text: string; color?: string } | { kind: 'neo' }

export const initialTerm = (): TermLine[] => [
  { kind: 'in', text: 'neofetch' },
  { kind: 'neo' },
  { kind: 'out', text: "Type 'help' to list commands. Try: open photos", color: '#bec5bd' },
]

const aliases: Record<string, AppId> = {
  work: 'work', projects: 'work', 'projects/': 'work',
  photos: 'photos', 'photos/': 'photos', gallery: 'photos',
  cv: 'cv', 'cv.pdf': 'cv', resume: 'cv',
  mail: 'mail', contact: 'mail', email: 'mail',
  terminal: 'term', about: 'about',
}

export type TermResult =
  | { action: 'clear' }
  | { action: 'reboot' }
  | { action: 'print'; lines: TermLine[]; open?: AppId }

// One parser shared by the desktop and mobile terminals.
export function runCommand(raw: string): TermResult {
  const cmd = raw.trim()
  const lc = cmd.toLowerCase().replace(/\s+/g, ' ')
  const lines: TermLine[] = [{ kind: 'in', text: cmd }]
  const say = (text: string, color?: string) => lines.push({ kind: 'out', text, color })
  let open: AppId | undefined

  if (lc === 'clear') return { action: 'clear' }
  if (lc === 'reboot') return { action: 'reboot' }

  if (!lc) {
    // Empty line: just echo the prompt.
  } else if (lc === 'help') {
    say('available commands:', '#efab30')
    for (const l of [
      '  whoami          who is this',
      '  neofetch        system info',
      '  ls              list files',
      '  open <app>      projects · photos · cv · mail',
      '  cat contact.txt',
      '  skills',
      '  sudo hire petar',
      '  clear · reboot',
    ])
      say(l, '#bec5bd')
  } else if (lc === 'whoami') {
    say(`${profile.name} — ${profile.role.toLowerCase()}. Livno (BiH) / Split (HR).`)
  } else if (lc === 'neofetch') {
    lines.push({ kind: 'neo' })
  } else if (['ls', 'ls ~', 'ls -la', 'ls -a'].includes(lc)) {
    say('projects/   photos/   cv.pdf   contact.txt', '#8fb3ad')
  } else if (lc === 'ls projects' || lc === 'ls projects/') {
    say(projects.map((p) => p.slug + '/').join('   '), '#8fb3ad')
  } else if (lc === 'ls photos' || lc === 'ls photos/') {
    say(photos.map((_, i) => `${photoCode(i)}.jpg`).join('   '), '#8fb3ad')
  } else if (lc === 'cat contact.txt' || lc === 'contact.txt') {
    say(`email   ${profile.email}`)
    say(`phone   ${profile.phones.join(' · ')}`)
    say(`github  ${profile.githubLabel}`)
  } else if (lc === 'skills') {
    say(skills.join('  ') + '  ·  photography', '#efab30')
  } else if (lc.startsWith('sudo hire')) {
    say('[sudo] password for guest: ********', '#bec5bd')
    say('Permission granted. Opening mail…', '#efab30')
    open = 'mail'
  } else if (lc.startsWith('sudo')) {
    say('guest is not in the sudoers file. Nice try.', '#df5e00')
  } else {
    const parts = lc.split(' ')
    const target = ['open', 'cd', 'cat', 'xdg-open'].includes(parts[0]) ? parts[1] : parts[0]
    const app = target ? aliases[target] : undefined
    if (app) {
      say(`opening ${target}…`, '#bec5bd')
      open = app
    } else {
      say(`command not found: ${cmd.split(' ')[0]} — try 'help'`, '#df5e00')
    }
  }
  return { action: 'print', lines, open }
}

// ---- Clock ----------------------------------------------------------------

const tz = 'Europe/Sarajevo'
export const formatClock = (now: number) => {
  const d = new Date(now)
  return {
    hm: d.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }),
    hms: d.toLocaleTimeString('en-GB', { timeZone: tz }),
    day: d.toLocaleDateString('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }),
    longDate: d.toLocaleDateString('en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }),
  }
}
