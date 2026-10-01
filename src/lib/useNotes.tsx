import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { deleteNote, listNotes, saveNote } from './notes'
import type { Note, NoteResult } from './notes'

// Client side of ~/notes, shared by the desktop and mobile shells.

const OWNER_KEY = 'popos-owner'
const ADMIN_KEY = 'popos-admin'
export const ADMIN_EVENT = 'popos-admin-change'

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Blocked storage: the browser simply gets a new identity next visit.
  }
}

// A random id for this browser; the server only keeps its hash.
function ownerToken() {
  let t = read(OWNER_KEY)
  if (!t || !/^[\w-]{16,64}$/.test(t)) {
    t = crypto.randomUUID()
    write(OWNER_KEY, t)
  }
  return t
}

export function setAdminKey(key: string | null) {
  write(ADMIN_KEY, key)
  window.dispatchEvent(new Event(ADMIN_EVENT))
}

type NotesApi = {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'offline'
  notes: Note[]
  mineLeft: number
  admin: boolean
  load: () => Promise<void>
  save: (n: { id?: string; name: string; text: string; sig: string }) => Promise<NoteResult>
  remove: (id: string) => Promise<string | null>
}

const NotesContext = createContext<NotesApi | null>(null)

export function NotesProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<NotesApi['status']>('idle')
  const [notes, setNotes] = useState<Note[]>([])
  const [mineLeft, setMineLeft] = useState(0)
  const [admin, setAdmin] = useState(false)
  const loading = useRef<Promise<void> | null>(null)

  const auth = () => ({ owner: ownerToken(), admin: read(ADMIN_KEY) ?? undefined })

  const load = useCallback(() => {
    if (loading.current) return loading.current
    setStatus((s) => (s === 'ready' ? s : 'loading'))
    loading.current = listNotes({ data: auth() })
      .then((res) => {
        setNotes(res.notes)
        setMineLeft(res.mineLeft)
        setAdmin(res.admin)
        setStatus(res.configured ? 'ready' : 'offline')
      })
      .catch(() => setStatus('error'))
      .finally(() => {
        loading.current = null
      })
    return loading.current
  }, [])

  useEffect(() => {
    const on = () => void load()
    window.addEventListener(ADMIN_EVENT, on)
    return () => window.removeEventListener(ADMIN_EVENT, on)
  }, [load])

  const save = useCallback<NotesApi['save']>(
    async (n) => {
      try {
        const res = await saveNote({ data: { ...auth(), ...n } })
        await load()
        return res
      } catch {
        return { ok: false, error: 'Could not save. Check your connection.' }
      }
    },
    [load],
  )

  const remove = useCallback<NotesApi['remove']>(
    async (id) => {
      try {
        const res = await deleteNote({ data: { ...auth(), id } })
        await load()
        return res.ok ? null : (res.error ?? 'Could not delete.')
      } catch {
        return 'Could not delete. Check your connection.'
      }
    },
    [load],
  )

  const value = useMemo(() => ({ status, notes, mineLeft, admin, load, save, remove }), [status, notes, mineLeft, admin, load, save, remove])
  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
}

// Loads the notes on first use unless autoLoad is false.
export function useNotes(autoLoad = true) {
  const ctx = useContext(NotesContext)
  if (!ctx) throw new Error('useNotes needs NotesProvider')
  const { status, load } = ctx
  useEffect(() => {
    if (autoLoad && status === 'idle') void load()
  }, [autoLoad, status, load])
  return ctx
}
