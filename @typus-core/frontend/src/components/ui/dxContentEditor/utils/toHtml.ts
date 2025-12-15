import type { Block } from '../types/block'

const escapeAttr = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const serializeLayout = (block: Block): string => {
  const layout = block.layout || ({} as any)
  const attrs: string[] = []
  const push = (name: string, val: unknown) => {
    if (val === undefined || val === null || val === '') return
    attrs.push(`${name}="${escapeAttr(String(val))}"`)
  }

  push('data-dxce-width', layout.width)
  push('data-dxce-align-row', layout.alignRow)
  push('data-dxce-content-align', layout.contentAlign)
  if (typeof layout.fontSize === 'number' && Number.isFinite(layout.fontSize)) push('data-dxce-font-size', layout.fontSize)
  if (typeof layout.height === 'number' && Number.isFinite(layout.height)) push('data-dxce-height', layout.height)
  push('data-dxce-aspect-ratio', layout.aspectRatio)

  return attrs.length ? ' ' + attrs.join(' ') : ''
}

export function blocksToHTML(blocks: Block[]): string {
  const parts: string[] = []
  for (const block of blocks) {
    const layoutAttrs = serializeLayout(block)
    const baseAttr = `data-dxce-type="${block.type}"`

    if (block.type === 'image') {
      const src = escapeAttr(block.content || '')
      parts.push(`<div ${baseAttr}${layoutAttrs} data-dxce-src="${src}"><img src="${src}" alt="" /></div>`)
      continue
    }

    parts.push(`<div ${baseAttr}${layoutAttrs}>${block.content || ''}</div>`)
  }
  return parts.join('\n')
}

