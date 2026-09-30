import { profile } from '#/data/portfolio'
import { Label } from './Label'

export function About() {
  const lines = profile.about
  return (
    <section className="grid gap-6 px-4 pt-[130px] pb-[120px] sm:px-8 md:grid-cols-[200px_1fr] md:gap-0">
      <Label>[00] About</Label>
      <h2 className="m-0 flex max-w-[880px] flex-col text-[clamp(30px,4.5vw,54px)] leading-[1.08] font-semibold tracking-[-0.03em]">
        {lines.map((line, i) => (
          <span key={line} data-fx="scramble" className={`opacity-0 ${i === lines.length - 1 ? 'text-mist' : ''}`}>
            {line}
          </span>
        ))}
      </h2>
    </section>
  )
}
