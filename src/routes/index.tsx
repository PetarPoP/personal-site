import { useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Desktop } from "#/components/os/Desktop";
import { Mobile } from "#/components/os/Mobile";
import { CvPickerProvider } from "#/components/os/CvPicker";
import { Toaster } from "#/components/os/Toaster";
import { NotesProvider } from "#/lib/useNotes";
import { appFromSlug, apps, appSlugs } from "#/lib/os";
import type { AppId } from "#/lib/os";
import { useMediaQuery } from "#/lib/hooks";

export const Route = createFileRoute("/")({
  // ?app=projects|photos|notes|cv|mail|terminal|about opens that window or app.
  validateSearch: (search: Record<string, unknown>): { app?: string } =>
    typeof search.app === "string" && appSlugs.includes(search.app)
      ? { app: search.app }
      : {},
  component: Home,
});

function Home() {
  const { app } = Route.useSearch();
  const initialApp = appFromSlug(app);
  const navigate = useNavigate({ from: "/" });
  // Desktop shell from 1024px up, phone shell below. Both render server-side;
  // CSS shows the right one and only that one boots.
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const syncUrl = useCallback(
    (id: AppId | null) => {
      const slug = id && id !== "term" ? apps[id].slug : undefined;
      navigate({
        search: slug ? { app: slug } : {},
        replace: true,
        resetScroll: false,
      });
    },
    [navigate],
  );

  return (
    <NotesProvider>
      <CvPickerProvider>
        <noscript>
          <style>{"[data-boot]{display:none!important}"}</style>
        </noscript>
        <main className="max-lg:hidden">
          <Desktop
            enabled={isDesktop}
            initialApp={initialApp}
            onActiveChange={syncUrl}
          />
        </main>
        <main className="lg:hidden">
          <Mobile
            enabled={isDesktop === null ? null : !isDesktop}
            initialApp={initialApp}
            onActiveChange={syncUrl}
          />
        </main>
        <Toaster mobile={isDesktop === false} />
      </CvPickerProvider>
    </NotesProvider>
  );
}
