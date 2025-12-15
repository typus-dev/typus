// Utilities to normalize and manage HTML content for blocks.

export type TextLike = 'text' | 'list' | 'quote' | 'code'

export function normalizeHtml(type: string, html: string): string {
  if (!['text', 'list', 'quote', 'code'].includes(type)) return html

  const tmp = document.createElement('div')
  tmp.innerHTML = html

  const sizeFromFont = (s: string): number => {
    const map: Record<string, number> = { '1': 10, '2': 13, '3': 16, '4': 18, '5': 24, '6': 26, '7': 28 }
    return map[s] ?? 16
  }
  const clampPx = (n: number): number => {
    const min = 10
    const max = 40
    return Math.max(min, Math.min(max, Math.round(n)))
  }
  const toPx = (val: string): number | null => {
    const v = val.trim().toLowerCase()
    if (v.endsWith('px')) return Number.parseFloat(v)
    if (v.endsWith('pt')) return Number.parseFloat(v) * 96 / 72
    if (v.endsWith('rem') || v.endsWith('em')) {
      const n = Number.parseFloat(v)
      if (!Number.isFinite(n)) return null
      const base = 16
      return n * base
    }
    if (v === 'medium' || v === 'normal') return 16
    if (v === 'small') return 13
    if (v === 'large') return 18
    if (v === 'x-large' || v === 'xlarge') return 24
    if (v === 'xx-large' || v === 'xxlarge') return 24
    const num = Number.parseFloat(v)
    return Number.isFinite(num) ? num : null
  }

  const walk = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const tag = el.tagName.toLowerCase()

      if (/^h[1-6]$/.test(tag)) {
        const span = document.createElement('span')
        span.style.fontSize = '24px'
        span.style.fontWeight = '700'
        while (el.firstChild) span.appendChild(el.firstChild)
        el.replaceWith(span)
        walk(span)
        return
      }

      if (tag === 'font') {
        const s = (el.getAttribute('size') || '').trim()
        const span = document.createElement('span')
        const px = clampPx(sizeFromFont(s))
        span.style.fontSize = px + 'px'
        while (el.firstChild) span.appendChild(el.firstChild)
        el.replaceWith(span)
        walk(span)
        return
      }

      const fs = el.style.fontSize
      if (fs) {
        const px = toPx(fs)
        if (px !== null) el.style.fontSize = clampPx(px) + 'px'
      }

      const children = Array.from(el.childNodes)
      for (const c of children) walk(c)
      return
    }
  }

  walk(tmp)

  const sized = Array.from(tmp.querySelectorAll<HTMLElement>("[style*='font-size']"))
  for (const n of sized) {
    n.style.fontSize = ''
    if (n.getAttribute('style') === '') n.removeAttribute('style')
  }
  return tmp.innerHTML
}

export function stripInlineFontSizes(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const sized = Array.from(tmp.querySelectorAll<HTMLElement>("[style*='font-size']"))
  for (const n of sized) {
    n.style.fontSize = ''
    if (n.getAttribute('style') === '') n.removeAttribute('style')
  }
  const fonts = Array.from(tmp.getElementsByTagName('font'))
  for (const f of fonts) {
    const span = document.createElement('span')
    while (f.firstChild) span.appendChild(f.firstChild)
    f.replaceWith(span)
  }
  return tmp.innerHTML
}

export function convertContent(
  from: 'text' | 'heading' | 'list' | 'quote' | 'code' | 'table' | 'image' | 'text-image',
  to:   'text' | 'heading' | 'list' | 'quote' | 'code' | 'table' | 'image' | 'text-image',
  content: string,
): string {
  if (from === to) return content

  const strip = (html: string) => html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
  const toParagraphs = (text: string) => text.split(/\n+/).map((t) => `<p>${t}</p>`).join('')

  const plain = strip(content)
  switch (to) {
    case 'text':
      return toParagraphs(plain || 'New paragraph')
    case 'heading':
      return `<h1>${plain || 'Heading'}</h1>`
    case 'list':
      return `<ul>${(plain || 'List item').split(/\n+/).map((t) => `<li>${t}</li>`).join('')}</ul>`
    case 'quote':
      return `<blockquote>${plain || 'Quote'}</blockquote>`
    case 'code':
      return `<pre><code>${plain || '// code'}</code></pre>`
    case 'table':
      return content || ''
    case 'image':
      return ''
    default:
      return content
  }
}

