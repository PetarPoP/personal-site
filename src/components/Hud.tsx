// Camera viewfinder overlay: scanlines, corner brackets, reticle,
// focus-scale meter and the REC / clock / frame readouts.

const TICKS = Array.from({ length: 51 }, (_, i) => i)

function Bracket({ className }: { className: string }) {
  return <span className={`absolute size-[30px] border-amber ${className}`} />
}

export function Hud() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40">
      <div className="scanlines absolute inset-0" />

      <Bracket className="top-[76px] left-4 border-t-2 border-l-2" />
      <Bracket className="top-[76px] right-4 border-t-2 border-r-2" />
      <Bracket className="bottom-4 left-4 border-b-2 border-l-2" />
      <Bracket className="right-4 bottom-4 border-r-2 border-b-2" />

      <span className="absolute top-1/2 left-[calc(50%-12px)] hidden h-px w-6 bg-paper/45 md:block" />
      <span className="absolute top-[calc(50%-12px)] left-1/2 hidden h-6 w-px bg-paper/45 md:block" />

      <div
        data-meter
        className="absolute top-[calc(50%-100px)] right-6 hidden h-[200px] w-[70px] overflow-hidden [mask-image:linear-gradient(transparent,#000_25%,#000_75%,transparent)] lg:block"
      >
        <div data-tape className="absolute top-[95px] right-0 w-[70px]">
          {TICKS.map((i) => (
            <div key={i} className="flex h-2.5 items-center justify-end gap-1.5">
              {i % 5 === 0 ? (
                <>
                  <span className="font-mono text-[9px] font-medium text-caption">
                    {String(i * 2).padStart(3, '0')}
                  </span>
                  <span className="h-px w-4 bg-caption" />
                </>
              ) : (
                <span className="h-px w-2 bg-teal" />
              )}
            </div>
          ))}
        </div>
        <span
          data-needle
          className="absolute top-[99px] right-0 h-0.5 w-7 bg-amber shadow-[0_0_8px_var(--color-amber)]"
        />
      </div>

      <div className="absolute right-[58px] bottom-4 left-[58px] flex items-center justify-between gap-2 font-mono text-[11px] font-medium text-paper uppercase sm:text-xs">
        <span className="flex items-center gap-2 border border-teal bg-ink px-2.5 py-1.5">
          <span
            data-blink
            className="size-[9px] rounded-full bg-signal shadow-[0_0_10px_var(--color-signal)]"
          />
          REC · <span data-readout="section" className="text-amber">INTRO</span>
        </span>
        <span className="hidden border border-teal bg-ink px-2.5 py-1.5 sm:inline">
          Livno <span data-readout="clock">00:00:00</span>
        </span>
        <span className="hidden border border-teal bg-ink px-2.5 py-1.5 md:inline">
          Frame <span data-readout="pct" className="text-mist">000%</span>
        </span>
      </div>
    </div>
  )
}
