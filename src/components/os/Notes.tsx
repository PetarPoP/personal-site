import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { MAX_NAME, MAX_SIG, MAX_TEXT, NOTE_LIMIT } from '#/lib/notes'
import type { Note } from '#/lib/notes'
import { useNotes } from '#/lib/useNotes'
import type { MenuItem } from './ContextMenu'

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
        if (res.ok) onSaved(res.note)
        else setError(res.error)
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
          {busy ? 'Saving…' : note ? 'Save ⏎' : 'Create note ⏎'}
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

// ~/notes inside the desktop Files window.
export function NotesFolder({ openMenu }: { openMenu: OpenMenu }) {
  const { status, notes, mineLeft, admin, load, remove } = useNotes()
  const [sel, setSel] = useState<string | 'new' | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [confirm, setConfirm] = useState<Note | null>(null)
  const [error, setError] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const current = sel && sel !== 'new' ? notes.find((n) => n.id === sel) : undefined
  const canCreate = status === 'ready' && mineLeft > 0
  const createHint = status !== 'ready' ? 'notes offline' : noteLimitHint(mineLeft)

  const newNote = () => {
    setRenaming(false)
    setSel('new')
  }
  const askDelete = (n: Note) => {
    if (n.mine || admin) setConfirm(n)
  }
  const doDelete = async (n: Note) => {
    setConfirm(null)
    const err = await remove(n.id)
    setError(err)
    if (!err && sel === n.id) setSel(null)
    gridRef.current?.focus()
  }

  const folderMenu = (e: ReactMouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    openMenu(e, [
      { label: '+ New note', onSelect: newNote, disabled: !canCreate, hint: canCreate ? undefined : createHint },
      { label: '⟳ Refresh', onSelect: () => void load() },
    ])
  }
  const noteMenu = (e: ReactMouseEvent, n: Note) => {
    e.preventDefault()
    e.stopPropagation()
    setSel(n.id)
    setRenaming(false)
    openMenu(e, [
      { label: 'Open', onSelect: () => setSel(n.id) },
      { label: 'Rename', onSelect: () => (setSel(n.id), setRenaming(true)), disabled: !n.mine, hint: 'not yours' },
      'sep',
      { label: 'Delete', onSelect: () => askDelete(n), disabled: !n.mine && !admin, hint: 'not yours', danger: true },
      'sep',
      { label: '+ New note', onSelect: newNote, disabled: !canCreate, hint: canCreate ? undefined : createHint },
    ])
  }

  return (
    <div className="relative grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_290px]">
      <div
        ref={gridRef}
        tabIndex={0}
        aria-label="Notes. Right-click for options, Delete removes the selected note."
        onContextMenu={folderMenu}
        onClick={(e) => e.target === e.currentTarget && setSel(null)}
        onKeyDown={(e) => {
          if ((e.key === 'Delete' || e.key === 'Backspace') && current) {
            e.preventDefault()
            askDelete(current)
          }
        }}
        className="thin-scroll flex flex-col gap-3 overflow-auto p-3.5 outline-none"
      >
        <div className="pointer-events-none flex justify-between text-[11px] text-dim">
          <span>~/notes · leave Petar a message</span>
          <span>right-click for options</span>
        </div>
        {status === 'loading' && <p className="m-0 text-xs text-dim">loading notes…</p>}
        {status === 'error' && <p className="m-0 text-xs text-signal">Could not load notes.</p>}
        {status === 'offline' && <p className="m-0 text-xs text-dim">Notes aren't connected yet.</p>}
        {status === 'ready' && notes.length === 0 && (
          <p className="pointer-events-none m-0 text-xs text-muted">Empty. Right-click → + New note to leave the first one.</p>
        )}
        <ul className="pointer-events-none m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2 p-0">
          {notes.map((n) => (
            <li key={n.id} className="pointer-events-auto">
              <button
                type="button"
                onClick={() => (setSel(n.id), setRenaming(false))}
                onDoubleClick={() => setSel(n.id)}
                onContextMenu={(e) => noteMenu(e, n)}
                onKeyDown={(e) => {
                  if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault()
                    e.stopPropagation()
                    askDelete(n)
                  }
                }}
                className="flex w-full cursor-pointer flex-col items-center gap-1.5 border bg-transparent px-1 py-2 text-paper hover:bg-deep"
                style={{ borderColor: sel === n.id ? '#efab30' : 'transparent' }}
              >
                <span aria-hidden className="relative flex h-12 w-10 items-end justify-center border border-muted bg-paper pb-1 font-mono text-[9px] font-bold text-ink">
                  TXT
                  {n.mine && <span title="yours" className="absolute -top-1 -right-1 size-2.5 bg-amber" />}
                </span>
                <span className="w-full truncate text-center text-[11px]">{n.name}</span>
              </button>
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="m-0 text-xs text-signal">
            {error}
          </p>
        )}
      </div>
      <aside className="thin-scroll flex min-h-0 flex-col gap-3 overflow-auto border-l border-deep p-3.5">
        {sel === 'new' ? (
          <>
            <div className="font-sans text-xl font-extrabold">New note</div>
            <NoteEditor key="new" onSaved={(n) => setSel(n.id)} onCancel={() => setSel(null)} />
          </>
        ) : current ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <div className="truncate font-sans text-xl font-extrabold">{current.name}</div>
              {current.mine && <span className="text-[10px] text-amber">yours</span>}
            </div>
            {current.mine ? (
              <NoteEditor key={current.id} note={current} focusName={renaming} onSaved={() => setRenaming(false)} onDelete={() => askDelete(current)} />
            ) : (
              <>
                <NoteView note={current} />
                {admin && (
                  <button type="button" onClick={() => askDelete(current)} className="mt-auto cursor-pointer border border-signal bg-transparent p-2 font-mono text-xs text-signal hover:bg-signal hover:text-ink">
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
            <span>Right-click the folder → + New note. Your own notes can be edited, renamed or deleted (right-click, or select and press Delete).</span>
            {status === 'ready' && <span className="text-amber">{noteLimitHint(mineLeft)}</span>}
            {canCreate && (
              <button type="button" onClick={newNote} className="mt-1 cursor-pointer self-start border-0 bg-amber px-3 py-2 font-mono text-xs font-bold text-ink hover:bg-signal">
                + New note
              </button>
            )}
          </div>
        )}
      </aside>
      {confirm && <ConfirmDelete name={confirm.name} onConfirm={() => void doDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  )
}
