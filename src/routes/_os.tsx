import { useCallback } from 'react'
import { createFileRoute, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Desktop } from '#/components/os/Desktop'
import { Mobile } from '#/components/os/Mobile'
import { CvPickerProvider } from '#/components/os/CvPicker'
import { Toaster } from '#/components/os/Toaster'
import { NotesProvider } from '#/lib/useNotes'
import { appFromSlug, apps } from '#/lib/os'
import type { AppId } from '#/lib/os'
import { useMediaQuery } from '#/lib/hooks'

// POP/OS itself. It stays mounted while the address changes between / and /<app>
// (the child routes only set the page's title and description).
export const Route = createFileRoute('/_os')({
  component: Home,
})

function Home() {
  const { app } = useParams({ strict: false })
  // Old /?app=<slug> links are redirected to /<slug>, but the app should already open on the first render.
  const { app: legacy } = useSearch({ strict: false }) as { app?: string }
  const initialApp = appFromSlug(app ?? legacy)
  const navigate = useNavigate()
  // Desktop shell from 1024px up, phone shell below. Both render server-side;
  // CSS shows the right one and only that one boots.
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const syncUrl = useCallback(
    // push adds a history entry, so the phone's back button closes the app.
    (id: AppId | null, push = false) => {
      const opts = { replace: !push, resetScroll: false }
      if (id) navigate({ to: '/$app', params: { app: apps[id].slug }, ...opts })
      else navigate({ to: '/', ...opts })
    },
    [navigate],
  )

  return (
    <NotesProvider>
      <CvPickerProvider>
        <noscript>
          <style>{'[data-boot]{display:none!important}'}</style>
        </noscript>
        <main className="max-lg:hidden">
          <Desktop enabled={isDesktop} initialApp={initialApp} onActiveChange={syncUrl} />
        </main>
        <main className="lg:hidden">
          <Mobile enabled={isDesktop === null ? null : !isDesktop} initialApp={initialApp} onActiveChange={syncUrl} />
        </main>
        <Toaster mobile={isDesktop === false} />
      </CvPickerProvider>
    </NotesProvider>
  )
}
