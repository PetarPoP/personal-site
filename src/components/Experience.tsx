import { experience } from '#/data/portfolio'
import { CvDownload } from './CvDownload'
import { Label } from './Label'

export function Experience() {
  return (
    <section data-section="cv" aria-label="Curriculum vitae" className="border-t border-deep px-4 py-[120px] sm:px-8">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Label className="mb-2.5">[03] Curriculum vitae</Label>
          <h2
            data-fx="scramble"
            className="m-0 font-sans text-[clamp(36px,5.3vw,64px)] leading-[0.9] font-bold tracking-[-0.04em] opacity-0"
          >
            EXPERIENCE.LOG
          </h2>
        </div>
        <CvDownload />
      </div>
      <ol className="m-0 flex list-none flex-col border-t border-teal p-0">
        {experience.map((r) => (
          <li
            key={r.when + r.title}
            className="grid gap-1.5 border-b border-deep px-3 py-[22px] transition-colors hover:bg-deep md:grid-cols-[200px_1fr_1fr] md:gap-5"
          >
            <span className={`font-mono text-[13px] font-medium ${r.education ? 'text-mist' : 'text-amber'}`}>{r.when}</span>
            <span className="text-2xl font-bold">{r.title}</span>
            <span className="text-base text-dim">{r.where}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
