import { normalizeHtml } from './useBlockContent'
import type { Block } from '../types/block'
import { marked } from 'marked'

const BLOCK_TYPES: Block['type'][] = ['text', 'heading', 'image', 'text-image', 'list', 'table', 'quote', 'code']

const genId = (() => {
  let seq = 0
  return () => `b_${Date.now()}_${++seq}`
})()

const defaultLayout = () => ({ width: 100 as 100, alignRow: 'left' as const, contentAlign: 'left' as const })

export function importFromHtml(html: string): Block[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const typed = importTyped(doc.body)
  if (typed.length) return typed
  return importLegacy(html)
}

function importTyped(root: HTMLElement): Block[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-dxce-type]')).filter((el) => !el.parentElement?.closest('[data-dxce-type]'))
  if (!nodes.length) return []

  const blocks: Block[] = []
  for (const el of nodes) {
    const typeAttr = (el.getAttribute('data-dxce-type') || '').trim()
    if (!typeAttr || !BLOCK_TYPES.includes(typeAttr as Block['type'])) continue
    const layout = parseLayout(el)
    const type = (typeAttr as Block['type'])

    if (type === 'image') {
      const src = el.getAttribute('data-dxce-src') || el.querySelector('img')?.getAttribute('src') || ''
      blocks.push({ id: genId(), type: 'image', content: src, layout })
      continue
    }

    const content = el.innerHTML.trim()
    blocks.push({ id: genId(), type, content, layout })
  }
  return blocks
}

function parseLayout(el: HTMLElement) {
  const widthRaw = Number.parseInt(el.getAttribute('data-dxce-width') || '', 10)
  const width = ([25, 33, 50, 66, 75, 100] as const).includes(widthRaw as any)
    ? (widthRaw as 25 | 33 | 50 | 66 | 75 | 100)
    : 100

  const alignAttr = (el.getAttribute('data-dxce-align-row') || '').toLowerCase()
  const alignRow: Block['layout']['alignRow'] = alignAttr === 'center' ? 'center' : alignAttr === 'right' ? 'right' : 'left'

  const contentAlignAttr = (el.getAttribute('data-dxce-content-align') || '').toLowerCase()
  let contentAlign: Block['layout']['contentAlign'] = alignRow
  if (contentAlignAttr === 'justify') contentAlign = 'justify'
  else if (contentAlignAttr === 'center' || contentAlignAttr === 'right' || contentAlignAttr === 'left') contentAlign = contentAlignAttr as typeof contentAlign

  const fontSizeRaw = Number.parseInt(el.getAttribute('data-dxce-font-size') || '', 10)
  const heightRaw = Number.parseInt(el.getAttribute('data-dxce-height') || '', 10)
  const aspectRatioAttr = (el.getAttribute('data-dxce-aspect-ratio') || '').toLowerCase()
  const aspectRatio = (aspectRatioAttr === '16:9' || aspectRatioAttr === '4:3' || aspectRatioAttr === '1:1' || aspectRatioAttr === 'free') ? aspectRatioAttr as Block['layout']['aspectRatio'] : undefined

  const layout: Block['layout'] = {
    width,
    alignRow,
    contentAlign,
  }

  if (Number.isFinite(fontSizeRaw)) layout.fontSize = fontSizeRaw
  if (Number.isFinite(heightRaw)) layout.height = heightRaw
  if (aspectRatio) layout.aspectRatio = aspectRatio

  return layout
}

function importLegacy(html: string): Block[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const body = doc.body

  body.querySelectorAll('script, style').forEach((n) => n.remove())
  body.querySelectorAll('*').forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      const name = a.name.toLowerCase()
      if (name.startsWith('on')) el.removeAttribute(a.name)
      if (name === 'style' || name === 'class' || name === 'id' || name === 'width' || name === 'height') el.removeAttribute(a.name)
    }
  })

  const blocks: Block[] = []

  const pushText = (htmlStr: string) => {
    const content = normalizeHtml('text', htmlStr)
    if (!content.trim()) return
    blocks.push({ id: genId(), type: 'text', content, layout: defaultLayout() })
  }

  let pBuffer: string[] = []
  const flushP = () => {
    if (pBuffer.length) {
      pushText(pBuffer.join(''))
      pBuffer = []
    }
  }

  const handleNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.trim() || ''
      if (t) pBuffer.push(`<p>${escapeHtml(t)}</p>`)
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      flushP()
      const txt = el.outerHTML || ''
      blocks.push({ id: genId(), type: 'heading', content: txt, layout: { width: 100, alignRow: 'left', contentAlign: 'left', fontSize: tag === 'h1' ? 32 : tag === 'h2' ? 28 : 24 } })
      return
    }
    if (tag === 'ul' || tag === 'ol') {
      flushP()
      const out = cloneOuterHtml(el)
      const content = normalizeHtml('list', out)
      blocks.push({ id: genId(), type: 'list', content, layout: defaultLayout() })
      return
    }
    if (tag === 'blockquote') {
      flushP()
      const out = `<blockquote>${el.innerHTML}</blockquote>`
      const content = normalizeHtml('quote', out)
      blocks.push({ id: genId(), type: 'quote', content, layout: defaultLayout() })
      return
    }
    if (tag === 'pre') {
      flushP()
      const txt = el.textContent || ''
      if (/<[a-z][\s\S]*>/i.test(txt)) {
        Array.from(new DOMParser().parseFromString(txt, 'text/html').body.childNodes).forEach(handleNode)
      } else {
        const out = `<pre><code>${escapeHtml(txt)}</code></pre>`
        blocks.push({ id: genId(), type: 'code', content: out, layout: defaultLayout() })
      }
      return
    }
    if (tag === 'img') {
      flushP()
      const src = el.getAttribute('src') || ''
      if (src) blocks.push({ id: genId(), type: 'image', content: src, layout: { width: 100, alignRow: 'center', contentAlign: 'center' } })
      return
    }
    if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article') {
      const hasBlockInside = /<(h1|h2|h3|ul|ol|li|blockquote|pre|code|img|table|div|p)[\s>]/i.test(el.innerHTML)
      if (hasBlockInside) {
        Array.from(el.childNodes).forEach(handleNode)
      } else {
        const inner = el.innerHTML.trim()
        if (inner) pBuffer.push(`<p>${inner}</p>`)
      }
      return
    }
    const children = Array.from(el.childNodes)
    if (children.length) children.forEach(handleNode)
  }

  const children = Array.from(body.childNodes)
  if (children.length) children.forEach(handleNode)
  flushP()
  return blocks
}

export function importFromMarkdown(md: string): Block[] {
  if (!md.trim()) return []
  try {
    const html = marked.parse(md, { breaks: true, gfm: true }) as string
    return importFromHtml(html)
  } catch (err) {
    console.warn('[dxContentEditor] Failed to parse markdown', err)
    return importFromHtml(md)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function cloneOuterHtml(el: HTMLElement): string {
  const tmp = document.createElement('div')
  tmp.appendChild(el.cloneNode(true))
  return tmp.innerHTML
}
