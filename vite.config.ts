import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { appSlugs } from './src/lib/os.ts'

// Every page is rendered to static HTML at build time and served by Cloudflare as a plain
// file. The Worker only runs for the live parts: server functions (notes, Spotify, photos
// list, GitHub repos) and /api/photos/<id>.
const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        // /projects.html rather than /projects/index.html, so /projects is served without a
        // redirect to /projects/.
        autoSubfolderIndex: false,
        failOnError: true,
        // Only the pages listed below (crawling would also pick up the CV PDFs).
        crawlLinks: false,
      },
      pages: [
        { path: '/', sitemap: { priority: 1, changefreq: 'weekly' } },
        ...appSlugs.map((slug) => ({ path: `/${slug}`, sitemap: { priority: 0.8, changefreq: 'weekly' as const } })),
      ],
      sitemap: { enabled: true, host: 'https://petarpopovic.com' },
    }),
    viteReact(),
  ],
})

export default config
