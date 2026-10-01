import { certificates, education, experience, languages, profile, projects, skills } from '#/data/portfolio'
import type { AppId } from './os'

// The POP/OS shell: a tiny fake filesystem and a command parser, shared by the
// desktop and mobile terminals. Pure functions; the React side lives in hooks.ts.

export type TermLine =
  | { kind: 'in'; text: string; cwd: string }
  | { kind: 'out'; text: string; color?: string; cmd?: string }
  | { kind: 'neo' }
  | { kind: 'banner' }
  // Aligned two-column rows; a row with cmd runs it when clicked.
  | { kind: 'table'; title?: string; rows: ({ left: string; right: string; cmd?: string } | { heading: string })[] }

export type TermEffect = { open?: AppId; url?: string; download?: 'EN' | 'HR'; exit?: boolean; admin?: string | null }
export type TermResult = { action: 'clear' } | { action: 'reboot' } | { action: 'print'; lines: TermLine[]; cwd: string; effect?: TermEffect }

const C = { amber: '#efab30', orange: '#df5e00', mist: '#8fb3ad', muted: '#bec5bd', dim: '#a5b0a9', text: '#f1ede4' }

export const initialTerm = (): TermLine[] => [
  { kind: 'in', text: 'neofetch', cwd: '~' },
  { kind: 'neo' },
  { kind: 'out', text: "Type 'help' to list commands, or click one below. Tab completes, ↑ ↓ recall history.", color: C.muted },
  { kind: 'out', text: '  try: projects   ·   cat about.txt   ·   open photos   ·   sudo hire petar', color: C.amber, cmd: 'projects' },
]

// ---- filesystem -------------------------------------------------------------

type Dir = { type: 'dir'; children: Record<string, Node> }
type File = { type: 'file'; read: () => string[]; open?: TermEffect }
type Node = Dir | File

const file = (read: () => string[], open?: TermEffect): File => ({ type: 'file', read, open })

const aboutText = () => [profile.about, '', `based in   ${profile.locations}`, `role       ${profile.roles}`]
const contactText = () => [`email   ${profile.email}`, `phone   ${profile.phones.join(' · ')}`, `github  ${profile.githubLabel}`]

const projectReadme = (p: (typeof projects)[number]) => () => [`# ${p.name}`, '', p.desc, '', `stack   ${p.stack}`, `repo    ${p.href.replace('https://', '')}`]

const fs: Dir = {
  type: 'dir',
  children: {
    'about.txt': file(aboutText),
    'contact.txt': file(contactText),
    'skills.txt': file(() => [skills.join('  ·  ')]),
    projects: {
      type: 'dir',
      children: Object.fromEntries(
        projects.map((p) => [p.slug, { type: 'dir', children: { 'README.md': file(projectReadme(p)) } } satisfies Dir]),
      ),
    },
    photos: {
      type: 'dir',
      children: Object.fromEntries(
        [['gallery.lnk', file(() => ['(photo album — opening Photos)'], { open: 'photos' })]],
      ),
    },
    docs: {
      type: 'dir',
      children: {
        'cv.pdf': file(() => ['%PDF-1.7 … binary. Opening the document viewer.'], { open: 'cv' }),
        'cv-hr.pdf': file(() => ['%PDF-1.7 … binary. Downloading the Croatian CV.'], { download: 'HR' }),
      },
    },
  },
}

// Resolve a path against cwd ("~", "~/projects", ...). Returns the normalised path.
function resolve(cwd: string, path = ''): string | null {
  const parts = path.startsWith('~') || path.startsWith('/') ? [] : cwd.split('/').slice(1)
  for (const seg of path.replace(/^~\/?|^\//, '').split('/')) {
    if (!seg || seg === '.') continue
    if (seg === '..') parts.pop()
    else parts.push(seg)
  }
  return ['~', ...parts].join('/')
}

function lookup(path: string): Node | null {
  let node: Node = fs
  for (const seg of path.split('/').slice(1)) {
    if (node.type !== 'dir') return null
    const next: Node | undefined = node.children[seg] ?? node.children[seg.replace(/\/$/, '')]
    if (!next) return null
    node = next
  }
  return node
}

const listing = (dir: Dir) => Object.entries(dir.children).map(([name, n]) => (n.type === 'dir' ? `${name}/` : name))

// ---- commands -----------------------------------------------------------------

const appAliases: Record<string, AppId> = {
  work: 'work', projects: 'work', files: 'work',
  photos: 'photos', gallery: 'photos',
  cv: 'cv', resume: 'cv', docs: 'cv',
  mail: 'mail', contact: 'mail', email: 'mail',
  notes: 'notes', messages: 'notes',
  terminal: 'term', about: 'about', spotify: 'spotify', music: 'spotify',
}

export const commandHelp: { title: string; rows: [cmd: string, desc: string, run?: string][] }[] = [
  {
    title: 'about me',
    rows: [
      ['about', 'who is Petar'],
      ['experience', 'work history'],
      ['education', 'school and certificates'],
      ['skills', 'languages and tools'],
      ['contact', 'email, phone, GitHub'],
    ],
  },
  {
    title: 'work',
    rows: [
      ['projects', 'list all projects'],
      ['project <name>', 'details of one project', 'project fesb'],
      ['photos', 'open the photo album'],
      ['cv [en|hr]', 'open or download the CV', 'cv'],
      ['github', 'open GitHub'],
    ],
  },
  {
    title: 'files',
    rows: [
      ['ls [dir]', 'list files', 'ls'],
      ['cd <dir>', 'change directory', 'cd projects'],
      ['cat <file>', 'print a file', 'cat about.txt'],
      ['pwd', 'current directory'],
      ['open <app>', 'projects, photos, notes, cv, mail, spotify', 'open notes'],
    ],
  },
  {
    title: 'system',
    rows: [
      ['neofetch', 'system info'],
      ['banner', 'big logo'],
      ['date', 'time in Livno'],
      ['uptime', 'how long you have been here'],
      ['history', 'commands you ran'],
      ['clear', 'clear the screen'],
      ['reboot', 'restart POP/OS'],
      ['exit', 'close the terminal'],
    ],
  },
  {
    title: 'fun',
    rows: [
      ['fortune', 'a random line'],
      ['coffee', 'take a break'],
      ['spotify', 'what Petar is listening to'],
      ['sudo hire petar', 'the important one'],
    ],
  },
]

export const commandNames = [
  'help', 'about', 'whoami', 'projects', 'project', 'experience', 'education', 'skills', 'contact', 'cv', 'open',
  'ls', 'cd', 'cat', 'pwd', 'github', 'email', 'neofetch', 'banner', 'date', 'uptime', 'echo', 'history',
  'fortune', 'coffee', 'sudo', 'clear', 'reboot', 'exit', 'photos', 'spotify',
]

const fortunes = [
  'It works on my machine. — every developer, eventually',
  'Golden hour lasts about twenty minutes. Bugs last forever.',
  'There are two hard things in CS: cache invalidation, naming things, and off-by-one errors.',
  'f/8 and be there.',
  'A CAN frame walks into a bar. The bar arbitrates.',
  'Ship it, then shoot the sunset.',
]

const findProject = (q: string) => {
  const s = q.toLowerCase().replace(/\/$/, '')
  return projects.find((p) => p.slug === s || p.name.toLowerCase() === s) ?? projects.find((p) => p.slug.includes(s) || p.name.toLowerCase().includes(s))
}

export type ShellContext = { cwd: string; history: string[]; startedAt: number; now: number }

export function runCommand(raw: string, ctx: ShellContext): TermResult {
  const cmd = raw.trim()
  const [head = '', ...rest] = cmd.split(/\s+/)
  const name = head.toLowerCase()
  const arg = rest.join(' ')
  const lc = cmd.toLowerCase().replace(/\s+/g, ' ')
  const lines: TermLine[] = [{ kind: 'in', text: cmd, cwd: ctx.cwd }]
  const say = (text: string, color?: string, run?: string) => lines.push({ kind: 'out', text, color, cmd: run })
  let cwd = ctx.cwd
  let effect: TermEffect | undefined

  if (name === 'clear' || name === 'cls') return { action: 'clear' }
  if (name === 'reboot' || lc === 'sudo reboot') return { action: 'reboot' }

  const ls = (path?: string) => {
    const p = resolve(cwd, path)
    const node = p && lookup(p)
    if (!node) return say(`ls: cannot access '${path}': No such file or directory`, C.orange)
    if (node.type === 'file') return say(path ?? '', C.mist)
    const entries = listing(node)
    for (const e of entries) {
      const full = `${p}/${e}`.replace(/^~\//, '')
      say(`  ${e}`, e.endsWith('/') ? C.amber : C.mist, e.endsWith('/') ? `cd ${full}` : `cat ${full}`)
    }
  }

  const cat = (path: string) => {
    if (!path) return say('cat: missing file operand', C.orange)
    const p = resolve(cwd, path)
    const node = p && lookup(p)
    if (!node) {
      const proj = findProject(path.replace(/^projects\//, ''))
      if (proj && path.toLowerCase().includes('readme')) return projectReadme(proj)().forEach((l) => say(l))
      return say(`cat: ${path}: No such file or directory`, C.orange)
    }
    if (node.type === 'dir') return say(`cat: ${path}: Is a directory`, C.orange)
    node.read().forEach((l) => say(l))
    effect = node.open
  }

  if (!cmd) {
    // Empty line: just a fresh prompt.
  } else if (name === 'help' || name === 'man' || name === '?') {
    say('available commands — click one to run it, Tab completes, ↑ ↓ for history', C.muted)
    // One table for every group, so both columns line up all the way down.
    lines.push({
      kind: 'table',
      rows: commandHelp.flatMap((g) => [{ heading: g.title }, ...g.rows.map(([left, right, run]) => ({ left, right, cmd: run ?? left }))]),
    })
  } else if (name === 'whoami') {
    say(`${profile.name} — ${profile.role.toLowerCase()}. ${profile.locations}.`)
  } else if (name === 'about') {
    aboutText().forEach((l) => say(l))
    say('  → see the CV', C.amber, 'cv')
  } else if (name === 'neofetch') {
    lines.push({ kind: 'neo' })
  } else if (name === 'banner' || name === 'logo') {
    lines.push({ kind: 'banner' })
  } else if (name === 'projects' || (name === 'ls' && /^~?\/?projects\/?$/.test(arg) && cwd === '~')) {
    lines.push({
      kind: 'table',
      title: `${projects.length} projects — click one, or: project <name>`,
      rows: projects.map((p) => ({ left: p.slug, right: p.stack, cmd: `project ${p.slug}` })),
    })
    say('  → open in Files', C.amber, 'open projects')
  } else if (name === 'project') {
    const p = arg ? findProject(arg) : undefined
    if (!p) say(arg ? `project: '${arg}' not found — try 'projects'` : 'usage: project <name>', C.orange)
    else {
      projectReadme(p)().forEach((l, i) => say(l, i === 0 ? C.amber : undefined))
      say('  → open repo on GitHub', C.amber, 'github')
    }
  } else if (name === 'experience' || name === 'exp' || name === 'jobs') {
    lines.push({ kind: 'table', rows: experience.map((e) => ({ left: e.when, right: `${e.title} — ${e.where}${e.text ? `\n${e.text}` : ''}` })) })
  } else if (name === 'education' || name === 'edu') {
    lines.push({ kind: 'table', rows: education.map((e) => ({ left: e.when, right: `${e.title} — ${e.where}` })) })
    lines.push({ kind: 'table', title: 'certificates & languages', rows: [...certificates, languages].map((c) => ({ left: '✓', right: c })) })
  } else if (name === 'skills') {
    say(skills.join('  ·  ') + '  ·  photography', C.amber)
  } else if (name === 'contact' || (name === 'email' && !arg)) {
    contactText().forEach((l) => say(l))
    say('  → write a message', C.amber, 'open mail')
  } else if (name === 'cv' || name === 'resume' || lc === 'download cv') {
    const lang = arg.toLowerCase()
    if (lang === 'hr' || lang === 'en') {
      say(`downloading ${lang === 'hr' ? 'cv-hr.pdf (Hrvatski)' : 'cv.pdf (English)'}…`, C.amber)
      effect = { download: lang === 'hr' ? 'HR' : 'EN' }
    } else {
      say('opening the CV…  download with: cv en · cv hr', C.muted)
      say('  cv en', C.amber, 'cv en')
      say('  cv hr', C.amber, 'cv hr')
      effect = { open: 'cv' }
    }
  } else if (name === 'github' || name === 'git') {
    say(`opening ${profile.githubLabel}…`, C.muted)
    effect = { url: profile.github }
  } else if (name === 'photos') {
    say('opening Photos…', C.muted)
    effect = { open: 'photos' }
  } else if (name === 'ls' || name === 'll' || name === 'dir') {
    ls(rest.find((r) => !r.startsWith('-')))
  } else if (name === 'cd') {
    const target = resolve(cwd, arg || '~')
    const node = target && lookup(target)
    if (!node) say(`cd: ${arg}: No such file or directory`, C.orange)
    else if (node.type !== 'dir') say(`cd: ${arg}: Not a directory`, C.orange)
    else cwd = target!
  } else if (name === 'pwd') {
    say(cwd.replace('~', '/home/guest'))
  } else if (name === 'cat' || name === 'less' || name === 'more') {
    cat(arg)
  } else if (name === 'open' || name === 'xdg-open' || name === 'start') {
    const target = arg.toLowerCase().replace(/\/$/, '')
    const app = appAliases[target]
    const proj = !app ? findProject(target) : undefined
    if (app) {
      say(`opening ${target}…`, C.muted)
      effect = { open: app }
    } else if (proj) {
      say(`opening ${proj.name} on GitHub…`, C.muted)
      effect = { url: proj.href }
    } else say(arg ? `open: '${arg}' — try projects, photos, cv or mail` : 'usage: open <app>', C.orange)
  } else if (name === 'spotify' || name === 'music' || name === 'np') {
    say('opening Spotify…  ♫', C.muted)
    effect = { open: 'spotify' }
  } else if (name === 'date') {
    say(new Date(ctx.now).toLocaleString('en-GB', { timeZone: 'Europe/Sarajevo', dateStyle: 'full', timeStyle: 'medium' }) + ' (Livno)')
  } else if (name === 'uptime') {
    const s = Math.max(0, Math.round((ctx.now - ctx.startedAt) / 1000))
    say(`up ${Math.floor(s / 60)} min ${s % 60} s, 1 guest, load average: curiosity, coffee, 0.42`)
  } else if (name === 'echo') {
    say(arg)
  } else if (name === 'history') {
    ctx.history.forEach((h, i) => say(`  ${String(i + 1).padStart(3)}  ${h}`, C.muted, h))
  } else if (name === 'fortune') {
    say(fortunes[Math.floor(Math.random() * fortunes.length)], C.mist)
  } else if (name === 'coffee' || name === 'brew') {
    for (const l of ['    ( (', '     ) )', '  ........', '  |      |]', '  \\      /', "   `----'"]) say(l, C.amber)
    say('Brewing… ☕  Petar runs on this.', C.muted)
  } else if (lc.startsWith('sudo hire') || name === 'hire') {
    say('[sudo] password for guest: ********', C.muted)
    say('Permission granted. Opening mail…', C.amber)
    effect = { open: 'mail' }
  } else if (lc.startsWith('rm -rf') || lc === 'sudo rm -rf /') {
    say('Nice try. This portfolio is read-only. 🙂', C.orange)
  } else if (name === 'sudo') {
    say('guest is not in the sudoers file. This incident will be reported.', C.orange)
  } else if (['vim', 'vi', 'nano', 'emacs'].includes(name)) {
    say(`${name}: editors are disabled in guest mode. (Also: how do you exit vim?)`, C.orange)
  } else if (name === 'admin') {
    // Site owner only: stores the key that lets this browser delete any note.
    if (!arg) say('usage: admin <key> · admin logout', C.muted)
    else if (arg === 'logout') {
      say('admin key removed.', C.muted)
      effect = { admin: null }
    } else {
      say('admin key saved for this browser. Open ~/notes to moderate.', C.muted)
      effect = { admin: arg }
    }
  } else if (name === 'exit' || name === 'logout' || name === 'quit') {
    say('logout', C.muted)
    effect = { exit: true }
  } else if (appAliases[name]) {
    say(`opening ${name}…`, C.muted)
    effect = { open: appAliases[name] }
  } else {
    say(`command not found: ${head} — try 'help'`, C.orange, 'help')
  }
  return { action: 'print', lines, cwd, effect }
}

// Tab completion: command names first, then paths in the current directory.
export function complete(input: string, cwd: string): { value: string; options: string[] } {
  const parts = input.split(' ')
  if (parts.length === 1) {
    const opts = commandNames.filter((c) => c.startsWith(parts[0].toLowerCase()))
    return opts.length === 1 ? { value: opts[0] + ' ', options: [] } : { value: commonPrefix(input, opts), options: opts }
  }
  const word = parts[parts.length - 1]
  const cmdName = parts[0].toLowerCase()
  let candidates: string[]
  let base = ''
  if (cmdName === 'project') candidates = projects.map((p) => p.slug)
  else if (cmdName === 'open') candidates = ['projects', 'photos', 'notes', 'cv', 'mail', 'about']
  else if (cmdName === 'cv') candidates = ['en', 'hr']
  else {
    const slash = word.lastIndexOf('/')
    base = slash >= 0 ? word.slice(0, slash + 1) : ''
    const dir = lookup(resolve(cwd, base || '.') ?? '~')
    candidates = dir && dir.type === 'dir' ? listing(dir).map((n) => base + n) : []
  }
  const opts = candidates.filter((c) => c.toLowerCase().startsWith(word.toLowerCase()))
  const head = parts.slice(0, -1).join(' ') + ' '
  if (opts.length === 1) return { value: head + opts[0] + (opts[0].endsWith('/') ? '' : ' '), options: [] }
  return { value: head + commonPrefix(word, opts), options: opts.map((o) => o.slice(base.length)) }
}

function commonPrefix(fallback: string, opts: string[]) {
  if (!opts.length) return fallback
  let p = opts[0]
  for (const o of opts) while (!o.toLowerCase().startsWith(p.toLowerCase())) p = p.slice(0, -1)
  return p.length >= fallback.length ? p : fallback
}
