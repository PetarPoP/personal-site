import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'

const description =
  'Petar Popović — computer science student, web developer (Next.js, React) and photographer from Livno, BiH.'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Petar Popović — Developer & Photographer' },
      { name: 'description', content: description },
      { name: 'theme-color', content: '#0d1b1c' },
      { property: 'og:title', content: 'Petar Popović — Developer & Photographer' },
      { property: 'og:description', content: description },
    ],
    links: [
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'icon', href: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
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
