import { env } from 'cloudflare:workers'

// Cloudflare D1 (the DB binding in wrangler.jsonc) holds guest notes and small saved values.
// The tables are created on first use, so a fresh database needs no setup.

const schema = [
  `CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    text TEXT NOT NULL,
    sig TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    owner TEXT NOT NULL,
    ip TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
]

let ready: Promise<unknown> | null = null

export async function db(): Promise<D1Database | null> {
  const d = env.DB as D1Database | undefined
  if (!d) return null
  ready ??= d.batch(schema.map((sql) => d.prepare(sql))).catch((e) => {
    ready = null
    throw e
  })
  await ready
  return d
}

export async function getValue<T>(key: string): Promise<T | null> {
  const row = await (await db())?.prepare('SELECT value FROM kv WHERE key = ?').bind(key).first<{ value: string }>()
  return row ? (JSON.parse(row.value) as T) : null
}

export async function setValue(key: string, value: unknown) {
  await (await db())
    ?.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, JSON.stringify(value))
    .run()
}
