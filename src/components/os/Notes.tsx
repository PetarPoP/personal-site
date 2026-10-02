import { useEffect, useRef, useState } from 'react'
import { CornerDownLeft, RefreshCw } from 'lucide-react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { MAX_NAME, MAX_SIG, MAX_TEXT, NOTE_LIMIT } from '#/lib/notes'
import type { Note } from '#/lib/notes'
import { useNotes } from '#/lib/useNotes'
import type { MenuItem } from './ContextMenu'
import { toast } from './Toaster'

export type OpenMenu = (e: ReactMouseEvent | { x: number; y: number }, items: MenuItem[]) => void

const fmtDate = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export const noteLimitHint = (left: number) =>
  left > 0 ? `you can leave ${left} more` : `limit of ${NOTE_LIMIT} reached`

// Edit form for a new note or one of your own.
export function NoteEditor({
  note,
  compact = false,
  focusName = false,
  onSaved,
  onCancel,
  onDelete,
}: {
  note?: Note
  compact?: boolean
  focusName?: boolean
  onSaved: (n: Note) => void
  onCancel?: () => void
  onDelete?: () => void
}) {
  const { save, notes } = useNotes()
  const [name, setName] = useState(note?.name ?? '')
  const [text, setText] = useState(note?.text ?? '')
  const [sig, setSig] = useState(note?.sig ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Only take focus for a new note or a rename, so Delete keeps working on the selected file.
    if (focusName) nameRef.current?.select()
    else if (!note && !compact) textRef.current?.focus()
  }, [focusName, compact, note])

  const defaultName = (() => {
    const taken = new Set(notes.map((n) => n.name.toLowerCase()))
    let i = 1
    while (taken.has(`note${i}.txt`)) i++
    return `note${i}.txt`
  })()

  const dirty = !note || name !== note.name || text !== note.text || sig !== note.sig
  const field =
    'border border-teal bg-ink font-mono text-paper caret-amber outline-none focus:border-amber focus-visible:outline-none'

  return (
    <form
      className={`flex min-h-0 flex-1 flex-col gap-2.5 ${compact ? 'text-xs' : 'text-[11px]'}`}
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        const res = await save({ id: note?.id, name, text, sig })
        setBusy(false)
        if (res.ok) {
          toast.success(note ? `Saved ${res.note.name}` : `Created ${res.note.name}`, { description: note ? undefined : 'Everyone who opens ~/notes can read it.' })
          onSaved(res.note)
        } else {
          setError(res.error)
          toast.error(res.error)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && onCancel) onCancel()
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.requestSubmit()
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-dim">FILE NAME</span>
        <input
          ref={nameRef}
          value={name}
          maxLength={MAX_NAME}
          onChange={(e) => setName(e.target.value)}
          placeholder={note?.name ?? defaultName}
          className={`${field} ${compact ? 'h-[46px] px-3 text-sm' : 'h-8 px-2 text-xs'}`}
        />
      </label>
      <label className="flex min-h-0 flex-1 flex-col gap-1">
        <span className="flex justify-between text-dim">
          <span>MESSAGE</span>
          <span>
            {text.length}/{MAX_TEXT}
          </span>
        </span>
        <textarea
          ref={textRef}
          value={text}
          required
          maxLength={MAX_TEXT}
          onChange={(e) => setText(e.target.value)}
          placeholder="Hi Petar, …"
          className={`${field} min-h-[110px] flex-1 resize-none p-2 font-sans leading-[1.5] ${compact ? 'h-[180px] text-[15px]' : 'text-sm'}`}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-dim">SIGNED (optional)</span>
        <input
          value={sig}
          maxLength={MAX_SIG}
          onChange={(e) => setSig(e.target.value)}
          placeholder="your name"
          className={`${field} ${compact ? 'h-[46px] px-3 text-sm' : 'h-8 px-2 text-xs'}`}
        />
      </label>
      {error && (
        <p role="alert" className="m-0 text-signal">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !text.trim() || !dirty}
          className={`flex-1 cursor-pointer border-0 bg-amber font-mono font-bold text-ink hover:bg-signal disabled:cursor-default disabled:opacity-50 disabled:hover:bg-amber ${compact ? 'h-[52px] text-sm' : 'p-2.5 text-xs'}`}
        >
          {busy ? 'Saving…' : note ? 'Save' : 'Create note'}
          {!busy && <CornerDownLeft aria-hidden className="ml-1.5 inline-block size-[1.15em] align-[-0.2em]" />}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className={`cursor-pointer border border-teal bg-transparent px-3 font-mono text-paper hover:border-signal hover:bg-signal hover:text-ink ${compact ? 'h-[52px] text-sm' : 'text-xs'}`}
          >
            Delete
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`cursor-pointer border border-teal bg-transparent px-3 font-mono text-paper hover:border-amber ${compact ? 'h-[52px] text-sm' : 'text-xs'}`}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export function NoteView({ note }: { note: Note }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 font-sans text-[15px] leading-[1.55] break-words whitespace-pre-wrap text-paper select-text">{note.text}</p>
      {note.sig && <p className="m-0 font-sans text-sm text-amber">— {note.sig}</p>}
      <p className="m-0 text-[11px] text-dim">
        {fmtDate(note.createdAt)}
        {note.updatedAt > note.createdAt + 1000 ? ' · edited' : ''}
      </p>
    </div>
  )
}

export function ConfirmDelete({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div role="alertdialog" aria-label={`Delete ${name}?`} className="absolute inset-0 z-[4] flex items-center justify-center bg-ink/85 p-4">
      <div className="flex w-full max-w-[320px] flex-col gap-3 border border-signal bg-ink p-4 text-xs" onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
        <span className="font-sans text-base font-bold">Delete {name}?</span>
        <span className="text-muted">It disappears for everyone. This can't be undone.</span>
        <div className="flex gap-2">
          <button type="button" autoFocus onClick={onConfirm} className="flex-1 cursor-pointer border-0 bg-signal p-2.5 font-mono text-xs font-bold text-ink">
            Delete
          </button>
          <button type="button" onClick={onCancel} className="flex-1 cursor-pointer border border-teal bg-transparent p-2.5 font-mono text-xs text-paper hover:border-amber">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ~/notes inside the desktop Files window. Click selects, Ctrl/Shift-click or dragging
// across the folder selects several; Delete removes the ones that are yours.
export function NotesFolder({ openMenu }: { openMenu: OpenMenu }) {
  const { status, notes, mineLeft, admin, load, removeMany } = useNotes()
  const [sel, setSel] = useState<string | 'new' | null>(null)
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const [renaming, setRenaming] = useState(false)
  const [confirm, setConfirm] = useState<Note[] | null>(null)
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number; n: number } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLElement>())
  const suppressClick = useRef(false)

  // Drop selections of notes that disappeared.
  useEffect(() => {
    setPicked((cur) => {
      const ids = new Set(notes.map((n) => n.id))
      const next = new Set([...cur].filter((id) => ids.has(id)))
      return next.size === cur.size ? cur : next
    })
  }, [notes])

  const many = picked.size > 1
  const pickedNotes = notes.filter((n) => picked.has(n.id))
  const current = !many && sel && sel !== 'new' ? notes.find((n) => n.id === sel) : undefined
  const canCreate = status === 'ready' && mineLeft > 0
  const createHint = status !== 'ready' ? 'notes offline' : noteLimitHint(mineLeft)
  const deletable = (n: Note) => n.mine || admin

  const selectOne = (id: string | null) => {
    setSel(id)
    setPicked(id ? new Set([id]) : new Set())
    setRenaming(false)
  }
  const newNote = () => {
    setPicked(new Set())
    setRenaming(false)
    setSel('new')
  }
  // Ask before deleting; notes that aren't yours are skipped with a toast.
  const askDelete = (list: Note[]) => {
    const ok = list.filter(deletable)
    const skipped = list.length - ok.length
    if (!ok.length) {
      toast.error(list.length > 1 ? 'None of these notes are yours' : `${list[0].name} isn't yours, so you can't delete it`)
      return
    }
    if (skipped) toast.error(`${skipped} ${skipped > 1 ? "notes aren't" : "note isn't"} yours, skipped`)
    setConfirm(ok)
  }
  const doDelete = async (list: Note[]) => {
    setConfirm(null)
    const { deleted, error } = await removeMany(list.map((n) => n.id))
    if (deleted) toast.success(deleted > 1 ? `Deleted ${deleted} notes` : `Deleted ${list[0].name}`)
    if (error) toast.error(error)
    if (deleted) selectOne(null)
    gridRef.current?.focus()
  }

  const folderMenu = (e: ReactMouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    openMenu(e, [
      { label: '+ New note', onSelect: newNote, disabled: !canCreate, hint: canCreate ? undefined : createHint },
      { label: 'Select all', onSelect: () => (setSel(null), setPicked(new Set(notes.map((n) => n.id)))), disabled: !notes.length, hint: 'empty' },
      { label: 'Refresh', icon: RefreshCw, onSelect: () => void load().then(() => toast.success('Notes refreshed')) },
    ])
  }
  const noteMenu = (e: ReactMouseEvent, n: Note) => {
    e.preventDefault()
    e.stopPropagation()
    if (many && picked.has(n.id)) {
      openMenu(e, [
        { label: `Delete ${picked.size} selected`, onSelect: () => askDelete(pickedNotes), danger: true },
        'sep',
        { label: '+ New note', onSelect: newNote, disabled: !canCreate, hint: canCreate ? undefined : createHint },
      ])
      return
    }
    selectOne(n.id)
    openMenu(e, [
      { label: 'Open', onSelect: () => selectOne(n.id) },
      { label: 'Rename', onSelect: () => (selectOne(n.id), setRenaming(true)), disabled: !n.mine, hint: 'not yours', reason: `${n.name} isn't yours, so you can't rename it` },
      'sep',
      { label: 'Delete', onSelect: () => askDelete([n]), disabled: !deletable(n), hint: 'not yours', reason: `${n.name} isn't yours, so you can't delete it`, danger: true },
      'sep',
      { label: '+ New note', onSelect: newNote, disabled: !canCreate, hint: canCreate ? undefined : createHint },
    ])
  }

  const onNoteClick = (e: ReactMouseEvent, n: Note) => {
    if (suppressClick.current) return
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      const next = new Set(picked)
      if (sel && sel !== 'new' && !next.size) next.add(sel)
      if (!next.delete(n.id)) next.add(n.id)
      setPicked(next)
      setSel(next.size === 1 ? [...next][0] : null)
      setRenaming(false)
    } else selectOne(n.id)
  }

  // Dragging notes: they can't leave ~/notes, so dropping them anywhere else says so.
  const startNoteDrag = (e: ReactPointerEvent, n: Note) => {
    if (e.button !== 0 || e.shiftKey || e.ctrlKey || e.metaKey) return
    e.stopPropagation()
    const count = picked.has(n.id) ? picked.size : 1
    const [sx, sy] = [e.clientX, e.clientY]
    let moved = false
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return
      moved = true
      setGhost({ x: ev.clientX, y: ev.clientY, n: count })
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setGhost(null)
      if (!moved) return
      suppressClick.current = true
      setTimeout(() => (suppressClick.current = false))
      const r = gridRef.current?.getBoundingClientRect()
      const inside = r && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom
      if (!inside) toast.error(count > 1 ? "Notes can't leave ~/notes" : `${n.name} can't leave ~/notes`)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const startMarquee = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const grid = gridRef.current
    if (!grid) return
    const additive = e.shiftKey || e.ctrlKey || e.metaKey
    const base = additive ? new Set(picked) : new Set<string>()
    const box = grid.getBoundingClientRect()
    const [x0, y0] = [e.clientX - box.left + grid.scrollLeft, e.clientY - box.top + grid.scrollTop]
    let dragged = false
    const move = (ev: PointerEvent) => {
      const [x1, y1] = [ev.clientX - box.left + grid.scrollLeft, ev.clientY - box.top + grid.scrollTop]
      if (!dragged && Math.hypot(x1 - x0, y1 - y0) < 4) return
      dragged = true
      setMarquee({ x0, y0, x1, y1 })
      const [L, R, T, B] = [Math.min(x0, x1) + box.left - grid.scrollLeft, Math.max(x0, x1) + box.left - grid.scrollLeft, Math.min(y0, y1) + box.top - grid.scrollTop, Math.max(y0, y1) + box.top - grid.scrollTop]
      const next = new Set(base)
      for (const [id, el] of itemRefs.current) {
        const r = el.getBoundingClientRect()
        if (r.left < R && r.right > L && r.top < B && r.bottom > T) next.add(id)
      }
      setPicked(next)
      setSel(next.size === 1 ? [...next][0] : null)
      setRenaming(false)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setMarquee(null)
      if (!dragged && !additive) selectOne(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="relative grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_290px]">
      <div
        ref={gridRef}
        tabIndex={0}
        aria-label="Notes. Drag across to select several, right-click for options, Delete removes the selected notes."
        onContextMenu={folderMenu}
        onPointerDown={startMarquee}
        onKeyDown={(e) => {
          if (e.key === 'Delete' || e.key === 'Backspace') {
            const list = pickedNotes.length ? pickedNotes : current ? [current] : []
            if (!list.length) return
            e.preventDefault()
            askDelete(list)
          } else if (e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            setSel(null)
            setPicked(new Set(notes.map((n) => n.id)))
          } else if (e.key === 'Escape') selectOne(null)
        }}
        className="thin-scroll relative flex flex-col gap-3 overflow-auto p-3.5 outline-none select-none"
      >
        <div className="pointer-events-none flex justify-between text-[11px] text-dim">
          <span>~/notes · leave Petar a message</span>
          <span>{picked.size > 1 ? `${picked.size} selected` : 'right-click for options'}</span>
        </div>
        {status === 'loading' && <p className="m-0 text-xs text-dim">loading notes…</p>}
        {status === 'error' && <p className="m-0 text-xs text-signal">Could not load notes.</p>}
        {status === 'offline' && <p className="m-0 text-xs text-dim">Notes aren't connected yet.</p>}
        {status === 'ready' && notes.length === 0 && (
          <p className="pointer-events-none m-0 text-xs text-muted">Empty. Right-click → + New note to leave the first one.</p>
        )}
        <ul className="pointer-events-none m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2 p-0">
          {notes.map((n) => {
            const on = picked.has(n.id) || sel === n.id
            return (
              <li
                key={n.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(n.id, el)
                  else itemRefs.current.delete(n.id)
                }}
                className="pointer-events-auto"
              >
                <button
                  type="button"
                  aria-pressed={on}
                  onPointerDown={(e) => startNoteDrag(e, n)}
                  onClick={(e) => onNoteClick(e, n)}
                  onContextMenu={(e) => noteMenu(e, n)}
                  onKeyDown={(e) => {
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                      e.preventDefault()
                      e.stopPropagation()
                      askDelete(many && picked.has(n.id) ? pickedNotes : [n])
                    }
                  }}
                  className={`flex w-full cursor-pointer flex-col items-center gap-1.5 border px-1 py-2 text-paper ${on ? 'border-amber bg-amber/10' : 'border-transparent bg-transparent hover:bg-deep'}`}
                >
                  <span aria-hidden className="relative flex h-12 w-10 items-end justify-center border border-muted bg-paper pb-1 font-mono text-[9px] font-bold text-ink">
                    TXT
                    {n.mine && <span title="yours" className="absolute -top-1 -right-1 size-2.5 bg-amber" />}
                  </span>
                  <span className={`w-full truncate px-0.5 text-center text-[11px] ${on ? 'bg-amber text-ink' : ''}`}>{n.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
        {marquee && (
          <div
            aria-hidden
            className="marquee pointer-events-none absolute"
            style={{
              left: Math.min(marquee.x0, marquee.x1),
              top: Math.min(marquee.y0, marquee.y1),
              width: Math.abs(marquee.x1 - marquee.x0),
              height: Math.abs(marquee.y1 - marquee.y0),
            }}
          />
        )}
      </div>
      <aside className="thin-scroll flex min-h-0 flex-col gap-3 overflow-auto border-l border-deep p-3.5">
        {many ? (
          <div className="flex flex-col gap-2 text-xs text-muted">
            <span className="font-sans text-xl font-extrabold text-paper">{picked.size} notes selected</span>
            <span>
              {pickedNotes.filter(deletable).length} of them {pickedNotes.filter(deletable).length === 1 ? 'is' : 'are'} {admin ? 'deletable (admin)' : 'yours'}.
            </span>
            <span>Press Delete or right-click to remove {admin ? 'them' : 'yours'}. Notes from other people stay.</span>
            <button
              type="button"
              onClick={() => askDelete(pickedNotes)}
              className="mt-1 cursor-pointer self-start border border-signal bg-transparent px-3 py-2 font-mono text-xs text-signal hover:bg-signal hover:text-ink"
            >
              Delete selected
            </button>
          </div>
        ) : sel === 'new' ? (
          <>
            <div className="font-sans text-xl font-extrabold">New note</div>
            <NoteEditor key="new" onSaved={(n) => selectOne(n.id)} onCancel={() => selectOne(null)} />
          </>
        ) : current ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <div className="truncate font-sans text-xl font-extrabold">{current.name}</div>
              {current.mine && <span className="text-[10px] text-amber">yours</span>}
            </div>
            {current.mine ? (
              <NoteEditor key={current.id} note={current} focusName={renaming} onSaved={() => setRenaming(false)} onDelete={() => askDelete([current])} />
            ) : (
              <>
                <NoteView note={current} />
                {admin && (
                  <button type="button" onClick={() => askDelete([current])} className="mt-auto cursor-pointer border border-signal bg-transparent p-2 font-mono text-xs text-signal hover:bg-signal hover:text-ink">
                    Delete (admin)
                  </button>
                )}
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2 text-xs text-muted">
            <span className="font-sans text-xl font-extrabold text-paper">Notes</span>
            <span>Leave Petar a note. Everyone who opens this folder can read it.</span>
            <span>
              Right-click the folder → + New note. Your own notes can be edited, renamed or deleted (right-click, or select and press Delete). Drag across the folder to
              select several.
            </span>
            {status === 'ready' && <span className="text-amber">{noteLimitHint(mineLeft)}</span>}
            {canCreate && (
              <button type="button" onClick={newNote} className="mt-1 cursor-pointer self-start border-0 bg-amber px-3 py-2 font-mono text-xs font-bold text-ink hover:bg-signal">
                + New note
              </button>
            )}
          </div>
        )}
      </aside>
      {confirm && (
        <ConfirmDelete
          name={confirm.length > 1 ? `${confirm.length} notes` : confirm[0].name}
          onConfirm={() => void doDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {ghost && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[2000] flex items-center gap-1.5 border border-amber bg-ink px-2 py-1 text-[11px] text-paper shadow-[0_10px_30px_rgba(0,0,0,.5)]"
          style={{ left: ghost.x + 12, top: ghost.y + 12 }}
        >
          <span className="bg-paper px-1 text-[9px] font-bold text-ink">TXT</span>
          {ghost.n > 1 ? `${ghost.n} notes` : 'moving'}
        </div>
      )}
    </div>
  )
}
