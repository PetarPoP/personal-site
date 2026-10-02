// The apps of POP/OS. On desktop, Projects, Photos and Notes are folders of one
// Files window; mobile shows each as its own app and adds About.
export type AppId = 'term' | 'work' | 'photos' | 'notes' | 'cv' | 'mail' | 'spotify' | 'about'
export const windowIds = ['term', 'files', 'cv', 'mail', 'spotify'] as const
export type WindowId = (typeof windowIds)[number]
export type Folder = 'projects' | 'photos' | 'notes'

export const apps: Record<
  AppId,
  { label: string; window: string; file: string; glyph: string; bg: string; fg: string; border: string; slug: string }
> = {
  term: { label: 'Terminal', window: 'Terminal', file: 'terminal', glyph: '>_', bg: '#1c3132', fg: '#efab30', border: '#476762', slug: 'terminal' },
  work: { label: 'Projects', window: 'Files', file: 'projects/', glyph: '{ }', bg: '#efab30', fg: '#0d1b1c', border: '#efab30', slug: 'projects' },
  photos: { label: 'Photos', window: 'Files', file: 'photos/', glyph: '◉', bg: '#df5e00', fg: '#0d1b1c', border: '#df5e00', slug: 'photos' },
  notes: { label: 'Notes', window: 'Files', file: 'notes/', glyph: '✎', bg: '#463f21', fg: '#efab30', border: '#efab30', slug: 'notes' },
  cv: { label: 'CV', window: 'Document Viewer', file: 'cv.pdf', glyph: 'CV', bg: '#f1ede4', fg: '#0d1b1c', border: '#f1ede4', slug: 'cv' },
  mail: { label: 'Mail', window: 'Mail', file: 'contact', glyph: '@', bg: '#476762', fg: '#f1ede4', border: '#476762', slug: 'mail' },
  spotify: { label: 'Spotify', window: 'Spotify', file: 'spotify', glyph: '♫', bg: '#1db954', fg: '#0d1b1c', border: '#1db954', slug: 'spotify' },
  about: { label: 'About', window: 'About', file: 'about', glyph: 'i', bg: '#0d1b1c', fg: '#f1ede4', border: '#f1ede4', slug: 'about' },
}

export const folderApp: Record<Folder, AppId> = { projects: 'work', photos: 'photos', notes: 'notes' }
export const appFolder: Partial<Record<AppId, Folder>> = { work: 'projects', photos: 'photos', notes: 'notes' }

// ?app=<slug> deep links open the matching window or app.
export const appSlugs = Object.values(apps).map((a) => a.slug)
export const appFromSlug = (slug?: string): AppId | undefined =>
  (Object.keys(apps) as AppId[]).find((id) => apps[id].slug === slug)

export const stripes = (color: string) =>
  `repeating-linear-gradient(135deg, ${color} 0 1px, #0d1b1c 1px 10px)`

const tz = 'Europe/Sarajevo'

// ---- Battery ------------------------------------------------------------------

// The phone's battery follows Petar's day in Livno: full at 8:00, down to 1% at 20:00, then
// charging back overnight.
export const battery = (now: number) => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  const minutes = get('hour') * 60 + get('minute')
  const half = 12 * 60
  const sinceEight = (minutes - 8 * 60 + 24 * 60) % (24 * 60)
  const charging = sinceEight >= half
  const t = (charging ? sinceEight - half : sinceEight) / half
  return { pct: Math.round(charging ? 1 + 99 * t : 100 - 99 * t), charging }
}

// ---- Clock ----------------------------------------------------------------

export const formatClock = (now: number) => {
  const d = new Date(now)
  return {
    hm: d.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }),
    hms: d.toLocaleTimeString('en-GB', { timeZone: tz }),
    day: d.toLocaleDateString('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }),
    longDate: d.toLocaleDateString('en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }),
  }
}
