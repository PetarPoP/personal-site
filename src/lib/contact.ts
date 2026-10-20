import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { env } from 'cloudflare:workers'
import { profile } from '#/data/portfolio'
import { db } from '#/lib/db'

// The contact form (Contact.tsx). Each message is kept in D1 and emailed to Petar through
// Cloudflare Email Service (the MAIL binding in wrangler.jsonc). Sending to his own verified
// address is free on the Workers free plan; it needs Email Routing on petarpopovic.com.

export type ContactInput = { name: string; email: string; message: string; website?: string }
export type ContactResult = { ok: true } | { ok: false; error: string }

const LIMIT = 5 // messages per hour from one address

type Mailer = { send(m: { to: string; from: { email: string; name: string }; replyTo: { email: string; name: string }; subject: string; text: string }): Promise<unknown> }

export const sendMessage = createServerFn({ method: 'POST' })
  .validator((d: ContactInput) => ({
    name: String(d?.name ?? '').trim().slice(0, 120),
    email: String(d?.email ?? '').trim().slice(0, 200),
    message: String(d?.message ?? '').trim().slice(0, 5000),
    website: String(d?.website ?? ''),
  }))
  .handler(async ({ data }): Promise<ContactResult> => {
    // Bots fill in the hidden "website" field; they are told it worked.
    if (data.website) return { ok: true }
    if (!data.name || !data.message) return { ok: false, error: 'Please add your name and a message.' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { ok: false, error: 'That email address doesn’t look right.' }

    const ip = getRequestHeader('cf-connecting-ip') ?? 'local'
    const d = await db()
    if (d) {
      await d.prepare('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, at INTEGER NOT NULL, ip TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, body TEXT NOT NULL, sent INTEGER NOT NULL DEFAULT 0)').run()
      const recent = await d.prepare('SELECT COUNT(*) AS n FROM messages WHERE ip = ? AND at > ?').bind(ip, Date.now() - 3600_000).first<{ n: number }>()
      if ((recent?.n ?? 0) >= LIMIT) return { ok: false, error: 'That’s a lot of messages. Please try again in an hour, or email me directly.' }
    }
    const row = await d?.prepare('INSERT INTO messages (at, ip, name, email, body) VALUES (?, ?, ?, ?, ?) RETURNING id').bind(Date.now(), ip, data.name, data.email, data.message).first<{ id: number }>()

    const mail = (env as { MAIL?: Mailer }).MAIL
    if (process.env.NODE_ENV !== 'production' && process.env.CONTACT_MOCK) {
      console.log('contact form:', data)
      return { ok: true }
    }
    if (!mail) return row ? { ok: true } : { ok: false, error: 'Messages can’t be sent right now.' }
    try {
      await mail.send({
        to: profile.email,
        from: { email: 'contact@petarpopovic.com', name: 'petarpopovic.com' },
        replyTo: { email: data.email, name: data.name },
        subject: `Message from ${data.name}`,
        text: `${data.message}\n\n— ${data.name} <${data.email}>\nSent from the contact form on petarpopovic.com.`,
      })
      if (row) await d?.prepare('UPDATE messages SET sent = 1 WHERE id = ?').bind(row.id).run()
      return { ok: true }
    } catch (e) {
      console.error('contact email failed', e)
      // Saved but not emailed is still received.
      return row ? { ok: true } : { ok: false, error: 'Messages can’t be sent right now.' }
    }
  })
