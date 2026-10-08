import { createFileRoute } from '@tanstack/react-router'
import { immichHeaders, immichShare } from '#/lib/photos'

// Streams one photo from Petar's Immich server: /api/photos/<asset id>?size=thumbnail|preview.
// The share key stays on the server, and Immich only serves assets that are in the shared album.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const Route = createFileRoute('/api/photos/$id')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const share = immichShare()
        if (!share) return new Response('Photos are not set up', { status: 404 })
        if (!UUID.test(params.id)) return new Response('Not a photo', { status: 400 })
        const size = new URL(request.url).searchParams.get('size') === 'preview' ? 'preview' : 'thumbnail'

        // Cloudflare's cache in front of Petar's server: Worker responses aren't cached on their own.
        const edge = typeof caches === 'undefined' ? null : (caches as unknown as { default: Cache }).default
        const key = new Request(new URL(`/api/photos/${params.id}?size=${size}`, request.url))
        const hit = await edge?.match(key)
        if (hit) return hit

        const res = await fetch(`${share.origin}/api/assets/${params.id}/thumbnail?size=${size}&${share.auth}`, {
          headers: { ...immichHeaders, Accept: 'image/*' },
        })
        if (!res.ok || !res.body) return new Response('Photo unavailable', { status: res.status === 404 ? 404 : 502, headers: { 'Cache-Control': 'no-store' } })

        const photo = new Response(res.body, {
          headers: {
            'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
            // A photo never changes under its id: browsers keep it for a week and Cloudflare's
            // cache for a month, so Petar's server is asked about each photo rarely. Nothing is
            // stored beyond these caches.
            'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=604800',
          },
        })
        if (edge) await edge.put(key, photo.clone())
        return photo
      },
    },
  },
})
