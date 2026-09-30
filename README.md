# Petar Popović — portfolio

Personal CV / portfolio site built with [TanStack Start](https://tanstack.com/start) and Tailwind CSS v4,
implementing the "3a Neon viewfinder" direction from the Claude Design project.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (SSR) into dist/
```

## Where things live

- `src/data/portfolio.ts` — all copy: name, facts, projects, photos, experience, email.
  Put photos/screenshots in `public/` and set `src` / `image` / `portrait` to swap out the striped placeholders.
- `public/cv.pdf` — the file behind "Download CV.pdf".
- `src/styles.css` — palette (`@theme` tokens: ink, deep, teal, mist, amber, signal, paper) and utilities.
- `src/lib/scroll-fx.ts` — one rAF loop driving all scroll effects via `data-fx` attributes
  (smooth wheel scroll, parallax, glitch on fast scroll, text scramble, marquee, pinned project swap,
  horizontal photo strip, HUD readouts). Respects `prefers-reduced-motion`; touch devices keep native scrolling.
- `src/components/` — one component per section, plus the camera HUD overlay.
