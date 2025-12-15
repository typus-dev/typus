<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import dxIcon from '@/components/ui/dxIcon.vue'
import { ensureSelectionContext, selectionFallback, type SelectionContext } from '../utils/selection'
import { inlineCommands } from '../utils/inlineCommands'

const fontMap: Record<string, number> = {
  Small: 13,
  Normal: 16,
  Large: 18,
  XLarge: 24,
}
const fontKeys = Object.keys(fontMap) as string[]
const rootEl = ref<HTMLElement | null>(null)
const sizeOpen = ref(false)
const exportOpen = ref(false)

const activeEditable = ref<HTMLElement | null>(null)

const handleActiveEditable = (event: Event) => {
  const detail = (event as CustomEvent<HTMLElement | null>).detail ?? null
  activeEditable.value = detail
  if (!detail) {
    lastRange.value = null
    return
  }
  const ctx = ensureSelectionContext({ root: detail, expand: false })
  if (ctx) {
    lastRange.value = selectionFallback.store(ctx.range)
  }
}

const lastRange = ref<Range | null>(null)
const isInEditable = (node: Node | null): boolean => {
  let n: Node | null = node
  while (n) {
    if (n instanceof HTMLElement && n.getAttribute('contenteditable') === 'true') return true
    n = (n as HTMLElement).parentNode
  }
  return false
}
const captureSelection = () => {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)
  if (isInEditable(range.commonAncestorContainer)) {
    lastRange.value = selectionFallback.store(range)
    const root = getEditableRoot(range.commonAncestorContainer)
    if (root) activeEditable.value = root
  }
}
onMounted(() => {
  document.addEventListener('selectionchange', captureSelection)
  window.addEventListener('dx-editor-active-editable', handleActiveEditable as EventListener)
})
onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', captureSelection)
  window.removeEventListener('dx-editor-active-editable', handleActiveEditable as EventListener)
})

const getEditableRoot = (node: Node | null): HTMLElement | null => {
  let n: Node | null = node
  while (n) {
    if (n instanceof HTMLElement && n.getAttribute('contenteditable') === 'true') return n
    n = (n as HTMLElement).parentNode
  }
  return null
}

const focusEditable = () => {
  const el = activeEditable.value
  if (!el) return null
  try {
    el.focus({ preventScroll: true })
  } catch {
    el.focus()
  }
  return el
}

const getSelectionContext = (expandToAll = false): SelectionContext | null => {
  const activeRoot = focusEditable() || activeEditable.value
  const fallbackRoot = activeRoot || getEditableRoot(lastRange.value?.commonAncestorContainer || null)
  if (!fallbackRoot) return null

  const ctx = ensureSelectionContext({
    root: fallbackRoot,
    fallbackRange: lastRange.value,
    expand: expandToAll,
  })

  if (!ctx) return null

  lastRange.value = selectionFallback.store(ctx.range)
  activeEditable.value = ctx.root
  return ctx
}

const onFontSize = (key: string) => {
  const ctx = getSelectionContext(true)
  if (!ctx) return
  const px = ({ Small: 13, Normal: 16, Large: 18, XLarge: 24 } as Record<string, number>)[key]
  if (!px) return
  inlineCommands.setFontSize(ctx, px)
  updateLastRangeFromSelection(ctx)
}
const closeMenus = () => { sizeOpen.value = false }
const onDocPointerDown = (e: PointerEvent) => {
  const el = rootEl.value
  if (!el) return
  if (!el.contains(e.target as Node)) { sizeOpen.value = false; exportOpen.value = false }
}
onMounted(() => document.addEventListener('pointerdown', onDocPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown))

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener('dx-editor-active-editable', handleActiveEditable as EventListener)
    document.removeEventListener('selectionchange', captureSelection)
    document.removeEventListener('pointerdown', onDocPointerDown)
  })
}

const updateLastRangeFromSelection = (ctx: SelectionContext | null) => {
  if (!ctx) return
  const sel = ctx.selection
  if (sel.rangeCount > 0) {
    lastRange.value = selectionFallback.store(sel.getRangeAt(0))
  }
}

const onBold = () => {
  const ctx = getSelectionContext(true)
  if (!ctx) return
  inlineCommands.toggle(ctx, 'bold')
  updateLastRangeFromSelection(ctx)
}
const onItalic = () => {
  const ctx = getSelectionContext(true)
  if (!ctx) return
  inlineCommands.toggle(ctx, 'italic')
  updateLastRangeFromSelection(ctx)
}
const onUnderline = () => {
  const ctx = getSelectionContext(true)
  if (!ctx) return
  inlineCommands.toggle(ctx, 'underline')
  updateLastRangeFromSelection(ctx)
}

const onAlign = (dir: 'left' | 'center' | 'right' | 'justify') => {
  const ctx = getSelectionContext(true)
  if (ctx) inlineCommands.align(ctx, dir)
  console.log('[TopToolbar] dispatch align', dir, { ensured: !!ctx })
  updateLastRangeFromSelection(ctx)
  window.dispatchEvent(new CustomEvent('dx-editor-block-align', { detail: dir }))
}

const sendUndo = () => { try { window.dispatchEvent(new CustomEvent('editor-undo')) } catch {} }
const sendRedo = () => { try { window.dispatchEvent(new CustomEvent('editor-redo')) } catch {} }
const sendClear = () => { try { window.dispatchEvent(new CustomEvent('editor-clear')) } catch {} }
const sendSelectAll = () => { try { window.dispatchEvent(new CustomEvent('editor-select-all')) } catch {} }
const sendExportHtmlExact = () => { try { window.dispatchEvent(new CustomEvent('editor-export-html-exact')) } catch {} }
const sendExportHtmlClean = () => { try { window.dispatchEvent(new CustomEvent('editor-export-html-clean')) } catch {} }
const sendExportMd = () => { try { window.dispatchEvent(new CustomEvent('editor-export-md')) } catch {} }
</script>

<template>
  <div class="topbar" ref="rootEl">
    <div class="group" aria-label="History">
      <button class="btn" title="Undo" aria-label="Undo" @mousedown.prevent @click="sendUndo">
        <dxIcon name="ri:arrow-go-back-line" size="sm" />
      </button>
      <button class="btn" title="Redo" aria-label="Redo" @mousedown.prevent @click="sendRedo">
        <dxIcon name="ri:arrow-go-forward-line" size="sm" />
      </button>
      <button class="btn" title="Clear" aria-label="Clear" @mousedown.prevent @click="sendClear">
        <dxIcon name="ri:delete-bin-line" size="sm" />
      </button>
    </div>
    <div class="group" aria-label="Edit">
      <button class="btn" title="Select all" aria-label="Select all" @mousedown.prevent @click="sendSelectAll">
        <dxIcon name="ri:crop-line" size="sm" />
      </button>
    </div>
    <div class="group rel" aria-label="Font size">
      <button class="btn" @mousedown.prevent @click="sizeOpen = !sizeOpen" title="Font size" aria-label="Font size">
        <dxIcon name="ri:font-size" size="sm" />
        <dxIcon name="ri:arrow-down-s-line" size="sm" />
      </button>
      <div v-if="sizeOpen" class="menu" role="menu" aria-label="Font size menu">
        <button v-for="k in fontKeys" :key="k" class="item" @mousedown.prevent @click="onFontSize(k); closeMenus()">{{ k }}</button>
      </div>
    </div>
    <div class="group" aria-label="Style">
      <button class="btn" title="Bold" aria-label="Bold" @mousedown.prevent @click="onBold"><dxIcon name="ri:bold" size="sm" /></button>
      <button class="btn" title="Italic" aria-label="Italic" @mousedown.prevent @click="onItalic"><dxIcon name="ri:italic" size="sm" /></button>
      <button class="btn" title="Underline" aria-label="Underline" @mousedown.prevent @click="onUnderline"><dxIcon name="ri:underline" size="sm" /></button>
    </div>
    <div class="group" aria-label="Align">
      <button class="btn" title="Align left" aria-label="Align left" @mousedown.prevent @click="onAlign('left')">
        <dxIcon name="ri:align-left" size="sm" />
      </button>
      <button class="btn" title="Align center" aria-label="Align center" @mousedown.prevent @click="onAlign('center')">
        <dxIcon name="ri:align-center" size="sm" />
      </button>
      <button class="btn" title="Align right" aria-label="Align right" @mousedown.prevent @click="onAlign('right')">
        <dxIcon name="ri:align-right" size="sm" />
      </button>
      <button class="btn" title="Justify" aria-label="Justify" @mousedown.prevent @click="onAlign('justify')">
        <dxIcon name="ri:align-justify" size="sm" />
      </button>
    </div>
    <div class="group rel" aria-label="Export">
      <button class="btn" @mousedown.prevent @click="exportOpen = !exportOpen" title="Export" aria-label="Export">
        <dxIcon name="ri:download-2-line" size="sm" />
        <dxIcon name="ri:arrow-down-s-line" size="sm" />
      </button>
      <div v-if="exportOpen" class="menu" role="menu" aria-label="Export menu">
        <button class="item" @mousedown.prevent @click="sendExportHtmlExact(); exportOpen = false">Export HTML (exact look)</button>
        <button class="item" @mousedown.prevent @click="sendExportHtmlClean(); exportOpen = false">Export HTML (clean)</button>
        <button class="item" @mousedown.prevent @click="sendExportMd(); exportOpen = false">Export Markdown</button>
      </div>
    </div>
  </div>
  
</template>

<style scoped>
.topbar { display: flex; gap: 12px; align-items: center; position: relative; }
.group { display: flex; gap: 6px; align-items: center; }
.group.rel { position: relative; }
.btn, .select {
  color: var(--text);
  background: transparent;
  border: 1px solid var(--border);
  height: 28px;
  padding: 0 6px;
}
 .btn { cursor: pointer; }
 .btn { display: inline-flex; align-items: center; gap: 4px; line-height: 1; }
.ico { display: inline-block; opacity: .9; font-size: 16px; line-height: 1; vertical-align: middle; }
.ico-txt { font-family: inherit; font-size: 14px; line-height: 1; }
.menu {
  position: absolute;
  top: 120%;
  left: 0;
  display: grid;
  gap: 4px;
  padding: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  z-index: 50;
}
.item { text-align: left; border: 1px solid var(--border); padding: 2px 6px; }
</style>
