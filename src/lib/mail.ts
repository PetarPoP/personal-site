import { createServerFn } from '@tanstack/react-start'
import { getRequestIP } from '@tanstack/react-start/server'
import { Redis } from '@upstash/redis'
import { profile } from '#/data/portfolio'

// The Mail app sends straight to Petar through Resend (RESEND_API_KEY). The visitor's address
// goes in Reply-To, so answering the email answers them. MAIL_TO and MAIL_FROM are optional.

export const MAX_SUBJECT = 120
export const MAX_MESSAGE = 4000
const PER_HOUR = 5

export type MailResult = { ok: true } | { ok: false; error: string }

const env = (name: string) => process.env[name]?.trim().replace(/^(['"])(.*)\1$/, '$2').trim() || undefined
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// At most PER_HOUR messages per visitor (IP) per hour, counted in Upstash or in memory.
const memory = new Map<string, { n: number; until: number }>()
async function allowed(ip: string) {
  const key = `popos:mail:${ip}`
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) {
    try {
      const redis = new Redis({ url, token })
      const n = await redis.incr(key)
      if (n === 1) await redis.expire(key, 3600)
      return n <= PER_HOUR
    } catch (e) {
      console.error('[mail] rate limit check failed', e)
    }
  }
  const now = Date.now()
  const cur = memory.get(key)
  const next = cur && cur.until > now ? { ...cur, n: cur.n + 1 } : { n: 1, until: now + 3600_000 }
  memory.set(key, next)
  return next.n <= PER_HOUR
}

async function sha256(value: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(buf)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const sendMail = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const v = (d ?? {}) as Record<string, unknown>
    return {
      from: String(v.from ?? '').trim().slice(0, 200),
      subject: String(v.subject ?? '').trim().slice(0, MAX_SUBJECT),
      message: String(v.message ?? '').trim().slice(0, MAX_MESSAGE),
      // Hidden field only bots fill in.
      website: String(v.website ?? ''),
    }
  })
  .handler(async ({ data }): Promise<MailResult> => {
    if (!EMAIL.test(data.from)) return { ok: false, error: 'Add your email so Petar can reply.' }
    if (!data.message) return { ok: false, error: 'Write a message first.' }
    // Pretend it worked so bots don't retry.
    if (data.website) return { ok: true }

    const ip = await sha256(`mail:${getRequestIP({ xForwardedFor: true }) ?? 'unknown'}`)
    if (!(await allowed(ip))) return { ok: false, error: 'Too many messages for now. Try again in an hour.' }

    const subject = data.subject || 'Hello from your website'
    const key = env('RESEND_API_KEY')
    if (!key) {
      if (process.env.NODE_ENV !== 'production') {
        // Local development: show what would be sent.
        console.log('[mail] (not sent, no RESEND_API_KEY)', { ...data, subject })
        return { ok: true }
      }
      return { ok: false, error: `Mail isn't set up yet. Write to ${profile.email} directly.` }
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env('MAIL_FROM') ?? 'POP/OS <onboarding@resend.dev>',
          to: [env('MAIL_TO') ?? profile.email],
          reply_to: data.from,
          subject: `[pop-os] ${subject}`,
          text: `${data.message}\n\n— ${data.from}`,
        }),
      })
      if (!res.ok) {
        console.error('[mail] Resend refused', res.status, await res.text().catch(() => ''))
        return { ok: false, error: `Couldn't send right now. Write to ${profile.email} directly.` }
      }
      return { ok: true }
    } catch (e) {
      console.error('[mail]', e)
      return { ok: false, error: `Couldn't send right now. Write to ${profile.email} directly.` }
    }
  })
