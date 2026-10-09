import { env } from 'cloudflare:workers'

// Cloudflare D1 (the DB binding in wrangler.jsonc) holds small saved values, such as the newest
// Spotify refresh token. The table is created on first use, so a fresh database needs no setup.

let ready: Promise<unknown> | null = null

export async function db(): Promise<D1Database | null> {
  const d = env.DB as D1Database | undefined
  if (!d) return null
  ready ??= d
    .prepare('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
    .run()
    .catch((e) => {
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
