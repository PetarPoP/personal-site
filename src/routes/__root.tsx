import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'
import { jsonLd, site } from '#/lib/seo'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: site.title },
      { name: 'description', content: site.description },
      { name: 'author', content: 'Petar Popović' },
      { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1' },
      { name: 'theme-color', content: '#e9dfca' },
      // Link previews.
      // A personal page: Open Graph "profile" with the name split out.
      { property: 'og:type', content: 'profile' },
      { property: 'profile:first_name', content: 'Petar' },
      { property: 'profile:last_name', content: 'Popović' },
      { property: 'profile:username', content: 'PetarPoP' },
      { property: 'og:site_name', content: 'Petar Popović' },
      { property: 'og:locale', content: 'en_US' },
      { property: 'og:title', content: site.title },
      { property: 'og:description', content: site.description },
      { property: 'og:image', content: site.image },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: 'Petar Popović, firmware & web engineer' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: site.title },
      { name: 'twitter:description', content: site.description },
      { name: 'twitter:image', content: site.image },
      { name: 'twitter:image:alt', content: 'Petar Popović, firmware & web engineer' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.svg?v=3', type: 'image/svg+xml' },
      { rel: 'icon', href: '/favicon-32.png?v=3', type: 'image/png', sizes: '32x32' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png?v=3' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=JetBrains+Mono:wght@400;600&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
      // The whole site as plain text for AI assistants.
      { rel: 'alternate', type: 'text/markdown', href: '/llms.txt', title: 'Petar Popović (plain text for AI assistants)' },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(jsonLd) }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
