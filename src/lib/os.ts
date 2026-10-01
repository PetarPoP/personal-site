// The apps of POP/OS. On desktop, Projects, Photos and Notes are folders of one
// Files window; mobile shows each as its own app and adds About.
export type AppId = 'term' | 'work' | 'photos' | 'notes' | 'cv' | 'mail' | 'about'
export const windowIds = ['term', 'files', 'cv', 'mail'] as const
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
