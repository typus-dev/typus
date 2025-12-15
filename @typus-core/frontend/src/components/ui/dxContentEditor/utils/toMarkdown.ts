import type { Block } from '../types/block'

export function blocksToMarkdown(blocks: Block[]): string {
  const lines: string[] = []

  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        lines.push(`# ${stripHtml(block.content)}`)
        break
      case 'text':
        lines.push(stripHtml(block.content))
        lines.push('')
        break
      case 'image':
        lines.push(`![image](${block.content})`)
        lines.push('')
        break
      case 'list':
        lines.push(stripHtml(block.content))
        break
      case 'quote':
      case 'code':
      case 'text-image':
      case 'table':
      default:
        lines.push(stripHtml(block.content))
        break
    }
  }

  return lines.join('\n')
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}
