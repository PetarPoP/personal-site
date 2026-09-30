import { projects } from '#/data/portfolio'
import { Label, Placeholder } from './Label'

const pad = (n: number) => String(n).padStart(2, '0')

// Pinned section: while it scrolls past, the panels swap one by one.
export function Work() {
  return (
    <section
      data-section="work"
      data-fx="pin"
      aria-label="Selected work"
      className="relative border-t border-deep"
      style={{ height: `${projects.length * 96}svh` }}
    >
      <div className="sticky top-0 flex h-svh flex-col gap-6 px-4 pt-[92px] pb-[72px] sm:px-8 sm:pb-10">
        <div className="flex items-baseline justify-between">
          <Label>[01] Selected work</Label>
          <span className="font-mono text-xs font-medium text-label uppercase">
            <span data-pin-count className="text-[40px] font-bold text-amber">
              01
            </span>{' '}
            / {pad(projects.length)}
          </span>
        </div>
        <div className="relative flex-1">
          {projects.map((p, i) => (
            <article
              key={p.caption}
              data-panel
              aria-hidden={i !== 0}
              inert={i !== 0}
              className="absolute inset-0 flex flex-col-reverse gap-6 transition-[opacity,transform] duration-400 md:grid md:grid-cols-[1fr_1.3fr] md:gap-10"
              style={i === 0 ? undefined : { opacity: 0, transform: 'translateY(40px)', pointerEvents: 'none' }}
            >
              <div className="flex flex-col justify-end gap-4 md:gap-[22px]">
                <h3 className="m-0 text-[clamp(34px,5.2vw,62px)] leading-[0.95] font-bold tracking-[-0.04em]">
                  {p.title[0]}
                  <br />
                  {p.title[1]}
                </h3>
                <dl className="m-0 grid grid-cols-[auto_1fr] border-t border-deep pt-3.5 font-mono text-[13px] leading-[1.9] text-dim">
                  <dt>STACK ......&nbsp;</dt>
                  <dd className="m-0">{p.stack}</dd>
                  <dt>TYPE .......&nbsp;</dt>
                  <dd className="m-0">{p.type}</dd>
                  <dt>SOURCE .....&nbsp;</dt>
                  <dd className="m-0">github.com/PetarPoP</dd>
                </dl>
                <a
                  href={p.href}
                  target="_blank"
                  rel="noreferrer"
                  className="self-start bg-amber px-[18px] py-3 font-mono text-[13px] font-bold text-ink uppercase no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--color-amber)_80%,#fff)]"
                >
                  View project →
                </a>
              </div>
              <Placeholder
                src={p.image}
                alt={`${p.title.join(' ')} screenshot`}
                caption={p.caption}
                stripe={p.stripe}
                className="min-h-0 flex-1 border border-teal"
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
