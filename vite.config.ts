import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The page is rendered to static HTML at build time and served by Cloudflare as a plain
// file. The Worker only runs for the photos: the album list (a server function) and
// /api/photos/<id>.
const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        autoSubfolderIndex: false,
        failOnError: true,
        // Only the pages listed below (crawling would also pick up the CV PDFs).
        crawlLinks: false,
      },
      pages: [{ path: '/', sitemap: { priority: 1, changefreq: 'weekly' } }],
      sitemap: { enabled: true, host: 'https://petarpopovic.com' },
    }),
    viteReact(),
  ],
})

export default config
