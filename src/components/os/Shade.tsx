import { useRef, useState } from 'react'
import type { ComponentType, PointerEvent } from 'react'
import {
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Bluetooth,
  BluetoothOff,
  ChevronUp,
  Flashlight,
  FlashlightOff,
  MapPin,
  MapPinOff,
  Moon,
  Plane,
  Signal,
  SignalZero,
  Sun,
  SunDim,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { apps } from '#/lib/os'
import type { AppId } from '#/lib/os'
import { useBackLayer } from '#/lib/hooks'
import { useNotes } from '#/lib/useNotes'
import { useRepos } from '#/lib/useRepos'

type Icon = ComponentType<LucideProps>

// The phone's quick settings. Nothing here touches the visitor's real phone: the toggles only
// change POP/OS's own status bar, and brightness and the flashlight are drawn over the screen.
export type Quick = {
  wifi: boolean
  data: boolean
  bluetooth: boolean
  flashlight: boolean
  airplane: boolean
  dnd: boolean
  location: boolean
  brightness: number
}
export const quickDefaults: Quick = {
  wifi: true,
  data: true,
  bluetooth: false,
  flashlight: false,
  airplane: false,
  dnd: false,
  location: true,
  brightness: 1,
}

// The battery icon for a level from battery() in os.ts; the desktop's top bar uses it too.
export const batteryIcon = (battery: { pct: number; charging: boolean } | null): Icon =>
  !battery
    ? Battery
    : battery.charging
      ? BatteryCharging
      : battery.pct > 70
        ? BatteryFull
        : battery.pct > 35
          ? BatteryMedium
          : BatteryLow

// The status bar along the top of the phone: pull it down for the shade.
export function StatusBar({
  time,
  battery,
  quick,
  onPull,
}: {
  time?: string
  battery: { pct: number; charging: boolean } | null
  quick: Quick
  onPull: (e: PointerEvent<HTMLElement>) => void
}) {
  const BatteryIcon = batteryIcon(battery)
  const icon = 'size-[14px]'
  return (
    <div
      role="button"
      aria-label="Pull down for quick settings"
      tabIndex={-1}
      onPointerDown={onPull}
      className="absolute inset-x-0 top-0 z-50 flex h-9 touch-none items-center justify-between px-6 text-xs font-medium select-none"
    >
      <span>{time}</span>
      <span className="flex items-center gap-1.5">
        {quick.dnd && <Moon aria-label="Do not disturb" className={icon} />}
        {quick.location && !quick.airplane && <MapPin aria-label="Location on" className={icon} />}
        {quick.bluetooth && <Bluetooth aria-label="Bluetooth on" className={icon} />}
        {quick.airplane ? (
          <Plane aria-label="Airplane mode" className={icon} />
        ) : (
          <>
            {quick.wifi && <Wifi aria-label="Wi-Fi" className={icon} />}
            {quick.data ? <Signal aria-label="Mobile data" className={icon} /> : <SignalZero aria-label="No mobile data" className={icon} />}
          </>
        )}
        {battery && (
          <span className="flex items-center gap-0.5">
            <BatteryIcon aria-hidden className="size-[17px]" />
            {battery.pct}%
          </span>
        )}
      </span>
    </div>
  )
}

type Notice = { id: string; app: AppId; title: string; body: string }

// The pulled-down shade: quick tiles, a brightness slider and notifications. It follows the
// finger while being pulled (`drag`, in px), and closes with a flick up, a tap below it or the
// phone's back button.
export function Shade({
  open,
  drag,
  clock,
  quick,
  setQuick,
  dismissed,
  setDismissed,
  onOpenApp,
  onClose,
}: {
  open: boolean
  drag: number | null
  clock: { hm: string; longDate: string } | null
  quick: Quick
  setQuick: (q: Quick) => void
  dismissed: string[]
  setDismissed: (ids: string[]) => void
  onOpenApp: (id: AppId) => void
  onClose: () => void
}) {
  useBackLayer(open, onClose)
  const notes = useNotes(open)
  const repos = useRepos(open)

  // Closing by dragging the panel up.
  const [lift, setLift] = useState(0)
  const up = useRef<{ y: number; id: number } | null>(null)

  const note = notes.notes[0]
  const repo = repos.repos[0]
  const all: Notice[] = [{ id: 'hi', app: 'about', title: 'POP/OS', body: "Hi, I'm Petar. Tap here to read about me." }]
  if (note) all.push({ id: `note-${note.id}`, app: 'notes', title: `New note from ${note.name}`, body: note.text })
  if (repo) all.push({ id: `repo-${repo.name}`, app: 'work', title: 'GitHub', body: `Latest repo: ${repo.name}` })
  all.push(
    { id: 'spotify', app: 'spotify', title: 'Spotify', body: "See what I'm listening to right now." },
    { id: 'mail', app: 'mail', title: 'Mail', body: 'Hiring, or need photos? Send me a message.' },
  )
  const notices = all.filter((n) => !dismissed.includes(n.id))

  const set = (patch: Partial<Quick>) => setQuick({ ...quick, ...patch })
  const tiles: { label: string; on: boolean; icon: Icon; off?: Icon; toggle: () => void; disabled?: boolean }[] = [
    { label: 'Wi-Fi', on: quick.wifi && !quick.airplane, icon: Wifi, off: WifiOff, toggle: () => set({ wifi: !quick.wifi, airplane: false }) },
    {
      label: 'Mobile data',
      on: quick.data && !quick.airplane,
      icon: Signal,
      off: SignalZero,
      toggle: () => set({ data: !quick.data, airplane: false }),
    },
    { label: 'Bluetooth', on: quick.bluetooth, icon: Bluetooth, off: BluetoothOff, toggle: () => set({ bluetooth: !quick.bluetooth }) },
    { label: 'Flashlight', on: quick.flashlight, icon: Flashlight, off: FlashlightOff, toggle: () => set({ flashlight: !quick.flashlight }) },
    // Like a real phone, airplane mode cuts the radios; Wi-Fi and Bluetooth can come back on.
    { label: 'Airplane', on: quick.airplane, icon: Plane, toggle: () => set(quick.airplane ? { airplane: false } : { airplane: true, wifi: false, bluetooth: false }) },
    { label: 'Do not disturb', on: quick.dnd, icon: Moon, toggle: () => set({ dnd: !quick.dnd }) },
    { label: 'Location', on: quick.location, icon: MapPin, off: MapPinOff, toggle: () => set({ location: !quick.location }) },
  ]

  const transform =
    drag !== null
      ? `translateY(min(0px, calc(-100% + ${drag}px)))`
      : open
        ? `translateY(${Math.min(0, -lift)}px)`
        : 'translateY(-100%)'

  return (
    <>
      {/* Dark backdrop: tap to close. */}
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 z-[74] bg-ink/60"
        style={{
          opacity: drag !== null ? Math.min(1, drag / 300) : open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: drag !== null ? 'none' : 'opacity .3s',
        }}
      />
      <div
        role="dialog"
        aria-label="Quick settings"
        aria-hidden={!open && drag === null}
        inert={!open}
        className="absolute inset-x-0 top-0 z-[75] flex max-h-dvh flex-col gap-4 border-b border-teal bg-ink/95 px-4 pt-3 pb-2 backdrop-blur-md"
        style={{
          transform,
          transition: drag !== null || lift ? 'none' : 'transform .35s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <div className="flex items-end justify-between pt-1">
          <span className="font-sans text-[34px] leading-none font-extrabold tracking-[-0.03em]">{clock?.hm}</span>
          <span className="text-[11px] text-muted">{clock?.longDate}</span>
        </div>

        <ul className="m-0 grid list-none grid-cols-4 gap-2.5 p-0">
          {tiles.map((t) => {
            const I = !t.on && t.off ? t.off : t.icon
            return (
              <li key={t.label}>
                <button
                  type="button"
                  aria-pressed={t.on}
                  onClick={t.toggle}
                  className="flex w-full cursor-pointer flex-col items-center gap-1.5 border-0 bg-transparent p-0 font-mono text-paper"
                >
                  <span
                    className="flex h-12 w-full items-center justify-center border transition-colors duration-150"
                    style={t.on ? { background: '#efab30', borderColor: '#efab30', color: '#0d1b1c' } : { borderColor: '#1c3132', background: '#132526' }}
                  >
                    <I aria-hidden className="size-5" />
                  </span>
                  <span className="w-full truncate text-center text-[9.5px] text-muted">{t.label}</span>
                </button>
              </li>
            )
          })}
        </ul>

        <label className="flex items-center gap-3 text-muted">
          <SunDim aria-hidden className="size-4 flex-none" />
          <span className="sr-only">Brightness</span>
          <input
            type="range"
            min={0.25}
            max={1}
            step={0.01}
            value={quick.brightness}
            onChange={(e) => set({ brightness: Number(e.target.value) })}
            className="h-1.5 flex-1 cursor-pointer accent-amber"
          />
          <Sun aria-hidden className="size-5 flex-none" />
        </label>

        <section aria-label="Notifications" className="thin-scroll flex min-h-0 flex-col gap-2 overflow-y-auto">
          <div className="flex items-center justify-between text-[10px] tracking-[0.1em] text-dim">
            <span>NOTIFICATIONS</span>
            {notices.length > 0 && !quick.dnd && (
              <button type="button" onClick={() => setDismissed([...dismissed, ...notices.map((n) => n.id)])} className="cursor-pointer border-0 bg-transparent p-1 font-mono text-[10px] tracking-[0.1em] text-amber">
                CLEAR ALL
              </button>
            )}
          </div>
          {quick.dnd ? (
            <p className="m-0 flex items-center gap-2 py-2 text-xs text-dim">
              <Moon aria-hidden className="size-4" /> Do not disturb is on. Notifications are silenced.
            </p>
          ) : notices.length ? (
            notices.map((n) => (
              <NoticeCard key={n.id} notice={n} onOpen={() => onOpenApp(n.app)} onDismiss={() => setDismissed([...dismissed, n.id])} />
            ))
          ) : (
            <p className="m-0 py-2 text-xs text-dim">No notifications</p>
          )}
        </section>

        {/* Handle: drag up (or tap) to close. */}
        <button
          type="button"
          aria-label="Close quick settings"
          onClick={() => !lift && onClose()}
          onPointerDown={(e) => {
            up.current = { y: e.clientY, id: e.pointerId }
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => up.current?.id === e.pointerId && setLift(Math.max(0, up.current.y - e.clientY))}
          onPointerUp={() => {
            const far = lift > 60
            up.current = null
            setLift(0)
            if (far) onClose()
          }}
          onPointerCancel={() => {
            up.current = null
            setLift(0)
          }}
          className="mx-auto flex h-8 w-24 flex-none touch-none cursor-pointer items-center justify-center border-0 bg-transparent text-dim"
        >
          <ChevronUp aria-hidden className="size-5" />
        </button>
      </div>
    </>
  )
}

// One notification: tap to open its app, swipe sideways to dismiss.
function NoticeCard({ notice, onOpen, onDismiss }: { notice: Notice; onOpen: () => void; onDismiss: () => void }) {
  const a = apps[notice.app]
  const [dx, setDx] = useState(0)
  const [gone, setGone] = useState(false)
  const drag = useRef<{ x: number; y: number; id: number; sideways: boolean | null } | null>(null)
  const moved = useRef(false)
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, sideways: null }
        moved.current = false
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d || d.id !== e.pointerId) return
        const x = e.clientX - d.x
        if (d.sideways === null && Math.hypot(x, e.clientY - d.y) > 8) {
          d.sideways = Math.abs(x) > Math.abs(e.clientY - d.y)
          moved.current = true
          if (d.sideways) e.currentTarget.setPointerCapture(e.pointerId)
        }
        if (d.sideways) setDx(x)
      }}
      onPointerUp={() => {
        const d = drag.current
        drag.current = null
        if (!d?.sideways) return
        if (Math.abs(dx) > 110) setGone(true)
        else setDx(0)
      }}
      onPointerCancel={() => {
        drag.current = null
        setDx(0)
      }}
      onClick={() => !moved.current && onOpen()}
      onTransitionEnd={() => gone && onDismiss()}
      className="flex flex-none touch-pan-y cursor-pointer items-start gap-3 border border-deep bg-deep/70 p-3 select-none"
      style={{
        transform: `translateX(${gone ? Math.sign(dx || 1) * 120 : 0}%) translateX(${gone ? 0 : dx}px)`,
        opacity: gone ? 0 : 1 - Math.min(0.7, Math.abs(dx) / 300),
        transition: drag.current?.sideways ? 'none' : 'transform .25s ease-out, opacity .25s',
      }}
    >
      <span
        aria-hidden
        className="flex size-8 flex-none items-center justify-center border text-[11px] font-bold"
        style={{ background: a.bg, color: a.fg, borderColor: a.border }}
      >
        {a.glyph}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center justify-between gap-2 text-[11px] text-dim">
          <span className="truncate font-sans text-[13px] font-bold text-paper">{notice.title}</span>
          <span>now</span>
        </span>
        <span className="line-clamp-2 font-sans text-[13px] leading-[1.35] text-muted">{notice.body}</span>
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={(e) => {
          e.stopPropagation()
          setGone(true)
        }}
        className="-m-1 flex size-7 flex-none cursor-pointer items-center justify-center border-0 bg-transparent text-dim"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  )
}

// Drawn over the whole phone: the brightness slider dims it, the flashlight lights the top.
export function ScreenLight({ quick }: { quick: Quick }) {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[90] transition-opacity duration-500"
        style={{ opacity: quick.flashlight ? 1 : 0, background: 'radial-gradient(ellipse 80% 45% at 50% -5%, rgba(255,250,230,.55), rgba(255,250,230,.12) 55%, transparent 75%)', mixBlendMode: 'screen' }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[91] bg-black" style={{ opacity: (1 - quick.brightness) * 0.85 }} />
    </>
  )
}
