import { profile } from '#/data/portfolio'
import { Label } from './Label'

export function Contact() {
  return (
    <footer data-section="contact" className="overflow-hidden border-t border-deep px-4 pt-[110px] pb-[84px] sm:px-8">
      <Label className="mb-5">[04] Contact</Label>
      <p
        data-fx="x"
        data-k="-240"
        className="m-0 text-[clamp(56px,16.7vw,260px)] leading-[0.82] font-bold tracking-[-0.06em] whitespace-nowrap"
      >
        <span data-fx="glitch">LET'S BUILD</span> <span className="text-amber">→</span>
      </p>
      <div className="mt-[60px] grid grid-cols-[1fr_auto] items-end gap-[30px] border-t border-deep pt-[22px]">
        <a
          href={`mailto:${profile.email}`}
          className="font-mono text-[clamp(15px,2.5vw,30px)] font-medium break-all text-amber no-underline transition-colors hover:text-[color-mix(in_srgb,var(--color-amber)_70%,#fff)]"
        >
          {profile.email}_
        </a>
        <a data-goto="top" href="#" className="font-mono text-xs font-medium text-dim uppercase">
          ↑ Top
        </a>
      </div>
    </footer>
  )
}
