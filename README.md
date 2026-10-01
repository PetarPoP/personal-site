# Petar Popović — portfolio

Personal CV / portfolio site built with [TanStack Start](https://tanstack.com/start) and Tailwind CSS v4.
The design is "POP/OS": the site boots like an operating system.

- **Desktop (≥1024px):** boot log → splash → windowed desktop with a top bar, desktop icons, dock,
  draggable windows (Terminal, Files, Photos, CV viewer, Mail) and a working terminal.
- **Mobile (<1024px):** phone boot → lock screen → home screen; apps slide up full screen.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (SSR)
```

## Where things live

- `src/data/portfolio.ts` — all copy: profile, projects, photos, CV (experience, education, skills), boot log.
  Put photos/screenshots in `public/` and set `src` / `image` / `portrait` / `lockWallpaper` to swap out the striped placeholders.
- `public/cv.pdf`, `public/cv-hr.pdf` — the EN/HR CVs behind every "Download CV" button (a language picker opens first).
- `src/lib/os.ts` — app list and clock formatting.
- `src/lib/terminal.ts` — the terminal: a small fake filesystem and the command parser shared by desktop and mobile.
- `src/lib/notes.ts` — server functions for guest notes (`~/notes`); `src/lib/useNotes.tsx` is the client side.
- `src/components/os/` — `Desktop.tsx` (windows, draggable icons, right-click menu), `Files.tsx` (one explorer for
  ~/projects, ~/photos, ~/notes), `Notes.tsx`, `Terminal.tsx`, `Mobile.tsx`, shared pieces and the CV picker.
- `src/styles.css` — palette (`@theme` tokens) and utilities.

Deep links: `/?app=projects|photos|notes|cv|mail|about` opens that window/app directly and skips the boot.
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
