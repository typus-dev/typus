import type { SelectionContext } from './selection'

type InlineCommand = 'bold' | 'italic' | 'underline'

type MarkTag = 'strong' | 'em' | 'u'

const markTagByCommand: Record<InlineCommand, MarkTag> = {
  bold: 'strong',
  italic: 'em',
  underline: 'u',
}

interface ToggleOptions {
  /** If true, try to unwrap mark when selection already inside */
  allowToggle?: boolean
}

const ZERO_WIDTH = '\u200b'

const isWhitespace = (ch: string) => /[\s\u00a0]/.test(ch)

const findAncestorTag = (node: Node | null, tag: MarkTag, bound: HTMLElement): HTMLElement | null => {
  let current: Node | null = node
  while (current && current !== bound) {
    if (current instanceof HTMLElement && current.tagName.toLowerCase() === tag) return current
    current = current.parentNode
  }
  return null
}

const findAncestorFontSpan = (node: Node | null, bound: HTMLElement): HTMLElement | null => {
  let current: Node | null = node
  while (current && current !== bound) {
    if (current instanceof HTMLElement && current.dataset.dxceFontSize === '1') return current
    current = current.parentNode
  }
  return null
}

const unwrapElement = (el: HTMLElement) => {
  const parent = el.parentNode
  if (!parent) return
  const fragment = el.ownerDocument.createDocumentFragment()
  while (el.firstChild) fragment.appendChild(el.firstChild)
  parent.replaceChild(fragment, el)
}

const removeEmptyStyleAttr = (el: HTMLElement) => {
  if (!el.getAttribute('style')) return
  const style = el.getAttribute('style')
  if (!style) {
    el.removeAttribute('style')
    return
  }
  const trimmed = style.trim()
  if (!trimmed) {
    el.removeAttribute('style')
  }
}

const blockTags = new Set([
  'p', 'div', 'blockquote', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th'
])

const isBlockElement = (el: HTMLElement, root: HTMLElement) => {
  if (el === root) return true
  const tag = el.tagName.toLowerCase()
  if (blockTags.has(tag)) return true
  const display = window.getComputedStyle(el).display
  return display === 'block' || display === 'list-item' || display === 'table'
}

const applyAlignToElement = (el: HTMLElement, dir: 'left' | 'center' | 'right' | 'justify') => {
  if (el.hasAttribute('align')) el.removeAttribute('align')
  if (dir === 'left') {
    el.style.removeProperty('text-align')
    removeEmptyStyleAttr(el)
  } else {
    el.style.textAlign = dir
  }
}

const placeBoundaryMarkers = (range: Range) => {
  const doc = range.commonAncestorContainer.ownerDocument || document
  const startMarker = doc.createComment('dx-start')
  const endMarker = doc.createComment('dx-end')

  const end = range.cloneRange()
  end.collapse(false)
  end.insertNode(endMarker)

  const start = range.cloneRange()
  start.collapse(true)
  start.insertNode(startMarker)

  return { startMarker, endMarker }
}

const restoreRangeFromMarkers = (markers: { startMarker: Comment; endMarker: Comment }) => {
  const { startMarker, endMarker } = markers
  const range = document.createRange()
  if (startMarker.parentNode) {
    range.setStartAfter(startMarker)
  } else {
    throw new Error('[inlineCommands] start marker detached')
  }
  if (endMarker.parentNode) {
    range.setEndBefore(endMarker)
  } else {
    range.setEndAfter(startMarker)
  }
  startMarker.remove()
  endMarker.remove()
  return range
}

const expandCollapsedRange = (range: Range) => {
  if (!range.collapsed) return
  let container = range.startContainer
  let offset = range.startOffset
  if (container.nodeType === Node.TEXT_NODE) {
    const text = container.nodeValue ?? ''
    let start = offset
    let end = offset
    while (start > 0 && !isWhitespace(text[start - 1]!)) start--
    while (end < text.length && !isWhitespace(text[end]!)) end++
    range.setStart(container, start)
    range.setEnd(container, end)
    return
  }
  if (container.nodeType === Node.ELEMENT_NODE) {
    const element = container as Element
    const child = element.childNodes[offset] ?? element.childNodes[offset - 1] ?? null
    if (child && child.nodeType === Node.TEXT_NODE) {
      const textNode = child as Text
      const text = textNode.nodeValue ?? ''
      let start = child === element.childNodes[offset] ? 0 : text.length
      let end = text.length
      range.setStart(textNode, start)
      range.setEnd(textNode, end)
    }
  }
}

const collapseIntoElement = (selection: Selection, el: HTMLElement, position: 'start' | 'end') => {
  const range = document.createRange()
  if (!el.firstChild) {
    const text = el.ownerDocument.createTextNode('')
    el.appendChild(text)
  }
  if (position === 'start') {
    range.setStart(el.firstChild!, 0)
    range.collapse(true)
  } else {
    range.selectNodeContents(el)
    range.collapse(false)
  }
  selection.removeAllRanges()
  selection.addRange(range)
}

export const inlineCommands = {
  toggle(ctx: SelectionContext, command: InlineCommand, options: ToggleOptions = {}) {
    const tagName = markTagByCommand[command]
    const { range, selection, root } = ctx

    if (range.collapsed) {
      const insideMark = findAncestorTag(range.startContainer, tagName, root)
      if (insideMark) {
        const markers = placeBoundaryMarkers(range)
        unwrapElement(insideMark)
        const restored = restoreRangeFromMarkers(markers)
        restored.collapse(true)
        selection.removeAllRanges()
        selection.addRange(restored)
        return 'removed'
      }

      const mark = root.ownerDocument.createElement(tagName)
      mark.appendChild(root.ownerDocument.createTextNode(ZERO_WIDTH))
      range.insertNode(mark)
      collapseIntoElement(selection, mark, 'end')
      return 'applied'
    }

    const startMark = findAncestorTag(range.startContainer, tagName, root)
    const endMark = findAncestorTag(range.endContainer, tagName, root)

    if (options.allowToggle !== false && startMark && startMark === endMark) {
      const markers = placeBoundaryMarkers(range)
      unwrapElement(startMark)
      const restored = restoreRangeFromMarkers(markers)
      selection.removeAllRanges()
      selection.addRange(restored)
      return 'removed'
    }

    const markers = placeBoundaryMarkers(range)
    const workingRange = selection.getRangeAt(0)
    expandCollapsedRange(workingRange)
    const fragment = workingRange.extractContents()
    const wrapper = root.ownerDocument.createElement(tagName)
    wrapper.appendChild(fragment)
    workingRange.insertNode(wrapper)
    restoreRangeFromMarkers(markers)
    const finalRange = document.createRange()
    finalRange.selectNodeContents(wrapper)
    selection.removeAllRanges()
    selection.addRange(finalRange)
    return 'applied'
  },
  align(ctx: SelectionContext, dir: 'left' | 'center' | 'right' | 'justify') {
    const { range, root, selection } = ctx

    const collectTargets = (): HTMLElement[] => {
      if (range.collapsed) {
        const node = range.startContainer
        let current = node instanceof HTMLElement ? node : node.parentElement
        while (current && current !== root) {
          if (isBlockElement(current, root)) return [current]
          current = current.parentElement
        }
        return [root]
      }

      const nodes: HTMLElement[] = []
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
      let current = walker.currentNode as HTMLElement | null
      while (current) {
        if (current !== root && range.intersectsNode(current) && isBlockElement(current, root)) {
          nodes.push(current)
        }
        current = walker.nextNode() as HTMLElement | null
      }
      if (!nodes.length) return [root]
      return Array.from(new Set(nodes))
    }

    const targets = collectTargets()
    if (!targets.includes(root)) targets.push(root)
    targets.forEach((el) => applyAlignToElement(el, dir))

    ctx.collapse(dir === 'left' ? 'start' : 'end')
    return dir
  },
  setFontSize(ctx: SelectionContext, px: number) {
    const { range, selection, root } = ctx
    const value = Number.isFinite(px) ? Math.max(8, Math.round(px)) : 16

    const applySpan = (contentRange: Range) => {
      const fragment = contentRange.extractContents()
      const span = root.ownerDocument.createElement('span')
      span.dataset.dxceFontSize = '1'
      span.style.fontSize = value + 'px'
      span.appendChild(fragment)
      contentRange.insertNode(span)
      const newRange = document.createRange()
      newRange.selectNodeContents(span)
      selection.removeAllRanges()
      selection.addRange(newRange)
    }

    const unwrapExisting = (targetRange: Range) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
      const toUnwrap: HTMLElement[] = []
      let node: Node | null = walker.currentNode
      while (node) {
        if (node instanceof HTMLElement && node.dataset.dxceFontSize === '1') {
          try {
            const check = document.createRange()
            check.selectNode(node)
            const endAfterStart = targetRange.compareBoundaryPoints(Range.END_TO_START, check) > 0
            const startBeforeEnd = targetRange.compareBoundaryPoints(Range.START_TO_END, check) < 0
            if (endAfterStart && startBeforeEnd) {
              toUnwrap.push(node)
            }
          } catch {}
        }
        node = walker.nextNode()
      }
      for (const el of toUnwrap) {
        el.style.fontSize = ''
        unwrapElement(el)
      }
    }

    if (range.collapsed) {
      const existing = findAncestorFontSpan(range.startContainer, root)
      if (existing) {
        existing.style.fontSize = value + 'px'
        collapseIntoElement(selection, existing, 'end')
        return value
      }

      const span = root.ownerDocument.createElement('span')
      span.dataset.dxceFontSize = '1'
      span.style.fontSize = value + 'px'
      span.appendChild(root.ownerDocument.createTextNode(ZERO_WIDTH))
      range.insertNode(span)
      collapseIntoElement(selection, span, 'end')
      return value
    }

    const markers = placeBoundaryMarkers(range)
    const workingRange = selection.getRangeAt(0)
    unwrapExisting(workingRange)
    applySpan(workingRange)
    restoreRangeFromMarkers(markers)
    return value
  },
}

export type InlineCommandResult = 'applied' | 'removed'
