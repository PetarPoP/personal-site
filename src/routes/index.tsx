import { createFileRoute } from '@tanstack/react-router'
import { useScrollFx } from '#/lib/scroll-fx'
import { Hud } from '#/components/Hud'
import { Nav } from '#/components/Nav'
import { Hero } from '#/components/Hero'
import { Marquee } from '#/components/Marquee'
import { About } from '#/components/About'
import { Work } from '#/components/Work'
import { Photos } from '#/components/Photos'
import { Experience } from '#/components/Experience'
import { Contact } from '#/components/Contact'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  useScrollFx()
  return (
    <>
      <Hud />
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <About />
        <Work />
        <Photos />
        <Experience />
      </main>
      <Contact />
    </>
  )
}
