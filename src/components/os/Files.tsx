import { useState } from 'react'
import { photoCategories, photoCode, photos, profile, projects, toneColor } from '#/data/portfolio'
import type { PhotoCategory } from '#/data/portfolio'
import type { Folder, WindowId } from '#/lib/os'
import { useNotes } from '#/lib/useNotes'
import { useCvPicker } from './CvPicker'
import { NotesFolder } from './Notes'
import type { OpenMenu } from './Notes'
import { Shot } from './shared'

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
  const [photoFilter, setPhotoFilter] = useState<'All' | PhotoCategory>('All')
  const notes = useNotes(false)
  const count =
    folder === 'projects'
      ? projects.length
      : folder === 'photos'
        ? photos.filter((p) => photoFilter === 'All' || p.category === photoFilter).length
        : notes.notes.length
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[180px_minmax(0,1fr)]">
      <Places folder={folder} setFolder={setFolder} count={count} openWin={openWin} />
      {folder === 'projects' && <ProjectsFolder />}
      {folder === 'photos' && <PhotosFolder filter={photoFilter} setFilter={setPhotoFilter} />}
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
          {f === folder ? `▸ ~/${f}` : `  ~/${f}`}
        </button>
      ))}
      <button type="button" className={item} onClick={() => openWin('cv')}>
        {'  ~/docs/cv.pdf'}
      </button>
      <button type="button" className={item} onClick={openCv}>
        {'  download cv ↓'}
      </button>
      <a href={profile.github} target="_blank" rel="noreferrer" className={item}>
        {'  github ↗'}
      </a>
      <div className="mt-auto p-2 text-[11px] text-dim">{count} items</div>
    </nav>
  )
}

function ProjectsFolder() {
  const [sel, setSel] = useState(0)
  const p = projects[sel]
  return (
    <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_270px]">
      <div className="thin-scroll flex flex-col gap-3 overflow-auto p-3.5">
        <div className="flex justify-between text-[11px] text-dim">
          <span>~/projects</span>
          <span>click a folder to preview</span>
        </div>
        <ul className="m-0 grid list-none grid-cols-3 gap-2.5 p-0">
          {projects.map((pr, i) => (
            <li key={pr.slug}>
              <button
                type="button"
                aria-pressed={i === sel}
                onClick={() => setSel(i)}
                className="flex h-full w-full cursor-pointer flex-col gap-2 border bg-ink p-2 text-left text-paper hover:bg-deep"
                style={{ borderColor: i === sel ? '#efab30' : '#1c3132' }}
              >
                <Shot
                  src={pr.image}
                  tone={toneColor[pr.tone]}
                  alt={`${pr.name} screenshot`}
                  label={`${pr.slug}/`}
                  className="h-24 w-full p-1.5"
                  labelClassName="text-[10px] font-medium text-muted truncate"
                />
                <h3 className="m-0 font-sans text-[15px] font-bold">{pr.name}</h3>
                <span className="text-[10px] font-medium text-amber uppercase">{pr.stack}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <aside aria-live="polite" className="thin-scroll flex flex-col gap-3 overflow-auto border-l border-deep p-3.5">
        <Shot src={p.image} tone={toneColor[p.tone]} alt={`${p.name} screenshot`} label={`screenshot · ${p.slug}`} className="h-40 w-full flex-none p-2" />
        <div className="font-sans text-2xl leading-[1.05] font-extrabold tracking-[-0.02em]">{p.name}</div>
        <div className="text-[11px] text-amber uppercase">{p.stack}</div>
        <p className="m-0 font-sans text-sm leading-[1.45] text-muted">{p.desc}</p>
        <div className="mt-auto flex gap-2">
          <a href={p.href} target="_blank" rel="noreferrer" className="flex-1 bg-amber p-2.5 text-center text-xs font-bold text-ink no-underline hover:bg-signal">
            GitHub ↗
          </a>
          {p.demo && (
            <a
              href={p.demo}
              target="_blank"
              rel="noreferrer"
              className="flex-1 border border-teal p-2.5 text-center text-xs text-paper no-underline hover:border-amber hover:text-amber"
            >
              Live demo
            </a>
          )}
        </div>
      </aside>
    </div>
  )
}

function PhotosFolder({ filter, setFilter }: { filter: 'All' | PhotoCategory; setFilter: (f: 'All' | PhotoCategory) => void }) {
  const [viewer, setViewer] = useState(-1)
  const list = photos.map((p, i) => ({ ...p, i })).filter((p) => filter === 'All' || p.category === filter)
  const step = (dir: number) => {
    const j = list.findIndex((p) => p.i === viewer)
    setViewer(list[(j + dir + list.length) % list.length].i)
  }
  const cur = viewer >= 0 ? photos[viewer] : null
  return (
    <div className="relative flex min-h-0 flex-col">
      <div role="tablist" aria-label="Filter photos" className="flex items-center gap-1.5 border-b border-deep px-3 py-2.5">
        {photoCategories.map((c) => (
          <button
            key={c}
            role="tab"
            type="button"
            aria-selected={c === filter}
            onClick={() => {
              setFilter(c)
              setViewer(-1)
            }}
            className={`cursor-pointer border px-2.5 py-1.5 font-mono text-[11px] font-medium ${c === filter ? 'border-amber bg-amber text-ink' : 'border-teal bg-transparent text-paper'}`}
          >
            {c}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-dim">~/photos</span>
      </div>
      <ul className="thin-scroll m-0 grid flex-1 list-none grid-cols-6 content-start gap-2 overflow-auto p-3">
        {list.map((p) => (
          <li key={p.i} style={{ gridColumn: `span ${filter === 'All' ? p.span : 3}` }}>
            <button type="button" onClick={() => setViewer(p.i)} className="block w-full cursor-zoom-in border border-deep p-0 hover:border-amber" aria-label={`Open ${p.caption}`}>
              <Shot
                src={p.src}
                tone={toneColor[p.tone]}
                alt={p.caption}
                label={`${photoCode(p.i)} · ${p.caption}`}
                className="w-full p-2"
                style={{ height: filter === 'All' ? p.height : 210 }}
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
            if (e.key === 'Escape') setViewer(-1)
            if (e.key === 'ArrowLeft') step(-1)
            if (e.key === 'ArrowRight') step(1)
          }}
          className="absolute inset-0 z-[3] flex flex-col gap-2.5 bg-ink/97 p-3.5"
        >
          <Shot
            src={cur.src}
            tone={toneColor[cur.tone]}
            alt={cur.caption}
            className="flex-1 items-center justify-center border border-teal"
            label={cur.src ? undefined : `full‑res photo · ${cur.caption}`}
            labelClassName="text-[11px] text-muted m-auto"
          />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber">{photoCode(viewer)}</span>
            <span>{cur.caption}</span>
            <span className="text-dim">· {cur.category}</span>
            <button type="button" aria-label="Previous" onClick={() => step(-1)} className="ml-auto h-[30px] w-[34px] cursor-pointer border border-teal bg-transparent text-paper hover:border-amber">
              ‹
            </button>
            <button type="button" aria-label="Next" onClick={() => step(1)} className="h-[30px] w-[34px] cursor-pointer border border-teal bg-transparent text-paper hover:border-amber">
              ›
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => setViewer(-1)}
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
