# Petar Popović — portfolio

Personal CV / portfolio site built with [TanStack Start](https://tanstack.com/start) and Tailwind CSS v4.
The design is "POP/OS": the site boots like an operating system.

- **Desktop (≥1024px):** boot log → splash → windowed desktop with a top bar, desktop icons, dock,
  draggable windows (Terminal, Files, CV viewer, Mail, Spotify) and a working terminal. Icons snap to a grid inside the
  corner brackets; drag across the desktop (or ~/notes) to select several. Snap Layouts work like Windows 11: hover a
  window's maximise button for layouts, or drag a window to a screen edge, corner or the top bar. Toasts confirm actions or say why one isn't allowed.
- **Mobile (<1024px):** phone boot → lock screen → home screen; apps slide up full screen.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (SSR)
```

## Where things live

- `src/data/portfolio.ts` — all copy: profile, projects, photos, CV (experience, education, skills), boot log.
  Put photos/screenshots in `public/` and set `src` / `image` / `portrait` / `lockWallpaper` to swap out the striped placeholders.
- `public/petar-popovic-cv-en.pdf`, `public/petar-popovic-cv-hr.pdf` — the EN/HR CVs behind every "Download CV" button (a language picker opens first). The CV window shows
  `public/petar-popovic-cv-{en,hr}.png`, page images of those PDFs. After changing a PDF, regenerate them with
  `pdftoppm -r 200 -png -singlefile public/petar-popovic-cv-en.pdf public/petar-popovic-cv-en` (and the same for `hr`).
- `src/lib/os.ts` — app list and clock formatting.
- `src/lib/terminal.ts` — the terminal: a small fake filesystem and the command parser shared by desktop and mobile.
- `src/lib/photos.ts` — reads the Immich album for ~/photos; `src/routes/api/photos.$id.ts` streams each photo.
- `src/lib/spotify.ts` — server function for the Spotify app (current or last played song); `src/components/os/Spotify.tsx` shows it.
- `src/lib/notes.ts` — server functions for guest notes (`~/notes`); `src/lib/useNotes.tsx` is the client side.
- `src/components/os/` — `Desktop.tsx` (windows, draggable icons, right-click menu), `Files.tsx` (one explorer for
  ~/projects, ~/photos, ~/notes), `Notes.tsx`, `Terminal.tsx`, `Mobile.tsx`, shared pieces and the CV picker.
- `src/styles.css` — palette (`@theme` tokens) and utilities.

Deep links: `/?app=projects|photos|notes|cv|mail|spotify|about` opens that window/app directly and skips the boot.
The boot plays once per browser session and is skipped with `prefers-reduced-motion`.
The Mail app has no backend: "Send" opens the visitor's mail app with the message filled in.

## Guest notes

Visitors can leave `.txt` notes in `~/notes` (right-click the folder → New note). Everyone sees them; each browser can keep
up to 3 (also capped per IP) and can edit, rename or delete only its own. Notes are stored in Upstash Redis:

1. In Vercel → the project → Storage (Marketplace) → add **Upstash for Redis** and connect it to this project.
   That sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` (the `UPSTASH_REDIS_REST_*` names work too).
2. Optional: set `NOTES_ADMIN_KEY` to a long secret. Typing `admin <key>` in the terminal then lets that browser
   delete any note (`admin logout` removes it).
3. Redeploy.

Without those variables, `npm run dev` keeps notes in memory, and production shows "Notes aren't connected yet."

## Spotify

The Spotify app shows the song playing right now, or the last one played. Set these in Vercel → Settings → Environment Variables
and redeploy:

- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` — from the app at developer.spotify.com
- `SPOTIFY_REFRESH_TOKEN` — a refresh token for your account with the `user-read-currently-playing` and
  `user-read-recently-played` scopes. To get one, add `http://127.0.0.1:3000/callback` as a Redirect URI of the
  Spotify app, run `SPOTIFY_CLIENT_ID=… SPOTIFY_CLIENT_SECRET=… npm run spotify-token`, open the printed link and
  approve. The token is printed in the terminal.

When Spotify hands out a newer refresh token, the site keeps it in Upstash, so the one in Vercel only needs replacing if
Spotify says it was revoked (the Spotify app shows the reason).

Spotify is asked at most every 15 seconds per server instance. Locally, `SPOTIFY_MOCK=1 npm run dev` shows a fixed song
(`SPOTIFY_MOCK=recent` shows it as last played; `SPOTIFY_MOCK_IMAGE=<url>` adds a cover).

## Photos (Immich)

~/photos shows one album from Petar's own Immich server, read through the album's public share link. Add in Vercel:

- `IMMICH_SHARE_URL` — the album's share link, e.g. `https://photos.example.com/share/<key>` (a `/s/<slug>` link works too)

The server reads the album (at most every 5 minutes) and every image goes through `/api/photos/<id>`, so visitors never
see the server's address or the share key, and the photos are never copied anywhere. The grid uses Immich's small thumbnails and the viewer shows
the thumbnail at once while the larger preview loads. Browsers cache each photo for a week and Vercel's edge for a month. Captions come from the photo's description in Immich, else its city, else its date.
Without `IMMICH_SHARE_URL` the striped placeholders from `portfolio.ts` are shown.

Note: in `npm run dev`, Vite answers image requests to `/api/photos/…` itself, so the photos only load in a build
(`npm run build && node .output/server/index.mjs`).
