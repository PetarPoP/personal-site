const LINKS = [
  { id: 'work', n: '01', label: 'Work' },
  { id: 'photos', n: '02', label: 'Photos' },
  { id: 'cv', n: '03', label: 'CV' },
  { id: 'contact', n: '04', label: 'Contact' },
]

export function Nav() {
  return (
    <nav className="sticky top-0 z-20 grid h-[60px] grid-cols-[auto_1fr] items-center gap-4 border-b border-deep bg-ink/90 px-4 font-mono text-xs leading-none font-medium tracking-[0.04em] uppercase backdrop-blur-md sm:px-8 md:grid-cols-[200px_1fr_auto]">
      <a data-goto="top" href="#" className="font-bold text-paper no-underline">
        PP/26
      </a>
      <div className="flex justify-end gap-1 md:justify-start">
        {LINKS.map((l) => (
          <a
            key={l.id}
            data-goto={l.id}
            href={`#${l.id}`}
            className="px-2 py-2 text-dim no-underline transition-colors hover:bg-amber hover:text-ink sm:px-3"
          >
            [{l.n}]<span className="hidden sm:inline"> {l.label}</span>
          </a>
        ))}
      </div>
      <div className="hidden items-center gap-2.5 text-dim md:flex">
        <span className="size-2 bg-mist" />
        Open to work
      </div>
      <div data-progress className="absolute -bottom-px left-0 h-0.5 w-0 bg-amber" />
    </nav>
  )
}
