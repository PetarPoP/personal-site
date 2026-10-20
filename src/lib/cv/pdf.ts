import type { CvFont } from '#/lib/cv/fonts.gen'

// A small one-page PDF writer, just enough for the CV: embedded TrueType fonts, text, lines,
// filled rectangles and link areas. It is written by hand because PDF libraries are too heavy
// for a Worker's CPU budget; with the fonts prepared ahead (scripts/cv-fonts.py) a CV takes a
// millisecond or two. Text is written as glyph ids with a ToUnicode map, so the PDF's text can
// still be selected, searched and read by applicant tracking systems.

export type Rgb = [number, number, number]

export const hex = (h: string): Rgb => [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16) / 255) as Rgb

const num = (n: number) => (Math.round(n * 100) / 100).toString()

type Loaded = { font: CvFont; gid: Map<number, number>; width: Map<number, number>; used: Map<number, number> }

export class Pdf {
  readonly width: number
  readonly height: number
  private ops: string[] = []
  private links: { rect: number[]; url: string }[] = []
  private fonts: Loaded[] = []

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  // Returns the font's index, which text() and measure() take.
  addFont(font: CvFont) {
    const gid = new Map<number, number>()
    const width = new Map<number, number>()
    for (let i = 0; i < font.glyphs.length; i += 3) {
      gid.set(font.glyphs[i], font.glyphs[i + 1])
      width.set(font.glyphs[i + 1], (font.glyphs[i + 2] * 1000) / font.unitsPerEm)
    }
    this.fonts.push({ font, gid, width, used: new Map() })
    return this.fonts.length - 1
  }

  private glyph(f: Loaded, ch: string) {
    const cp = ch.codePointAt(0)!
    return f.gid.get(cp) ?? f.gid.get(0x3f)!
  }

  // Width in points of `s` at `size`, with `spacing` points added after each character.
  measure(s: string, font: number, size: number, spacing = 0) {
    const f = this.fonts[font]
    let w = 0
    for (const ch of s) w += (f.width.get(this.glyph(f, ch)) ?? 500) * size / 1000 + spacing
    return w - (s.length ? spacing : 0)
  }

  // Coordinates are from the page's top-left corner; y is the text's baseline.
  text(s: string, x: number, y: number, font: number, size: number, color: Rgb, spacing = 0) {
    const f = this.fonts[font]
    let hexs = ''
    for (const ch of s) {
      const g = this.glyph(f, ch)
      if (!f.used.has(g)) f.used.set(g, ch.codePointAt(0)!)
      hexs += g.toString(16).padStart(4, '0')
    }
    this.ops.push(`BT /F${font} ${num(size)} Tf ${num(spacing)} Tc ${color.map(num).join(' ')} rg ${num(x)} ${num(this.height - y)} Td <${hexs}> Tj ET`)
  }

  line(x1: number, y1: number, x2: number, y2: number, thickness: number, color: Rgb) {
    this.ops.push(`${color.map(num).join(' ')} RG ${num(thickness)} w ${num(x1)} ${num(this.height - y1)} m ${num(x2)} ${num(this.height - y2)} l S`)
  }

  rect(x: number, y: number, w: number, h: number, color: Rgb) {
    this.ops.push(`${color.map(num).join(' ')} rg ${num(x)} ${num(this.height - y - h)} ${num(w)} ${num(h)} re f`)
  }

  // A clickable area, given like rect().
  link(x: number, y: number, w: number, h: number, url: string) {
    this.links.push({ rect: [x, this.height - y - h, x + w, this.height - y], url })
  }

  save(title: string, author: string, lang: string): Uint8Array {
    const enc = new TextEncoder()
    const chunks: Uint8Array[] = []
    const offsets: number[] = []
    let size = 0
    const push = (b: Uint8Array | string) => {
      const bytes = typeof b === 'string' ? enc.encode(b) : b
      chunks.push(bytes)
      size += bytes.length
    }
    // Objects are numbered in the order they are written.
    let next = 1
    const reserve = () => next++
    const pending = new Map<number, (Uint8Array | string)[]>()
    const obj = (id: number, ...parts: (Uint8Array | string)[]) => pending.set(id, parts)
    const stream = (id: number, dict: string, data: Uint8Array | string) => {
      const bytes = typeof data === 'string' ? enc.encode(data) : data
      obj(id, `<< ${dict} /Length ${bytes.length} >>\nstream\n`, bytes, '\nendstream')
    }

    const catalog = reserve()
    const pages = reserve()
    const page = reserve()
    const content = reserve()
    const info = reserve()
    const fontIds = this.fonts.map((f) => {
      const ids = { type0: reserve(), cid: reserve(), desc: reserve(), file: reserve(), unicode: reserve() }
      const { font } = f
      const s = 1000 / font.unitsPerEm
      const used = [...f.used.entries()].sort((a, b) => a[0] - b[0])
      obj(ids.type0, `<< /Type /Font /Subtype /Type0 /BaseFont /${font.name} /Encoding /Identity-H /DescendantFonts [${ids.cid} 0 R] /ToUnicode ${ids.unicode} 0 R >>`)
      const w = used.map(([g]) => `${g} [${num(f.width.get(g) ?? 500)}]`).join(' ')
      obj(
        ids.cid,
        `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${font.name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${ids.desc} 0 R /CIDToGIDMap /Identity /DW 500 /W [${w}] >>`,
      )
      obj(
        ids.desc,
        `<< /Type /FontDescriptor /FontName /${font.name} /Flags 32 /FontBBox [${font.bbox.map((v) => num(v * s)).join(' ')}] /ItalicAngle 0 /Ascent ${num(font.ascent * s)} /Descent ${num(font.descent * s)} /CapHeight ${num(font.capHeight * s)} /StemV 80 /FontFile2 ${ids.file} 0 R >>`,
      )
      stream(ids.file, `/Filter /FlateDecode /Length1 ${font.length}`, fontData(font))
      const map = used.map(([g, cp]) => `<${g.toString(16).padStart(4, '0')}> <${utf16(cp)}>`)
      let cmap = '/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def /CMapName /Adobe-Identity-UCS def /CMapType 2 def 1 begincodespacerange <0000> <FFFF> endcodespacerange\n'
      for (let i = 0; i < map.length; i += 100) {
        const part = map.slice(i, i + 100)
        cmap += `${part.length} beginbfchar\n${part.join('\n')}\nendbfchar\n`
      }
      cmap += 'endcmap CMapName currentdict /CMap defineresource pop end end'
      stream(ids.unicode, '', cmap)
      return ids
    })
    const annots = this.links.map((l) => {
      const id = reserve()
      obj(id, `<< /Type /Annot /Subtype /Link /Rect [${l.rect.map(num).join(' ')}] /Border [0 0 0] /A << /S /URI /URI (${l.url.replace(/[()\\]/g, '\\$&')}) >> >>`)
      return id
    })

    obj(catalog, `<< /Type /Catalog /Pages ${pages} 0 R /Lang (${lang}) >>`)
    obj(pages, `<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`)
    obj(
      page,
      `<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Contents ${content} 0 R /Resources << /Font << ${fontIds.map((f, i) => `/F${i} ${f.type0} 0 R`).join(' ')} >> >>${annots.length ? ` /Annots [${annots.map((a) => `${a} 0 R`).join(' ')}]` : ''} >>`,
    )
    stream(content, '', this.ops.join('\n'))
    obj(info, `<< /Title ${pdfString(title)} /Author ${pdfString(author)} /Producer (petarpopovic.com) /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}Z) >>`)

    push('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n')
    for (let id = 1; id < next; id++) {
      offsets[id] = size
      push(`${id} 0 obj\n`)
      for (const p of pending.get(id)!) push(p)
      push('\nendobj\n')
    }
    const xref = size
    push(`xref\n0 ${next}\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${o.toString().padStart(10, '0')} 00000 n \n`).join('')}`)
    push(`trailer\n<< /Size ${next} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`)

    const out = new Uint8Array(size)
    let at = 0
    for (const c of chunks) {
      out.set(c, at)
      at += c.length
    }
    return out
  }
}

const decoded = new Map<CvFont, Uint8Array>()
function fontData(font: CvFont) {
  let d = decoded.get(font)
  if (!d) decoded.set(font, (d = Uint8Array.from(atob(font.data), (c) => c.charCodeAt(0))))
  return d
}

const utf16 = (cp: number) => {
  if (cp < 0x10000) return cp.toString(16).padStart(4, '0')
  const c = cp - 0x10000
  return ((0xd800 + (c >> 10)).toString(16) + (0xdc00 + (c & 0x3ff)).toString(16)).toUpperCase()
}

// Metadata strings as UTF-16 so "Popović" survives.
const pdfString = (s: string) => {
  let h = 'FEFF'
  for (const ch of s) h += utf16(ch.codePointAt(0)!)
  return `<${h}>`
}
