import { profile } from '#/data/portfolio'

export function Marquee() {
  return (
    <div data-fx="marquee" aria-label={profile.marquee} className="overflow-hidden border-y border-deep py-[18px] text-signal">
      <div aria-hidden="true" className="flex w-max font-mono text-[22px] leading-none font-medium whitespace-nowrap uppercase sm:text-[30px]">
        <span className="pr-[30px]">{profile.marquee}</span>
        <span className="pr-[30px]">{profile.marquee}</span>
      </div>
    </div>
  )
}
