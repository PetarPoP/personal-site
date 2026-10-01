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
- `src/lib/os.ts` — app list, the terminal command parser shared by desktop and mobile, clock formatting.
- `src/components/os/` — `Desktop.tsx`, `Mobile.tsx`, shared pieces (`shared.tsx`) and the CV picker.
- `src/styles.css` — palette (`@theme` tokens) and utilities.

Deep links: `/?app=projects|photos|cv|mail|about` opens that window/app directly and skips the boot.
The boot plays once per browser session and is skipped with `prefers-reduced-motion`.
The Mail app has no backend: "Send" opens the visitor's mail app with the message filled in.
