import { useState } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight, Download, Star } from 'lucide-react'
import { profile, toneColor } from '#/data/portfolio'
import type { Repo } from '#/lib/github'
import type { Folder, WindowId } from '#/lib/os'
import { useNotes } from '#/lib/useNotes'
import { usePhotos, usePreload } from '#/lib/usePhotos'
import type { Frame } from '#/lib/usePhotos'
import { repoDate, useRepos } from '#/lib/useRepos'
import { useCvPicker } from './CvPicker'
import { NotesFolder } from './Notes'
import type { OpenMenu } from './Notes'
import { Shot, ic } from './shared'

// The desktop Files window: one explorer whose sidebar switches between
// ~/projects, ~/photos and ~/notes in place.
export function FilesWindow({
  folder,
  setFolder,
  openWin,
  openMenu,
}: {
  folder: Folder
  setFolder: (f: Folder) => void
  openWin: (id: WindowId) => void
  openMenu: OpenMenu
}) {
  const notes = useNotes(false)
  const gallery = usePhotos(folder === 'photos')
  const repos = useRepos(folder === 'projects')
  const shown = gallery.frames
  const count = folder === 'projects' ? repos.repos.length : folder === 'photos' ? shown.length : notes.notes.length
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[180px_minmax(0,1fr)]">
      <Places folder={folder} setFolder={setFolder} count={count} openWin={openWin} />
      {folder === 'projects' && <ProjectsFolder {...repos} />}
      {folder === 'photos' && <PhotosFolder gallery={gallery} list={shown} />}
      {folder === 'notes' && <NotesFolder openMenu={openMenu} />}
    </div>
  )
}

function Places({
  folder,
  setFolder,
  count,
  openWin,
}: {
  folder: Folder
  setFolder: (f: Folder) => void
  count: number
  openWin: (id: WindowId) => void
}) {
  const openCv = useCvPicker()
  const item = 'cursor-pointer border-0 bg-transparent p-2 text-left font-mono text-xs whitespace-pre text-paper no-underline hover:bg-deep'
  const here = 'cursor-default border-0 bg-deep p-2 text-left font-mono text-xs whitespace-pre text-amber'
  return (
    <nav aria-label="Places" className="flex flex-col gap-0.5 border-r border-deep px-2.5 py-3.5 text-xs">
      <div className="px-2 pb-2 text-[10px] tracking-[0.1em] text-dim">PLACES</div>
      {(['projects', 'photos', 'notes'] as const).map((f) => (
        <button key={f} type="button" aria-current={f === folder ? 'page' : undefined} className={f === folder ? here : item} onClick={() => setFolder(f)}>
          {/* Two characters wide, like the indent of the other places. */}
          {f === folder ? <ChevronRight aria-hidden className="inline-block h-[1.15em] w-[2ch] align-[-0.2em]" /> : '  '}
          {`~/${f}`}
        </button>
      ))}
      <button type="button" className={item} onClick={() => openWin('cv')}>
        {'  ~/docs/cv.pdf'}
      </button>
      <button type="button" className={item} onClick={openCv}>
        {'  download cv '}
        <Download aria-hidden className={ic} />
      </button>
      <a href={profile.github} target="_blank" rel="noreferrer" className={item}>
        {'  github '}
        <ArrowUpRight aria-hidden className={ic} />
      </a>
      <div className="mt-auto p-2 text-[11px] text-dim">{count} items</div>
    </nav>
  )
}

// Petar's public GitHub repos, newest first. Hovering one previews it on the right; clicking opens it on GitHub.
function ProjectsFolder({ repos, loading, error }: { repos: Repo[]; loading: boolean; error?: string }) {
  const [sel, setSel] = useState(0)
  const r = repos[Math.min(sel, repos.length - 1)]
  const tones = [toneColor.a, toneColor.o, toneColor.y]
  return (
    <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_270px]">
      <div className="thin-scroll flex flex-col gap-3 overflow-auto p-3.5">
        <div className="flex justify-between text-[11px] text-dim">
          <span>~/projects</span>
          <span>{loading ? 'loading from github…' : 'click a repo to open it on github'}</span>
        </div>
        {error && (
          <p className="m-0 text-xs text-dim">
            {error}{' '}
            <a href={profile.github} target="_blank" rel="noreferrer" className="text-amber">
              {profile.githubLabel} <ArrowUpRight aria-hidden className={ic} />
            </a>
          </p>
        )}
        <ul className="m-0 grid list-none grid-cols-3 gap-2.5 p-0">
          {repos.map((pr, i) => (
            <li key={pr.name}>
              <a
                href={pr.url}
                target="_blank"
                rel="noreferrer"
                onMouseEnter={() => setSel(i)}
                onFocus={() => setSel(i)}
                className="flex h-full w-full flex-col gap-2 border bg-ink p-2 text-left text-paper no-underline hover:bg-deep"
                style={{ borderColor: pr === r ? '#efab30' : '#1c3132' }}
              >
                <Shot
                  tone={tones[i % 3]}
                  alt=""
                  label={`${pr.name}/`}
                  className="h-24 w-full p-1.5"
                  labelClassName="text-[10px] font-medium text-muted truncate"
                />
                <h3 className="m-0 truncate font-sans text-[15px] font-bold">{pr.name}</h3>
                <span className="text-[10px] font-medium text-amber uppercase">{pr.language ?? 'repo'}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <aside aria-live="polite" className="thin-scroll flex flex-col gap-3 overflow-auto border-l border-deep p-3.5">
        {r && (
          <>
            <Shot tone={tones[repos.indexOf(r) % 3]} alt="" label={`github.com/${r.url.split('/').slice(-2).join('/')}`} className="h-40 w-full flex-none p-2" />
            <div className="font-sans text-2xl leading-[1.05] font-extrabold tracking-[-0.02em] break-words">{r.name}</div>
            <div className="flex gap-3 text-[11px] text-amber uppercase">
              {r.language && <span>{r.language}</span>}
              {r.stars > 0 && (
                <span>
                  <Star aria-hidden className={ic} /> {r.stars}
                </span>
              )}
              <span className="text-dim">{repoDate(r.created)}</span>
            </div>
            {r.desc && <p className="m-0 font-sans text-sm leading-[1.45] text-muted">{r.desc}</p>}
            <a href={r.url} target="_blank" rel="noreferrer" className="mt-auto bg-amber p-2.5 text-center text-xs font-bold text-ink no-underline hover:bg-signal">
              Open on GitHub <ArrowUpRight aria-hidden className={ic} />
            </a>
          </>
        )}
      </aside>
    </div>
  )
}

function PhotosFolder({
  gallery,
  list,
}: {
  gallery: ReturnType<typeof usePhotos>
  list: Frame[]
}) {
  const [viewer, setViewer] = useState<string | null>(null)
  const at = list.findIndex((p) => p.key === viewer)
  const step = (dir: number) => setViewer(list[(at + dir + list.length) % list.length].key)
  const cur = at >= 0 ? list[at] : null
  usePreload(cur ? [list[(at + 1) % list.length]?.full, list[(at - 1 + list.length) % list.length]?.full] : [])
  return (
    <div className="relative flex min-h-0 flex-col">
      <div className="flex min-h-[47px] items-center gap-1.5 border-b border-deep px-3 py-2.5">
        {!gallery.loading && !gallery.error && <span className="text-[11px] text-muted">{list.length} frames</span>}
        <span className="ml-auto text-[11px] text-dim">~/photos</span>
      </div>
      {gallery.loading && <p className="m-0 p-4 text-xs text-dim">developing film…</p>}
      {gallery.error && (
        <div className="flex flex-col gap-2 p-4 text-xs">
          <p className="m-0 text-signal">Couldn't load the photos right now.</p>
          <p className="m-0 text-dim select-text">{gallery.error}</p>
        </div>
      )}
      {gallery.live && !gallery.loading && !gallery.error && !list.length && <p className="m-0 p-4 text-xs text-dim">The album is empty.</p>}
      <ul className="thin-scroll m-0 grid flex-1 grid-flow-dense list-none grid-cols-6 content-start gap-2 overflow-auto p-3">
        {list.map((p) => (
          <li key={p.key} style={{ gridColumn: `span ${p.span}` }}>
            <button type="button" onClick={() => setViewer(p.key)} className="block w-full cursor-zoom-in border border-deep p-0 hover:border-amber" aria-label={`Open ${p.caption}`}>
              <Shot
                src={p.src}
                tone={p.tone}
                alt={p.caption}
                label={`${p.code} · ${p.caption}`}
                className="w-full p-2"
                style={{ height: p.height }}
                labelClassName="bg-ink px-1.5 py-0.5 text-[10px] font-medium text-paper"
                keepLabel
              />
            </button>
          </li>
        ))}
      </ul>
      {cur && (
        <div
          role="dialog"
          aria-label={cur.caption}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setViewer(null)
            if (e.key === 'ArrowLeft') step(-1)
            if (e.key === 'ArrowRight') step(1)
          }}
          className="absolute inset-0 z-[3] flex flex-col gap-2.5 bg-ink/97 p-3.5"
        >
          <Shot
            key={cur.key}
            src={cur.full}
            preview={cur.src !== cur.full ? cur.src : undefined}
            tone={cur.tone}
            alt={cur.caption}
            className="flex-1 items-center justify-center border border-teal"
            label={cur.full ? undefined : `full‑res photo · ${cur.caption}`}
            labelClassName="text-[11px] text-muted m-auto"
            contain
          />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber">{cur.code}</span>
            <span>{cur.caption}</span>
            {cur.meta && <span className="text-dim">· {cur.meta}</span>}
            <button type="button" aria-label="Previous" onClick={() => step(-1)} className="ml-auto h-[30px] w-[34px] cursor-pointer border border-teal bg-transparent text-paper hover:border-amber">
              <ChevronLeft aria-hidden className={ic} />
            </button>
            <button type="button" aria-label="Next" onClick={() => step(1)} className="h-[30px] w-[34px] cursor-pointer border border-teal bg-transparent text-paper hover:border-amber">
              <ChevronRight aria-hidden className={ic} />
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => setViewer(null)}
              className="h-[30px] cursor-pointer border border-teal bg-transparent px-3 font-mono text-[11px] font-medium text-paper hover:border-signal hover:bg-signal hover:text-ink"
            >
              close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
