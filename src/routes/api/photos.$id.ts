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

        const res = await fetch(`${share.origin}/api/assets/${params.id}/thumbnail?size=${size}&${share.auth}`, {
          headers: { ...immichHeaders, Accept: 'image/*' },
        })
        if (!res.ok || !res.body) return new Response('Photo unavailable', { status: res.status === 404 ? 404 : 502, headers: { 'Cache-Control': 'no-store' } })

        return new Response(res.body, {
          headers: {
            'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
            // Browsers keep it for an hour and Vercel's edge for a day, so Petar's server is
            // asked about each photo rarely. Nothing is stored beyond these caches.
            'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
          },
        })
      },
    },
  },
})
