<script setup lang="ts">
import { computed, watch, ref, computed as vComputed, nextTick, onMounted, onBeforeUnmount, type CSSProperties } from 'vue'
import { useBlockEditor } from '../composables/useBlockEditor'
import BlockItem from './BlockItem.vue'
import ContextMenu from './ContextMenu.vue'
import { convertContent, normalizeHtml } from '../composables/useBlockContent'
import { importFromHtml, importFromMarkdown } from '../composables/useImportPipeline'
import { useEditorImageUploads } from '../composables/useEditorImageUploads'
import { logger } from '@/core/logging/logger'
import type { Block } from '../types/block'

interface Props {
  modelValue?: Block[]
  readonly?: boolean
}
const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [blocks: Block[]] }>()

const { blocks, updateBlock, deleteBlock } = useBlockEditor(
  props.modelValue && props.modelValue.length ? props.modelValue : [],
)

const { uploadImages } = useEditorImageUploads()

watch(
  () => props.modelValue,
  (val) => {
    if (val && val.length) {
      blocks.value = [...val]
    }
  },
)

const rows = computed(() => blocks.value)
const renderRows = computed(() =>
  draggingId.value ? rows.value.filter((b) => b.id !== draggingId.value) : rows.value,
)
const selectedId = ref<string | null>(null)

const genId = () => `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const onUpdate = (block: Block) => {
  updateBlock(block.id, block)
  emit('update:modelValue', blocks.value)
}

const onDelete = (id: string) => {
  pushHistory('delete')
  deleteBlock(id)
  emit('update:modelValue', blocks.value)
}

const onTransform = (id: string, type: Block['type']) => {
  const idx = rows.value.findIndex((b) => b.id === id)
  if (idx < 0) return
  const current = rows.value[idx] as Block
  const next = [...blocks.value]
  const updated: Block = {
    id: current.id,
    layout: current.layout,
    type,
    content: convertContent(current.type, type, current.content),
  }
  pushHistory('transform')
  next[idx] = updated
  blocks.value = next
  emit('update:modelValue', blocks.value)
}

const onBlockFocus = (id: string) => { selectedId.value = id }
const onBlockBlur = (id: string) => { if (selectedId.value === id) { /* keep selection */ } }

const draggingId = ref<string | null>(null)
const placeholderIndex = ref<number | null>(null)
const dragHeight = ref<number>(44)
const pendingDrag = ref<{ id: string; x: number; y: number } | null>(null)
const pointerX = ref(0)
const pointerY = ref(0)
const dragOffsetX = ref(0)
const dragOffsetY = ref(0)
const dragAvatarWidth = ref(0)

const draggedBlock = vComputed(() =>
  draggingId.value ? rows.value.find((b) => b.id === draggingId.value) ?? null : null,
)

const snapCenters = ref<number[]>([])

const computeIndexFromSnapshot = (clientY: number): number => {
  let ins = snapCenters.value.findIndex((mid) => clientY < mid)
  if (ins === -1) ins = snapCenters.value.length
  return ins
}

const startDragging = (id: string, clientY: number) => {
  const els = Array.from(document.querySelectorAll('.canvas .block')) as HTMLElement[]
  const centers: number[] = []
  for (const el of els) {
    const elId = el.getAttribute('data-id') || ''
    if (elId === id) continue
    const r = el.getBoundingClientRect()
    centers.push(r.top + r.height / 2)
  }
  snapCenters.value = centers
  draggingId.value = id
  placeholderIndex.value = computeIndexFromSnapshot(clientY)
  const src = document.querySelector(`.canvas .block[data-id="${id}"]`) as HTMLElement | null
  if (src) {
    const r = src.getBoundingClientRect()
    dragHeight.value = Math.max(44, r.height)
    dragAvatarWidth.value = r.width
    dragOffsetX.value = pointerX.value - r.left
    dragOffsetY.value = pointerY.value - r.top
  } else {
    dragHeight.value = 44
    dragAvatarWidth.value = 0
    dragOffsetX.value = 0
    dragOffsetY.value = 0
  }
}

let rafPending = false
let lastX = 0
let lastY = 0
const DRAG_THRESHOLD = 4
const onGlobalMove = (e: PointerEvent) => {
  lastX = e.clientX
  lastY = e.clientY
  pointerX.value = lastX
  pointerY.value = lastY
  if (!draggingId.value && pendingDrag.value) {
    const dx = Math.abs(lastX - pendingDrag.value.x)
    const dy = Math.abs(lastY - pendingDrag.value.y)
    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      startDragging(pendingDrag.value.id, lastY)
    } else {
      return
    }
  }
  if (!draggingId.value) return
  if (rafPending) return
  rafPending = true
  requestAnimationFrame(() => {
    const nextIdx = computeIndexFromSnapshot(lastY)
    const HYST = 6
    if (placeholderIndex.value === null) {
      placeholderIndex.value = nextIdx
    } else if (Math.abs(nextIdx - placeholderIndex.value) > 0) {
      placeholderIndex.value = nextIdx
    }
    rafPending = false
  })
}

const onGlobalUp = () => {
  // Always clear pending drag state on mouse up to avoid sticky drags
  if (!draggingId.value) {
    pendingDrag.value = null
    return
  }
  const id = draggingId.value
  const at = placeholderIndex.value ?? rows.value.length
  draggingId.value = null
  placeholderIndex.value = null
  pendingDrag.value = null
  const srcIdx = rows.value.findIndex((b) => b.id === id)
  if (srcIdx < 0) return
  const item = rows.value[srcIdx]
  const base = rows.value.filter((b) => b.id !== id)
  const atFixed = Math.max(0, Math.min(base.length, at))
  const next = [...base.slice(0, atFixed), item, ...base.slice(atFixed)]
  blocks.value = next
  emit('update:modelValue', blocks.value)
}

const onBlockDragStart = (id: string, x: number, y: number) => {
  pendingDrag.value = { id, x, y }
}

onMounted(() => {
  document.addEventListener('pointermove', onGlobalMove)
  document.addEventListener('pointerup', onGlobalUp)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointermove', onGlobalMove)
  document.removeEventListener('pointerup', onGlobalUp)
})

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    document.removeEventListener('pointermove', onGlobalMove)
    document.removeEventListener('pointerup', onGlobalUp)
  })
}

const canvasEl = ref<HTMLElement | null>(null)
const ctxOpen = ref(false)
const ctxX = ref(0)
const ctxY = ref(0)
const ctxTargetId = ref<string | null>(null)
const onContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  ctxOpen.value = true
  ctxX.value = e.clientX
  ctxY.value = e.clientY
  const block = (e.target as HTMLElement).closest('.block') as HTMLElement | null
  ctxTargetId.value = block?.getAttribute('data-id') || null
}

const onCtxInsert = async (t: 'text' | 'heading' | 'image' | 'list' | 'quote' | 'code' | 'table') => {
  if (props.readonly) return
  const canvas = canvasEl.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const centerX = (rect.left + rect.right) / 2
  const alignRow = ctxX.value < centerX ? 'left' : 'right'
  const id = genId()
  const layout = { width: 100 as 100, alignRow: alignRow as 'left' | 'center' | 'right', contentAlign: alignRow as 'left' | 'center' | 'right' }
  const contentByType: Record<string, string> = {
    text: '<p>New paragraph</p>',
    heading: '<h2>Heading</h2>',
    list: '<ul><li>Item</li></ul>',
    quote: '<blockquote>Quote</blockquote>',
    code: '<pre><code>// code</code></pre>',
    image: 'https://picsum.photos/1200/600?random=1',
    table: '<table><tr><td>Cell</td></tr></table>'
  }
  const block: Block = { id, type: t, content: contentByType[t] || '', layout }
  const idx = rows.value.findIndex(b => b.id === ctxTargetId.value)
  const at = idx >= 0 ? idx + 1 : rows.value.length
  const before = rows.value.slice(0, at)
  const after = rows.value.slice(at)
  const next = [...before, block, ...after]
  pushHistory('insert-blocks')
  blocks.value = next
  emit('update:modelValue', blocks.value)
  ctxOpen.value = false
  ctxTargetId.value = null
  selectedId.value = id
  if (['text', 'heading', 'list', 'quote', 'code'].includes(t)) {
    await nextTick()
    focusEndOfBlock(id)
  }
}

const onCtxDelete = () => { if (ctxTargetId.value) onDelete(ctxTargetId.value) }
const onCtxTransform = (t: 'text' | 'heading' | 'list' | 'quote' | 'code') => { if (ctxTargetId.value) onTransform(ctxTargetId.value, t) }
const onContextAlign = (a: 'left' | 'center' | 'right' | 'justify') => {
  const id = ctxTargetId.value
  if (!id) { ctxOpen.value = false; return }
  const block = rows.value.find(b => b.id === id)
  if (!block) { ctxOpen.value = false; return }
  const nextLayout: any = { ...block.layout }
  if (a === 'justify') {
    const fallback = nextLayout.alignRow || 'left'
    nextLayout.alignRow = fallback
    nextLayout.contentAlign = 'justify'
  } else {
    nextLayout.alignRow = a
    nextLayout.contentAlign = a
  }
  updateBlock(id, { layout: nextLayout })
  ctxOpen.value = false
}

const avatarStyle = computed<CSSProperties>(() => {
  if (!draggingId.value || !dragAvatarWidth.value) return { display: 'none' }
  return {
    left: Math.round(pointerX.value - dragOffsetX.value) + 'px',
    top: Math.round(pointerY.value - dragOffsetY.value) + 'px',
    width: Math.round(dragAvatarWidth.value) + 'px',
    height: Math.round(dragHeight.value) + 'px',
  }
})

let selectAllActive = false
const onCanvasPointerDown = (e: PointerEvent) => {
  const target = e.target as HTMLElement
  if (target === canvasEl.value) {
    selectAllActive = false
    const sel = window.getSelection()
    if (sel) sel.removeAllRanges()
    selectedId.value = null
  } else {
    selectAllActive = false
  }
}

const focusEndOfBlock = (id: string) => {
  const el = document.querySelector(`.block[data-id="${id}"] [contenteditable='true']`) as HTMLElement | null
  if (el) {
    el.focus()
    const sel = window.getSelection()
    if (sel) {
      const r = document.createRange()
      r.selectNodeContents(el)
      r.collapse(false)
      sel.removeAllRanges(); sel.addRange(r)
    }
  }
}

const onCanvasKeydown = (e: KeyboardEvent) => {
  if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    selectAllActive = true
  }
}

const INLINE_CAPABLE_TYPES = new Set<Block['type']>(['text', 'heading', 'quote', 'code'])
const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figcaption', 'figure',
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre',
  'section', 'table', 'ul'
])

const blockSupportsInline = (block: Block | null | undefined): boolean => {
  if (!block) return false
  return INLINE_CAPABLE_TYPES.has(block.type)
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const normalisePlainTextToHtml = (value: string): string =>
  escapeHtml(value).replace(/\r?\n/g, '<br>')

const collectTopLevelNodes = (body: HTMLElement): ChildNode[] =>
  Array.from(body.childNodes).filter(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? '').trim().length > 0
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as HTMLElement).tagName.toLowerCase()
      if (['script', 'style', 'meta', 'link', 'title', 'noscript'].includes(tag)) {
        node.parentNode?.removeChild(node)
        return false
      }
      return true
    }
    return false
  })

const determineInlinePaste = (html: string, text: string, targetBlock: Block | null | undefined): { html: string } | null => {
  logger.debug('[Editor] Paste analysis start', {
    targetBlock: targetBlock ? { id: targetBlock.id, type: targetBlock.type } : null,
    html:
      html && html.length > 300
        ? html.slice(0, 300) + `… (len=${html.length})`
        : html,
    text: text && text.length > 300 ? text.slice(0, 300) + `… (len=${text.length})` : text,
  })

  if (!blockSupportsInline(targetBlock)) return null

  if (html) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const body = doc.body
    body.querySelectorAll('script,style,meta,link,title,noscript').forEach(node => node.remove())
    if (body.querySelector('img,video,audio,iframe,table,ul,ol,pre,blockquote')) {
      return null
    }

    const nodes = collectTopLevelNodes(body)
    const blockNodes = nodes.filter(node =>
      node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((node as HTMLElement).tagName.toLowerCase())
    ) as HTMLElement[]

    if (blockNodes.length > 1) return null

    if (blockNodes.length === 1) {
      const blockEl = blockNodes[0]
      const tag = blockEl.tagName.toLowerCase()
      if (['ul', 'ol', 'table', 'pre', 'blockquote'].includes(tag)) {
        logger.debug('[Editor] Inline paste rejected (disallowed tag)', { tag })
        return null
      }
      if ((tag === 'div' || tag === 'section' || tag === 'article') && blockEl.querySelector(Array.from(BLOCK_TAGS).join(','))) {
        logger.debug('[Editor] Inline paste rejected (nested block elements inside div/section/article)', {
          tag,
          nested: Array.from(blockEl.querySelectorAll(Array.from(BLOCK_TAGS).join(','))).map(el => el.tagName.toLowerCase()),
        })
        return null
      }
      const inner = blockEl.innerHTML.trim()
      if (!inner) return null
      logger.debug('[Editor] Inline paste accepted from single block element', { tag })
      return { html: inner }
    }

    if (blockNodes.length === 0) {
      const inner = body.innerHTML.trim()
      if (inner) {
        logger.debug('[Editor] Inline paste accepted from inline HTML fragment')
        return { html: inner }
      }
      if (text) {
        logger.debug('[Editor] Inline paste fallback to plain text (HTML empty)')
        return { html: normalisePlainTextToHtml(text) }
      }
    }
  }

  if (text) {
    logger.debug('[Editor] Inline paste plaintext')
    return { html: normalisePlainTextToHtml(text) }
  }

  logger.debug('[Editor] Inline paste not applicable')
  return null
}

const getEditableElementForBlock = (id: string): HTMLElement | null =>
  document.querySelector(`.block[data-id="${id}"] [contenteditable="true"]`) as HTMLElement | null

const ensureSelectionWithin = (root: HTMLElement): Range | null => {
  const sel = window.getSelection()
  if (!sel) return null
  if (sel.rangeCount === 0 || !root.contains(sel.anchorNode)) {
    const range = document.createRange()
    range.selectNodeContents(root)
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
    return range
  }
  const range = sel.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) {
    const fallback = document.createRange()
    fallback.selectNodeContents(root)
    fallback.collapse(false)
    sel.removeAllRanges()
    sel.addRange(fallback)
    return fallback
  }
  return range
}

const insertInlineHtmlIntoBlock = (blockId: string, html: string): string | null => {
  const root = getEditableElementForBlock(blockId)
  if (!root) return null
  root.focus({ preventScroll: true })
  const sel = window.getSelection()
  const range = ensureSelectionWithin(root)
  if (!sel || !range) return null

  range.deleteContents()

  const template = document.createElement('template')
  template.innerHTML = html
  const fragment = template.content
  const lastNode = fragment.lastChild
  range.insertNode(fragment)

  if (lastNode) {
    const caret = document.createRange()
    caret.setStartAfter(lastNode)
    caret.collapse(true)
    sel.removeAllRanges()
    sel.addRange(caret)
  }

  return root.innerHTML
}

const blockHasContent = (block: Block): boolean => {
  if (!block) return false
  if (block.type === 'text' || block.type === 'heading' || block.type === 'quote' || block.type === 'code' || block.type === 'list') {
    const cleaned = block.content
      .replace(/<br\s*\/?>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim()
    return cleaned.length > 0
  }
  return true
}

const prepareInsertionContext = (targetId: string | null, insertAfter: boolean) => {
  let baseBlocks = [...blocks.value]
  let insertAt = baseBlocks.length

  if (targetId) {
    const idx = baseBlocks.findIndex(b => b.id === targetId)
    if (idx >= 0) insertAt = insertAfter ? idx + 1 : idx
  }

  if (baseBlocks.length === 1 && !blockHasContent(baseBlocks[0])) {
    baseBlocks = []
    insertAt = 0
  } else if (targetId) {
    const idx = baseBlocks.findIndex(b => b.id === targetId)
    if (idx >= 0 && !blockHasContent(baseBlocks[idx])) {
      baseBlocks.splice(idx, 1)
      insertAt = Math.min(idx, baseBlocks.length)
    }
  }

  return { baseBlocks, insertAt }
}

const defaultImageLayout = () => ({
  width: 100 as 100,
  alignRow: 'center' as const,
  contentAlign: 'center' as const,
})

const createImageBlock = (src: string): Block => ({
  id: genId(),
  type: 'image',
  content: src,
  layout: defaultImageLayout(),
})

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const dataUrlToFile = (dataUrl: string, baseName: string): File | null => {
  try {
    const [header, data] = dataUrl.split(',', 2)
    if (!header || !data) return null
    const mimeMatch = header.match(/data:(.*?)(;|$)/)
    const mime = mimeMatch ? mimeMatch[1] : 'image/png'
    const isBase64 = header.includes(';base64')
    const byteString = isBase64 ? atob(data) : decodeURIComponent(data)
    const len = byteString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) bytes[i] = byteString.charCodeAt(i)
    const extension = mime.split('/')[1] || 'png'
    return new File([bytes], `${baseName}.${extension}`, { type: mime })
  } catch (error) {
    logger.error('[Editor] Failed to convert data URL to file', error)
    return null
  }
}

const extractDataUrlImagesFromHtml = (html: string): { files: File[]; html: string } => {
  if (!html) return { files: [], html }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const images = Array.from(doc.querySelectorAll('img'))
      .filter((img) => (img.getAttribute('src') || '').startsWith('data:image'))

    if (!images.length) return { files: [], html }

    const timestamp = Date.now()
    const files: File[] = []
    images.forEach((img, index) => {
      const src = img.getAttribute('src') || ''
      const file = dataUrlToFile(src, `pasted-image-${timestamp}-${index}`)
      if (file) files.push(file)
      img.remove()
    })

    return { files, html: doc.body.innerHTML }
  } catch (error) {
    logger.error('[Editor] Failed to extract data URL images from HTML', error)
    return { files: [], html }
  }
}

const extractImageFilesFromDataTransfer = (data: DataTransfer): File[] => {
  const files: File[] = []
  if (data.items && data.items.length) {
    Array.from(data.items).forEach((item) => {
      if (item.kind === 'file' && item.type?.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    })
  }
  if (!files.length && data.files && data.files.length) {
    Array.from(data.files).forEach((file) => {
      if (file.type?.startsWith('image/')) files.push(file)
    })
  }
  return files
}

const handleImageFilesPaste = async (files: File[], targetId: string | null, insertAfterTarget: boolean) => {
  if (!files.length) return

  logger.debug('[Editor] Image paste detected', { count: files.length, targetId, insertAfterTarget })

  const placeholders = await Promise.all(
    files.map(async (file) => {
      try {
        const dataUrl = await fileToDataUrl(file)
        return { block: createImageBlock(dataUrl), file }
      } catch (error) {
        logger.error('[Editor] Failed to create image placeholder', error)
        return null
      }
    })
  )

  const validPlaceholders = placeholders.filter(Boolean) as Array<{ block: Block; file: File }>
  if (!validPlaceholders.length) return

  const { baseBlocks, insertAt } = prepareInsertionContext(targetId, insertAfterTarget)
  const before = baseBlocks.slice(0, insertAt)
  const after = baseBlocks.slice(insertAt)
  const newBlocks = validPlaceholders.map(entry => entry.block)

  logger.debug('[Editor] Inserting image placeholders', {
    targetId,
    insertAfterTarget,
    insertAt,
    count: newBlocks.length,
  })

  pushHistory('insert-blocks')
  blocks.value = [...before, ...newBlocks, ...after]
  emit('update:modelValue', blocks.value)
  selectAllActive = false

  try {
    const { images } = await uploadImages(validPlaceholders.map(entry => entry.file))
    if (!images.length) return

    const updates: Array<{ blockId: string; url: string }> = []
    images.forEach((img, index) => {
      const blockEntry = validPlaceholders[index]
      if (img && blockEntry) {
        updates.push({ blockId: blockEntry.block.id, url: img.url })
      }
    })

    if (!updates.length) return

    logger.debug('[Editor] Image upload completed', { updates })

    pushHistory('content')
    updates.forEach((update) => {
      updateBlock(update.blockId, { content: update.url })
    })
    emit('update:modelValue', blocks.value)
  } catch (error) {
    logger.error('[Editor] Image upload failed', error)
  }
}

const getInsertionReference = (
  baseBlocks: Block[],
  targetId: string | null,
): { targetId: string | null; insertAfter: boolean } => {
  if (!targetId) return { targetId: null, insertAfter: true }
  const block = baseBlocks.find(b => b.id === targetId)
  const root = block ? getEditableElementForBlock(block.id) : null
  if (!block || !root) return { targetId, insertAfter: true }

  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !root.contains(sel.anchorNode)) {
    return { targetId, insertAfter: true }
  }

  const range = sel.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) {
    return { targetId, insertAfter: true }
  }

  const totalLength = root.textContent?.length ?? 0
  if (!totalLength) {
    return { targetId, insertAfter: false }
  }

  const beforeRange = document.createRange()
  beforeRange.selectNodeContents(root)
  beforeRange.setEnd(range.startContainer, range.startOffset)
  const beforeText = beforeRange.toString().trim().length
  const afterText = totalLength - beforeText

  const insertAfter = beforeText > afterText
  return { targetId, insertAfter }
}

const onPaste = async (e: ClipboardEvent) => {
  const data = e.clipboardData
  if (!data) return
  e.preventDefault()

  let html = data.getData('text/html')
  const plain = data.getData('text/plain')
  const ref = getInsertionReference(blocks.value, selectedId.value || ctxTargetId.value)
  const targetId = ref.targetId
  const insertAfterTarget = ref.insertAfter
  const targetBlock = targetId ? rows.value.find(b => b.id === targetId) ?? null : null

  const imageFiles = extractImageFilesFromDataTransfer(data)
  if (imageFiles.length) {
    await handleImageFilesPaste(imageFiles, targetId, insertAfterTarget)
    return
  }

  if (html) {
    const extracted = extractDataUrlImagesFromHtml(html)
    if (extracted.files.length) {
      await handleImageFilesPaste(extracted.files, targetId, insertAfterTarget)
      if (!extracted.html.trim()) return
      html = extracted.html
    }
  }

  const inlinePlan = determineInlinePaste(html, plain, targetBlock)
  if (inlinePlan && targetId) {
    logger.debug('[Editor] Inline paste plan accepted', { targetId, type: targetBlock?.type })
    const updated = insertInlineHtmlIntoBlock(targetId, inlinePlan.html)
    if (updated !== null) {
      pushHistory('inline-paste')
      updateBlock(targetId, { content: updated })
      emit('update:modelValue', blocks.value)
      selectAllActive = false
      return
    }
    logger.debug('[Editor] Inline paste failed to update block, falling back to block import', { targetId })
  }

  let newBlocks: Block[] = []
  if (html) newBlocks = importFromHtml(html)
  else if (plain) newBlocks = importFromMarkdown(plain)
  if (!newBlocks.length) return
  logger.debug('[Editor] Block paste fallback', { insertedBlocks: newBlocks.map(b => ({ id: b.id, type: b.type })) })

  const { baseBlocks, insertAt } = prepareInsertionContext(targetId, insertAfterTarget)
  const before = baseBlocks.slice(0, insertAt)
  const after = baseBlocks.slice(insertAt)
  const nextArr = [...before, ...newBlocks, ...after]
  pushHistory('insert-blocks')
  blocks.value = nextArr
  emit('update:modelValue', blocks.value)

  const textLike = [...newBlocks].reverse().find(b => ['text','list','quote','code','heading'].includes(b.type))
  if (textLike) {
    selectedId.value = textLike.id
    await nextTick(); focusEndOfBlock(textLike.id)
  }
  selectAllActive = false
}

const resolveDropPosition = (event: DragEvent): { targetId: string | null; insertAfter: boolean } => {
  const blockEl = (event.target as HTMLElement | null)?.closest('.block') as HTMLElement | null
  if (!blockEl) return { targetId: null, insertAfter: true }
  const rect = blockEl.getBoundingClientRect()
  const midpoint = rect.top + rect.height / 2
  return {
    targetId: blockEl.getAttribute('data-id') || null,
    insertAfter: event.clientY >= midpoint,
  }
}

const onDragOver = (event: DragEvent) => {
  if (props.readonly) return
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

const onDrop = async (event: DragEvent) => {
  if (props.readonly) return
  event.preventDefault()
  const data = event.dataTransfer
  if (!data) return

  const imageFiles = extractImageFilesFromDataTransfer(data)
  let html = data.getData('text/html')

  const position = resolveDropPosition(event)

  if (imageFiles.length) {
    await handleImageFilesPaste(imageFiles, position.targetId, position.insertAfter)
    return
  }

  if (html) {
    const extracted = extractDataUrlImagesFromHtml(html)
    if (extracted.files.length) {
      await handleImageFilesPaste(extracted.files, position.targetId, position.insertAfter)
    }
  }
}

// Basic history API for undo/redo
type Op = 'delete' | 'transform' | 'layout' | 'resize' | 'insert-blocks' | 'content' | 'inline-paste'
const history: Block[][] = []
let hIndex = -1
const pushHistory = (op: Op) => {
  history.splice(hIndex + 1)
  history.push(JSON.parse(JSON.stringify(blocks.value)))
  hIndex = history.length - 1
}
const undo = () => { if (hIndex > 0) { hIndex--; blocks.value = JSON.parse(JSON.stringify(history[hIndex])); emit('update:modelValue', blocks.value) } }
const redo = () => { if (hIndex < history.length - 1) { hIndex++; blocks.value = JSON.parse(JSON.stringify(history[hIndex])); emit('update:modelValue', blocks.value) } }
const clear = () => { blocks.value = []; emit('update:modelValue', blocks.value) }
const selectAll = () => { const el = canvasEl.value; if (el) { const r = document.createRange(); r.selectNodeContents(el); const sel = window.getSelection(); if (sel) { sel.removeAllRanges(); sel.addRange(r) } } }

onMounted(() => {
  const onUndo = () => undo()
  const onRedo = () => redo()
  const onClear = () => clear()
  const onSelectAll = () => selectAll()
  window.addEventListener('editor-undo', onUndo as any)
  window.addEventListener('editor-redo', onRedo as any)
  window.addEventListener('editor-clear', onClear as any)
  window.addEventListener('editor-select-all', onSelectAll as any)
})

</script>

<template>
  <div class="editor" :class="{ dragging: !!draggingId }">
    <div
      class="canvas"
      ref="canvasEl"
      :class="{ 'select-all': selectAllActive }"
      tabindex="0"
      @contextmenu="onContextMenu"
      @paste="onPaste"
      @dragover.prevent="onDragOver"
      @drop.prevent="onDrop"
      @keydown="onCanvasKeydown"
      @pointerdown="onCanvasPointerDown"
    >
      <template v-for="(b, i) in renderRows" :key="b.id">
        <BlockItem
          v-if="draggingId && placeholderIndex === i && draggedBlock"
          :key="b.id + '-preview'"
          :block="draggedBlock!"
          :readonly="true"
          class="drop-placeholder"
        />
        <BlockItem
          :block="b"
          :readonly="!!props.readonly"
          :selected="selectedId === b.id"
          @update="onUpdate"
          @delete="onDelete"
          @focus="onBlockFocus"
          @blur="onBlockBlur"
          @transform="onTransform"
          @layoutchange="() => pushHistory('layout')"
          @resizeend="() => pushHistory('resize')"
          @dragstart="onBlockDragStart"
          @history="() => pushHistory('content')"
        />
      </template>
      <BlockItem
        v-if="draggingId && placeholderIndex === renderRows.length && draggedBlock"
        :key="draggingId + '-preview-end'"
        :block="draggedBlock!"
        :readonly="true"
        class="drop-placeholder"
      />
    </div>
    <div v-if="draggingId && draggedBlock" class="drag-avatar" :style="avatarStyle">
      <BlockItem :block="draggedBlock!" :readonly="true" />
    </div>

    <ContextMenu
      v-model="ctxOpen"
      :x="ctxX"
      :y="ctxY"
      :target="ctxTargetId ? 'block' : 'canvas'"
      :canTransform="ctxTargetId ? (['text','heading','list','quote','code'].includes(rows.find(b => b.id === ctxTargetId)?.type as string)) : false"
      @insert="onCtxInsert"
      @delete="onCtxDelete"
      @transform="onCtxTransform"
      @setWidth="(w) => { if (ctxTargetId) updateBlock(ctxTargetId, { layout: { ...rows.find(b=>b.id===ctxTargetId)!.layout, width: w } }); ctxOpen=false }"
      @setAlign="onContextAlign"
    />
  </div>
</template>

<style scoped>
.editor { display: flex; justify-content: center; padding: 8px; --dxce-line-height: 1.6rem; }
.canvas { width: 100%; display: flex; flex-wrap: wrap; gap: 0; min-height: var(--dxce-canvas-min-height, 180px); }
.canvas :deep([contenteditable='true']) {
  min-height: calc(var(--dxce-min-lines, 0) * var(--dxce-line-height));
  caret-color: var(--dxce-caret-color, var(--text, currentColor));
}

.canvas :deep([contenteditable='true']:focus) {
  outline: none;
}
.canvas.select-all { outline: 1px dashed var(--border); outline-offset: 2px; }
.editor.dragging .block { transition: none !important; }
.editor.dragging .toolbar { pointer-events: none; }
.drop-placeholder {
  position: relative;
  opacity: 0.8;
  pointer-events: none;
  animation: placeholderPulse 3.6s ease-in-out infinite;
  z-index: 100;
  border: 2px dashed #93c5fd !important;
  box-shadow: 0 0 0 2px rgba(147, 197, 253, 0.28) inset;
  background: rgba(147, 197, 253, 0.16);
}
.drop-placeholder::after {
  content: '';
  position: absolute;
  inset: 6px;
  border: 1px dashed rgba(147, 197, 253, 0.6);
  border-radius: 8px;
  pointer-events: none;
}
.drop-placeholder .content { opacity: 0.45; transition: opacity 120ms ease; }
.drag-avatar { position: fixed; z-index: 99; pointer-events: none; opacity: 1; }
.drag-avatar :deep(.block) { border: 0; box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.25) inset; }
.drag-avatar :deep(.block-item) { background: var(--surface) !important; }
@keyframes placeholderPulse { 0%, 100% { opacity: 0.75; } 50% { opacity: 0.35; } }
</style>
