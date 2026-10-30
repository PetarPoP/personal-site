import { profile } from '#/data/portfolio'
import { cv } from '#/data/cv'
import type { CvLang } from '#/data/cv'
import type { RankedProject } from '#/lib/projects'
import { Pdf, hex } from '#/lib/cv/pdf'
import { bold, extrabold, regular } from '#/lib/cv/fonts.gen'

// Lays out the one-page CV (US Letter, in points from the top-left), matching the design Pop
// made by hand: name and contacts, a red rule, the summary, work on the left, education and
// certificates on the right, and the nine best projects in a grid at the bottom.

const W = 612
const H = 792
const L = 40
const R = 572
const SPLIT = 349 // left column's right edge
const RIGHT = 372.5 // right column's left edge

const ink = hex('#201e1d')
const red = hex('#c42612')
const rule = hex('#ec3013')
const grey = hex('#9e9d9c')
const hair = hex('#d7d3d3')
const paper = hex('#f3f2f2')

export function renderCv(lang: CvLang, ranked: RankedProject[]) {
  const c = cv[lang]
  const pdf = new Pdf(W, H)
  const F = { regular: pdf.addFont(regular), bold: pdf.addFont(bold), extrabold: pdf.addFont(extrabold) }

  const wrap = (s: string, font: number, size: number, width: number) => {
    const lines: string[] = []
    let line = ''
    for (const word of s.split(' ')) {
      const next = line ? `${line} ${word}` : word
      if (line && pdf.measure(next, font, size) > width) {
        lines.push(line)
        line = word
      } else line = next
    }
    if (line) lines.push(line)
    return lines
  }
  // Draws wrapped text from baseline y and returns the last line's baseline.
  const para = (s: string, x: number, y: number, width: number, font: number, size: number, leading: number, color = ink) => {
    const lines = wrap(s, font, size, width)
    lines.forEach((l, i) => pdf.text(l, x, y + i * leading, font, size, color))
    return y + (lines.length - 1) * leading
  }
  const rightText = (s: string, x: number, y: number, font: number, size: number, color = ink) =>
    pdf.text(s, x - pdf.measure(s, font, size), y, font, size, color)
  const heading = (s: string, x1: number, x2: number, y: number) => {
    pdf.text(s, x1, y, F.extrabold, 8.5, ink, 1.3)
    pdf.line(x1, y + 8, x2, y + 8, 1.2, grey)
  }
  // Items in a row split by small red dots, wrapping before an item that would cross x2.
  // Returns the last line's baseline.
  const dotted = (items: string[], x1: number, y: number, x2: number, leading = 16) => {
    let x = x1
    items.forEach((s, i) => {
      const w = pdf.measure(s, F.regular, 9)
      if (i && x + 11 + w > x2) {
        x = x1
        y += leading
      } else if (i) {
        pdf.rect(x + 4.6, y - 3.6, 1.8, 1.8, red)
        x += 11
      }
      pdf.text(s, x, y, F.regular, 9, ink)
      x += w
    })
    return y
  }
  const linked = (s: string, x: number, y: number, size: number, url: string) => {
    const w = pdf.measure(s, F.regular, size)
    pdf.text(s, x, y, F.regular, size, red)
    pdf.line(x, y + 2, x + w, y + 2, 0.6, red)
    pdf.link(x, y - size, w, size + 4, url)
  }

  pdf.rect(0, 0, W, H, paper)

  // Header
  pdf.text(c.kicker, L, 48.5, F.bold, 7.5, red, 1.2)
  profile.name.split(' ').forEach((part, i) => pdf.text(part, L, 90 + i * 36.5, F.extrabold, 40, ink, -1))
  // Six rows, 13.7 apart, ending just above the rule: place, both phones, mail, site, code, LinkedIn.
  const cx = 402
  const row = (i: number) => 59.3 + i * 13.7
  const bare = (url: string) => url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '')
  pdf.text(c.location, cx, row(0), F.bold, 9, ink)
  dotted(c.phones, cx, row(1), R)
  linked(profile.email, cx, row(2), 9, `mailto:${profile.email}`)
  linked(bare(profile.site), cx, row(3), 9, profile.site)
  linked(bare(profile.github), cx, row(4), 9, profile.github)
  linked(bare(profile.linkedin), cx, row(5), 9, profile.linkedin)
  pdf.line(L, 147, R, 147, 2.6, rule)

  const summaryEnd = para(c.summary, L, 174, 395, F.regular, 11, 16.8)

  // Work experience
  const top = summaryEnd + 28
  heading(c.headings.work, L, SPLIT, top)
  let y = top + 28
  let left = y
  for (const job of c.work) {
    const dateW = pdf.measure(job.when, F.bold, 7.5)
    rightText(job.when, SPLIT, y, F.bold, 7.5, red)
    const t = para(job.title, L, y, SPLIT - L - dateW - 12, F.bold, 10, 15.4)
    left = para(job.text, L, t + 17.5, SPLIT - L, F.regular, 9, 14.4)
    y = left + 24.5
  }

  // Education, certificates, other work
  const rw = R - RIGHT
  let ry = top
  const dated = (title: string, items: typeof c.education) => {
    heading(title, RIGHT, R, ry)
    let at = ry + 26
    let end = at
    for (const it of items) {
      pdf.text(it.when, RIGHT, at, F.bold, 7.5, red)
      const t = para(it.title, RIGHT, at + 15, rw, F.bold, 10, 14.9)
      end = para(it.text, RIGHT, t + 16, rw, F.regular, 9, 14.4)
      at = end + 22
    }
    ry = end + 30
  }
  dated(c.headings.education, c.education)
  dated(c.headings.certificates, c.certificates)
  heading(c.headings.other, RIGHT, R, ry)
  const right = dotted(c.other, RIGHT, ry + 24, R)

  // Key projects: the nine best, row by row.
  const ky = Math.max(left + 40, right + 30)
  heading(c.headings.projects, L, R, ky)
  const colW = 166
  const gap = (R - L - 3 * colW) / 2
  const picks = ranked.slice(0, 9)
  let rowY = ky + 26
  let lastRule = rowY
  for (let r = 0; r < picks.length; r += 3) {
    const cells = picks.slice(r, r + 3).map((p, i) => {
      const x = L + i * (colW + gap)
      const stack = wrap(p.stack.replace(/ · /g, ', '), F.regular, 7.5, colW * 0.5)
      const stackW = Math.max(...stack.map((s) => pdf.measure(s, F.regular, 7.5)))
      const name = wrap(lang === 'hr' ? (p.nameHr ?? p.name) : p.name, F.bold, 9.5, colW - stackW - 10)
      return { p, x, stack, name }
    })
    const lines = Math.max(...cells.map((cell) => Math.max(cell.name.length, Math.ceil((cell.stack.length * 10.6) / 12))))
    for (const { p, x, stack, name } of cells) {
      name.forEach((n, i) => pdf.text(n, x, rowY + i * 12, F.bold, 9.5, ink))
      stack.forEach((s, i) => rightText(s, x + colW, rowY + i * 10.6, F.regular, 7.5))
      const link = p.live ?? p.url
      if (link) pdf.link(x, rowY - 9.5, colW, name.length * 12 + 3, link)
    }
    lastRule = rowY + (lines - 1) * 12 + 7
    cells.forEach(({ x }) => pdf.line(x, lastRule, x + colW, lastRule, 0.6, hair))
    rowY = lastRule + 12.6
  }
  pdf.text(c.footnote, L, lastRule + 15, F.regular, 7.5, ink)
  pdf.link(L, lastRule + 7, pdf.measure(c.footnote, F.regular, 7.5), 11, profile.github)

  const title = `${profile.name} – ${lang === 'hr' ? 'Životopis' : 'CV'}`
  return pdf.save(title, profile.name, lang)
}
