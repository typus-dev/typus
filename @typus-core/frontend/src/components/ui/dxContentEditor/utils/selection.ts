export interface SelectionContext {
  root: HTMLElement
  selection: Selection
  range: Range
  collapse: (to?: 'start' | 'end') => void
}

interface Options {
  /** Editable root element to constrain the selection */
  root: HTMLElement | null
  /** Previously stored range to restore when the DOM selection is outside of the root */
  fallbackRange?: Range | null
  /** Expand selection to cover the entire root if the current range is collapsed */
  expand?: boolean
  /** Collapse newly created range to start or end when expand is false */
  collapseTo?: 'start' | 'end'
  /** Focus the root element before working with the selection */
  focus?: boolean
}

export function ensureSelectionContext(options: Options): SelectionContext | null {
  const { root, fallbackRange = null, expand = false, collapseTo = 'end', focus = true } = options
  if (!root) return null

  if (focus) {
    try {
      root.focus({ preventScroll: true })
    } catch {
      root.focus()
    }
  }

  const selection = window.getSelection()
  if (!selection) return null

  let range: Range | null = null

  if (selection.rangeCount > 0) {
    const current = selection.getRangeAt(0)
    if (root.contains(current.commonAncestorContainer)) {
      range = current.cloneRange()
    }
  }

  if (!range && fallbackRange) {
    if (root.contains(fallbackRange.commonAncestorContainer)) {
      range = fallbackRange.cloneRange()
    }
  }

  if (!range) {
    range = document.createRange()
    range.selectNodeContents(root)
    if (!expand) {
      range.collapse(collapseTo === 'start')
    }
  } else if (expand && range.collapsed) {
    range.selectNodeContents(root)
  }

  selection.removeAllRanges()
  selection.addRange(range)

  const collapse = (to: 'start' | 'end' = 'end') => {
    const next = range!.cloneRange()
    next.collapse(to === 'start')
    selection.removeAllRanges()
    selection.addRange(next)
  }

  return { root, selection, range, collapse }
}

export const selectionFallback = {
  store(range: Range | null): Range | null {
    if (!range) return null
    try {
      return range.cloneRange()
    } catch {
      return null
    }
  },
  /**
   * Validates that the stored range still lives inside the provided root.
   */
  isValid(range: Range | null, root: HTMLElement | null): range is Range {
    return !!(range && root && root.contains(range.commonAncestorContainer))
  },
}
