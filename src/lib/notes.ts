import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader, getRequestIP } from '@tanstack/react-start/server'
import { db } from './db'

// Guest notes in ~/notes: anyone can read them; each browser can keep up to
// NOTE_LIMIT notes and edit or delete only its own. The site owner can delete
// any note with NOTES_ADMIN_KEY. Stored in Cloudflare D1 (src/lib/db.ts).

export const NOTE_LIMIT = 3
export const MAX_NAME = 40
export const MAX_TEXT = 500
export const MAX_SIG = 40
const MAX_TOTAL = 300

export type Note = { id: string; name: string; text: string; sig: string; createdAt: number; updatedAt: number; mine: boolean }
type Stored = Omit<Note, 'mine'> & { owner: string; ip: string }
export type NotesState = { configured: boolean; notes: Note[]; mineLeft: number; admin: boolean }
export type NoteResult = { ok: true; note: Note } | { ok: false; error: string }

type Store = { all: () => Promise<Stored[]>; put: (n: Stored) => Promise<unknown>; del: (id: string) => Promise<unknown> }

type Row = { id: string; name: string; text: string; sig: string; created_at: number; updated_at: number; owner: string; ip: string }
const fromRow = (r: Row): Stored => ({
  id: r.id,
  name: r.name,
  text: r.text,
  sig: r.sig,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  owner: r.owner,
  ip: r.ip,
})

async function store(): Promise<Store | null> {
  const d = await db()
  if (!d) return null
  return {
    all: async () => (await d.prepare('SELECT * FROM notes').all<Row>()).results.map(fromRow),
    put: (n) =>
      d
        .prepare(
          `INSERT INTO notes (id, name, text, sig, created_at, updated_at, owner, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, text = excluded.text, sig = excluded.sig, updated_at = excluded.updated_at`,
        )
        .bind(n.id, n.name, n.text, n.sig, n.createdAt, n.updatedAt, n.owner, n.ip)
        .run(),
    del: (id) => d.prepare('DELETE FROM notes WHERE id = ?').bind(id).run(),
  }
}

async function sha256(value: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function identity(owner: string, admin?: string) {
  // Cloudflare puts the visitor's address in CF-Connecting-IP.
  const ip = getRequestHeader('cf-connecting-ip') ?? getRequestIP({ xForwardedFor: true }) ?? 'unknown'
  const adminKey = process.env.NOTES_ADMIN_KEY
  return {
    owner: await sha256(`owner:${owner}`),
    ip: await sha256(`ip:${ip}:${adminKey ?? 'popos'}`),
    admin: Boolean(adminKey && admin && (await sha256(admin)) === (await sha256(adminKey))),
  }
}

const isOwnerToken = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{16,64}$/.test(v)
const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').slice(0, max) : ''

const publicNote = (n: Stored, owner: string): Note => ({
  id: n.id,
  name: n.name,
  text: n.text,
  sig: n.sig,
  createdAt: n.createdAt,
  updatedAt: n.updatedAt,
  mine: n.owner === owner,
})

const byDate = (a: Stored, b: Stored) => a.createdAt - b.createdAt

function nextDefaultName(all: Stored[]) {
  const taken = new Set(all.map((n) => n.name.toLowerCase()))
  let i = 1
  while (taken.has(`note${i}.txt`)) i++
  return `note${i}.txt`
}

function normaliseName(raw: string) {
  let name = raw.trim().replace(/\s+/g, ' ')
  if (!name) return ''
  if (!/\.txt$/i.test(name)) name += '.txt'
  return name
}

type Auth = { owner: string; admin?: string }
const authValidator = (d: unknown) => {
  const v = d as Partial<Auth>
  if (!isOwnerToken(v?.owner)) throw new Error('bad owner token')
  return { owner: v.owner, admin: typeof v.admin === 'string' ? v.admin.slice(0, 200) : undefined }
}

export const listNotes = createServerFn({ method: 'POST' })
  .validator(authValidator)
  .handler(async ({ data }): Promise<NotesState> => {
    const s = await store()
    if (!s) return { configured: false, notes: [], mineLeft: 0, admin: false }
    const me = await identity(data.owner, data.admin)
    const all = (await s.all()).sort(byDate)
    const used = all.filter((n) => n.owner === me.owner).length
    return { configured: true, notes: all.map((n) => publicNote(n, me.owner)), mineLeft: Math.max(0, NOTE_LIMIT - used), admin: me.admin }
  })

export const saveNote = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const v = d as Record<string, unknown>
    return {
      ...authValidator(d),
      id: typeof v.id === 'string' ? v.id.slice(0, 64) : undefined,
      name: clean(v.name, MAX_NAME + 4),
      text: clean(v.text ?? '', MAX_TEXT + 1).replace(/\u0009/g, '  '),
      sig: clean(v.sig ?? '', MAX_SIG + 1).replace(/\n/g, ' '),
    }
  })
  .handler(async ({ data }): Promise<NoteResult> => {
    const s = await store()
    if (!s) return { ok: false, error: 'Notes are not connected yet.' }
    if (!data.text.trim()) return { ok: false, error: 'Write something first.' }
    if (data.text.length > MAX_TEXT) return { ok: false, error: `Keep it under ${MAX_TEXT} characters.` }
    if (data.sig.length > MAX_SIG) return { ok: false, error: `Signature: up to ${MAX_SIG} characters.` }
    const me = await identity(data.owner, data.admin)
    const all = await s.all()
    const existing = data.id ? all.find((n) => n.id === data.id) : undefined
    if (data.id && !existing) return { ok: false, error: 'That note no longer exists.' }
    if (existing && existing.owner !== me.owner) return { ok: false, error: 'You can only edit your own notes.' }
    if (!existing) {
      const used = all.filter((n) => n.owner === me.owner).length
      if (used >= NOTE_LIMIT) return { ok: false, error: `You can leave up to ${NOTE_LIMIT} notes.` }
      if (all.length >= MAX_TOTAL) return { ok: false, error: 'The notes folder is full.' }
    }
    const others = all.filter((n) => n.id !== existing?.id)
    const name = normaliseName(data.name) || existing?.name || nextDefaultName(others)
    if (name.length > MAX_NAME) return { ok: false, error: `File name: up to ${MAX_NAME} characters.` }
    if (!/^[\p{L}\p{N} ._()-]+\.txt$/iu.test(name)) return { ok: false, error: 'File name: letters, numbers, spaces, . _ - ( ) only.' }
    if (others.some((n) => n.name.toLowerCase() === name.toLowerCase())) return { ok: false, error: `${name} already exists.` }
    const now = Date.now()
    const note: Stored = existing
      ? { ...existing, name, text: data.text, sig: data.sig.trim(), updatedAt: now }
      : { id: crypto.randomUUID(), name, text: data.text, sig: data.sig.trim(), createdAt: now, updatedAt: now, owner: me.owner, ip: me.ip }
    await s.put(note)
    return { ok: true, note: publicNote(note, me.owner) }
  })

export const deleteNote = createServerFn({ method: 'POST' })
  .validator((d: unknown) => ({ ...authValidator(d), id: String((d as Record<string, unknown>).id ?? '').slice(0, 64) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const s = await store()
    if (!s) return { ok: false, error: 'Notes are not connected yet.' }
    const me = await identity(data.owner, data.admin)
    const note = (await s.all()).find((n) => n.id === data.id)
    if (!note) return { ok: true }
    if (note.owner !== me.owner && !me.admin) return { ok: false, error: 'You can only delete your own notes.' }
    await s.del(note.id)
    return { ok: true }
  })
