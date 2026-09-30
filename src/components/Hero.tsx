import { profile } from '#/data/portfolio'
import { Placeholder } from './Label'

const nameClass =
  'font-sans font-bold whitespace-nowrap text-[clamp(64px,19.2vw,300px)] leading-[0.8] tracking-[-0.06em]'

function Corner({ className }: { className: string }) {
  return <span className={`absolute size-4 border-amber ${className}`} />
}

export function Hero() {
  return (
    <header
      data-section="top"
      data-label="Intro"
      className="grid-rules relative overflow-hidden px-4 pt-14 [background-position:16px_0] sm:px-8 sm:[background-position:32px_0]"
    >
      <p className="mb-[34px] font-mono text-[13px] leading-none font-medium text-amber">{profile.tagline}</p>

      <h1 className="m-0">
        <span data-fx="x" data-k="-200" className={`block ${nameClass}`}>
          <span data-fx="glitch">{profile.firstName}</span>
        </span>
        <span data-fx="x" data-k="200" className={`outline-text block pl-[14vw] ${nameClass}`}>
          {profile.lastName}
        </span>
      </h1>

      <div
        data-fx="y"
        data-k="-140"
        className="absolute top-[110px] right-12 hidden h-[300px] w-60 lg:block"
      >
        <Placeholder
          src={profile.portrait}
          alt="Portrait of Petar Popović"
          caption="IMG_000 · portrait"
          className="size-full"
        />
        <Corner className="-top-1.5 -left-1.5 border-t-2 border-l-2" />
        <Corner className="-top-1.5 -right-1.5 border-t-2 border-r-2" />
        <Corner className="-bottom-1.5 -left-1.5 border-b-2 border-l-2" />
        <Corner className="-right-1.5 -bottom-1.5 border-r-2 border-b-2" />
      </div>

      <dl className="m-0 mt-[70px] grid grid-cols-1 border-t border-deep sm:grid-cols-3">
        {profile.facts.map((f, i) => (
          <div
            key={f.label}
            className={`flex flex-col gap-2 py-5 sm:pb-7 ${i === 0 ? 'sm:pr-5' : 'border-deep max-sm:border-t sm:border-l sm:px-5'}`}
          >
            <dt className="font-mono text-[11px] font-medium text-label uppercase">{f.label}</dt>
            <dd className="m-0 text-xl font-semibold">{f.value}</dd>
          </div>
        ))}
      </dl>
    </header>
  )
}
