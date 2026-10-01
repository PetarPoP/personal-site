// Gets a Spotify refresh token for the site's Spotify app.
//
//   SPOTIFY_CLIENT_ID=… SPOTIFY_CLIENT_SECRET=… npm run spotify-token
//
// Open the printed link, approve, and the refresh token is printed here.
// http://127.0.0.1:3000/callback must be a Redirect URI of the app (developer.spotify.com).
import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'

const id = process.env.SPOTIFY_CLIENT_ID?.trim()
const secret = process.env.SPOTIFY_CLIENT_SECRET?.trim()
const port = Number(process.env.PORT ?? 3000)
const redirect = `http://127.0.0.1:${port}/callback`
if (!id || !secret) {
  console.error('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first.')
  process.exit(1)
}

const state = randomBytes(12).toString('hex')
const authorize = new URL('https://accounts.spotify.com/authorize')
authorize.search = new URLSearchParams({
  client_id: id,
  response_type: 'code',
  redirect_uri: redirect,
  scope: 'user-read-currently-playing user-read-recently-played',
  state,
}).toString()

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', redirect)
  if (url.pathname !== '/callback') return res.writeHead(404).end()
  const code = url.searchParams.get('code')
  if (url.searchParams.get('state') !== state || !code) {
    res.writeHead(400).end(`Spotify said: ${url.searchParams.get('error') ?? 'bad request'}`)
    return
  }
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect }),
  })
  const json = await r.json()
  if (!r.ok || !json.refresh_token) {
    res.writeHead(500).end('Could not get a token. See the terminal.')
    console.error(json)
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Done. The refresh token is in your terminal; you can close this tab.')
    console.log(`\nSPOTIFY_REFRESH_TOKEN=${json.refresh_token}\n`)
    console.log('Put it in Vercel → Settings → Environment Variables, then redeploy.')
  }
  server.close()
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Open this link and approve:\n\n${authorize}\n`)
})
