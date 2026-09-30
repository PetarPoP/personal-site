import { photos } from '#/data/portfolio'
import { Label, Placeholder } from './Label'

// Pinned section whose photo strip slides sideways as you scroll down.
export function Photos() {
  return (
    <section
      data-section="photos"
      data-fx="hscroll"
      aria-label="Photography"
      className="relative h-[335svh] border-t border-deep"
    >
      <div className="sticky top-0 flex h-svh flex-col overflow-hidden pt-[92px] [--ph:0.6] md:[--ph:1] md:[@media(max-height:760px)]:[--ph:0.8]">
        <div className="flex flex-wrap items-end justify-between gap-4 px-4 pb-7 sm:px-8">
          <div>
            <Label className="mb-2.5">[02] Photography</Label>
            <h2 className="m-0 font-sans text-[clamp(36px,5.3vw,64px)] leading-[0.9] font-bold tracking-[-0.04em]">
              THROUGH THE LENS
            </h2>
          </div>
          <a
            data-goto="photos"
            href="#photos"
            className="border border-teal px-[18px] py-3 font-mono text-[13px] font-medium text-paper uppercase no-underline transition-colors hover:border-amber hover:text-amber"
          >
            Full gallery →
          </a>
        </div>
        <div data-track className="flex w-max items-end gap-5 px-4 sm:px-8">
          {photos.map((ph) => (
            <figure
              key={ph.id}
              className="m-0 flex flex-col gap-2"
              style={{ width: `calc(${ph.width}px * var(--ph))` }}
            >
              <Placeholder
                src={ph.src}
                alt={ph.caption}
                stripe={ph.warm ? 'color-mix(in srgb, #df5e00 28%, #0d1b1c)' : undefined}
                className="w-full border border-teal"
                style={{ height: `calc(${ph.height}px * var(--ph))` }}
              />
              <figcaption className="m-0 flex justify-between font-mono text-[11px] font-medium text-caption">
                <span>{ph.id}</span>
                <span>{ph.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="mx-4 mt-auto mb-[72px] h-0.5 bg-deep sm:mx-8">
          <div data-bar className="h-full w-0 bg-amber" />
        </div>
      </div>
    </section>
  )
}
