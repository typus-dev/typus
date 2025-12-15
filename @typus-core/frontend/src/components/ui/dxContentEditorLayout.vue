<script setup lang="ts">
/* @Tags: ui, editor */
import { ref, watch, onMounted, computed, onBeforeUnmount, nextTick } from 'vue'
import type { CSSProperties } from 'vue'
import Editor from './dxContentEditor/components/Editor.vue'
import TopToolbar from './dxContentEditor/components/TopToolbar.vue'
import ViewTabs from './dxContentEditor/components/ViewTabs.vue'
import DxContentRendererCanvas from '@/components/ui/dxContentRendererCanvas.vue'
import type { Block } from './dxContentEditor/types/block'
import { importFromHtml } from './dxContentEditor/composables/useImportPipeline'
import { blocksToHTML } from './dxContentEditor/utils/toHtml'
import { blocksToMarkdown } from './dxContentEditor/utils/toMarkdown'

interface EditorLayoutProps {
  modelValue: string
  minHeight?: string | number
  minLines?: number
  autoGrow?: boolean
  stickyToolbar?: boolean
  hideTabs?: boolean
  hideToolbar?: boolean
  enableExports?: boolean
}

const props = withDefaults(defineProps<EditorLayoutProps>(), {
  autoGrow: false,
  stickyToolbar: true,
  hideTabs: false,
  hideToolbar: false,
  enableExports: true,
  minLines: 0
})
const emit = defineEmits<{ 'update:modelValue': [val: string] }>()

const blocks = ref<Block[]>([])
const view = ref<'edit' | 'document' | 'blocks' | 'html' | 'markdown'>('edit')
const createPlaceholderBlock = (): Block => ({
  id: `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  type: 'text',
  content: '<p><br /></p>',
  layout: { width: 100 as 100, alignRow: 'left', contentAlign: 'left' }
})

const rootEl = ref<HTMLElement | null>(null)

const focusFirstEditable = async () => {
  await nextTick()
  const root = rootEl.value
  if (!root) return
  const editable = root.querySelector('[contenteditable="true"]') as HTMLElement | null
  if (editable) editable.focus()
}

const ensurePlaceholderBlock = (): boolean => {
  if (blocks.value.length) return false
  blocks.value = [createPlaceholderBlock()]
  void focusFirstEditable()
  return true
}

const rootClassList = computed(() => {
  const classes = ['dxce-theme', 'w-full', 'flex', 'flex-col']
  if (!props.autoGrow) classes.push('h-full')
  return classes
})

const blockHasContent = (block: Block): boolean => {
  if (block.type === 'text' || block.type === 'heading' || block.type === 'quote' || block.type === 'code' || block.type === 'list') {
    const text = block.content
      .replace(/<br\s*\/?>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim()
    return text.length > 0
  }
  // Non-text blocks (image, table, etc.) count as content as soon as they exist
  return true
}

const editorIsEmpty = computed(() => {
  if (!blocks.value.length) return true
  return blocks.value.every(block => !blockHasContent(block))
})

const rootStyle = computed(() => {
  const style: (CSSProperties & Record<string, string | undefined>) = {}
  if (props.minHeight !== null && props.minHeight !== undefined) {
    const value = typeof props.minHeight === 'number' ? `${props.minHeight}px` : props.minHeight
    if (value) {
      style.minHeight = value
      style['--dxce-canvas-min-height'] = value
    }
  }
  if (props.minLines && props.minLines > 0 && editorIsEmpty.value) {
    style['--dxce-min-lines'] = String(props.minLines)
  }
  return style
})

const topbarClassList = computed(() => {
  const classes = ['dxce-topbar']
  if (props.stickyToolbar) classes.push('dxce-topbar--sticky')
  return classes
})

const contentClassList = computed(() => [
  'dxce-content',
  props.autoGrow ? 'dxce-content--auto' : 'dxce-content--fill'
])

const shouldRenderTopbar = computed(() => !(props.hideTabs && props.hideToolbar))

const htmlView = computed(() => blocksToHTML(blocks.value))
const markdownView = computed(() => blocksToMarkdown(blocks.value))
const blocksJson = computed(() => JSON.stringify(blocks.value, null, 2))
const exportTitle = computed(() => {
  const heading = blocks.value.find(block => block.type === 'heading')
  if (!heading) return 'document'
  return stripTags(heading.content || '') || 'document'
})

const exportsAttached = ref(false)

const tryAttachExportListeners = () => {
  if (!props.enableExports || exportsAttached.value) return
  attachExportListeners()
  exportsAttached.value = true
}

const tryDetachExportListeners = () => {
  if (!exportsAttached.value) return
  detachExportListeners()
  exportsAttached.value = false
}

onMounted(() => {
  try {
    blocks.value = importFromHtml(props.modelValue || '')
  } catch (e) {
    console.warn('[dxContentEditor] Failed to import HTML, starting empty', e)
    blocks.value = []
  }
  ensurePlaceholderBlock()
  tryAttachExportListeners()
})

watch(() => props.modelValue, (val) => {
  const html = val || ''
  const current = htmlView.value
  if (html.trim() !== current.trim()) {
    try {
      blocks.value = importFromHtml(html)
    } catch (e) {
      console.warn('[dxContentEditor] Failed to sync from HTML', e)
    }
    if (ensurePlaceholderBlock()) return
  }
})

watch(blocks, (val) => {
  if (!val.length) {
    const created = ensurePlaceholderBlock()
    if (created) return
  }
  try {
    const html = blocksToHTML(val)
    emit('update:modelValue', html)
  } catch (e) {
    console.warn('[dxContentEditor] Failed to export HTML', e)
  }
}, { deep: true })

onBeforeUnmount(() => {
  tryDetachExportListeners()
})

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    tryDetachExportListeners()
  })
}

watch(() => props.enableExports, (enabled) => {
  if (enabled) {
    tryAttachExportListeners()
  } else {
    tryDetachExportListeners()
  }
})

function attachExportListeners() {
  window.addEventListener('editor-export-html-exact', handleExportHtmlExact as EventListener)
  window.addEventListener('editor-export-html-clean', handleExportHtmlClean as EventListener)
  window.addEventListener('editor-export-md', handleExportMarkdown as EventListener)
}

function detachExportListeners() {
  window.removeEventListener('editor-export-html-exact', handleExportHtmlExact as EventListener)
  window.removeEventListener('editor-export-html-clean', handleExportHtmlClean as EventListener)
  window.removeEventListener('editor-export-md', handleExportMarkdown as EventListener)
}

function handleExportHtmlExact() {
  const page = wrapHtmlDocument(exportTitle.value, blocksToHtmlExact())
  download(page, makeFilename('html'), 'text/html')
}

function handleExportHtmlClean() {
  const page = wrapHtmlDocument(exportTitle.value, htmlView.value)
  download(page, makeFilename('html'), 'text/html')
}

function handleExportMarkdown() {
  download(markdownView.value, makeFilename('md'), 'text/markdown')
}

function download(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function makeFilename(ext: 'html' | 'md') {
  const base = slugify(exportTitle.value)
  const date = new Date().toISOString().slice(0, 10)
  return `${base}-${date}.${ext}`
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\- _]+/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'document'
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function wrapHtmlDocument(title: string, bodyHtml: string): string {
  const safeTitle = title || 'Document'
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8"/>\n<meta name="viewport" content="width=device-width, initial-scale=1"/>\n<title>${safeTitle}</title>\n<style>:root{--bg:#0b0f14;--surface:#111827;--border:#1f2937;--text:#111827;}\n body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,Apple Color Emoji,Segoe UI Emoji;color:#111827;}\n.container{max-width:880px;margin:24px auto;padding:0 12px;}\n .doc{display:flex;flex-wrap:wrap;gap:0;align-items:flex-start}\n .blk{box-sizing:border-box;padding:8px}\n.container :where(h1,h2,h3){margin:16px 0 8px;}\n.container p{margin:8px 0;line-height:1.7;}\npre{background:#0b0f14;color:#e2e8f0;padding:12px;border:1px solid #1f2937;white-space:pre-wrap}\nblockquote{border-left:3px solid #1f2937;margin:8px 0;padding:8px 12px}\nul,ol{padding-left:1.2em;margin:8px 0}\n</style>\n</head>\n<body>\n<div class="container"><div class="doc">${bodyHtml}</div></div>\n</body>\n</html>`
}

function blocksToHtmlExact(): string {
  const parts: string[] = []
  const alignText = (a: 'left' | 'center' | 'right' | 'justify') =>
    a === 'left' ? '' : `text-align:${a};`
  const alignBlock = (a: 'left' | 'center' | 'right' | 'justify') =>
    a === 'left' ? '' : (a === 'center' ? 'margin-left:auto;margin-right:auto;' : 'margin-left:auto;')
  const fsStyle = (px?: number) => (px && Number.isFinite(px)) ? `font-size:${Math.round(px)}px;` : ''
  const wStyle = (w?: 33 | 50 | 66 | 100) => (w ? `flex:0 0 ${w}%;max-width:${w}%;` : '')
  const hTagFor = (px?: number): 'h1' | 'h2' | 'h3' => {
    if (!px) return 'h2'
    if (px >= 31) return 'h1'
    if (px >= 27) return 'h2'
    return 'h3'
  }

  for (const block of blocks.value) {
    const blockWrapStyle = `${wStyle(block.layout.width)}${alignBlock(block.layout.alignRow)}`
    const textSty = `${fsStyle(block.layout.fontSize)}${alignText(block.layout.contentAlign ?? block.layout.alignRow)}`

    if (block.type === 'heading') {
      const tag = hTagFor(block.layout.fontSize)
      parts.push(`<div class="blk" style="${blockWrapStyle}"><${tag} style="${textSty}">${block.content}</${tag}></div>`)
    } else if (block.type === 'image') {
      let imgStyle = 'display:block;width:100%;'
      const aspect = (block.layout as any).aspectRatio as undefined | 'free' | '16:9' | '4:3' | '1:1'
      const height = (block.layout as any).height as undefined | number
      if (aspect && aspect !== 'free') {
        const map: Record<string, string> = { '16:9': '16 / 9', '4:3': '4 / 3', '1:1': '1 / 1' }
        const val = map[aspect]
        if (val) imgStyle += `aspect-ratio:${val};height:auto;object-fit:cover;`
      } else if (typeof height === 'number' && Number.isFinite(height)) {
        imgStyle += `height:${Math.max(1, Math.round(height))}px;object-fit:cover;`
      } else {
        imgStyle += 'height:auto;'
      }
      parts.push(`<div class="blk" style="${blockWrapStyle}"><img src="${block.content}" alt="" style="${imgStyle}"/></div>`)
    } else {
      parts.push(`<div class="blk" style="${blockWrapStyle}"><div style="${textSty}">${block.content}</div></div>`)
    }
  }

  return parts.join('\n')
}
</script>

<template>
  <div ref="rootEl" :class="[rootClassList, 'theme-colors-background-secondary', 'theme-colors-text-primary']" :style="rootStyle">
    <div
      v-if="shouldRenderTopbar"
      :class="[topbarClassList, 'bg-transparent']"
    >
      <ViewTabs v-if="!props.hideTabs" v-model="view" />
      <TopToolbar v-if="!props.hideToolbar" />
    </div>

    <div :class="contentClassList">
      <template v-if="view === 'edit'">
        <Editor v-model="blocks" />
      </template>
      <template v-else-if="view === 'document'">
        <section
          :class="[
            'dxce-pane border',
            'theme-colors-background-primary',
            'theme-border'.primary
          ]"
        >
          <DxContentRendererCanvas :content="htmlView" />
        </section>
      </template>
      <template v-else-if="view === 'blocks'">
        <section
          :class="[
            'dxce-pane dxce-pane--code border',
            'theme-colors-background-primary',
            'theme-border'.primary
          ]"
        >
          <pre>{{ blocksJson }}</pre>
        </section>
      </template>
      <template v-else-if="view === 'html'">
        <section
          :class="[
            'dxce-pane dxce-pane--code border',
            'theme-colors-background-primary',
            'theme-border'.primary
          ]"
        >
          <pre>{{ htmlView }}</pre>
        </section>
      </template>
      <template v-else-if="view === 'markdown'">
        <section
          :class="[
            'dxce-pane dxce-pane--code border',
            'theme-colors-background-primary',
            'theme-border'.primary
          ]"
        >
          <pre>{{ markdownView }}</pre>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.dxce-theme {
  /* inherit app theme colors instead of forcing custom palette */
  --text: inherit;
  --border: var(--dx-border-color, currentColor);
  --surface: var(--dx-surface-color, inherit);
  --bg-dark: var(--dx-surface-color, inherit);
}

.dxce-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
}

.dxce-topbar--sticky {
  position: sticky;
  top: 0;
  z-index: 5;
}

.dxce-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px;
}

.dxce-content--fill {
  flex: 1 1 auto;
}

.dxce-content--auto {
  flex: 0 1 auto;
}

.dxce-pane {
  width: 100%;
}

.dxce-pane--code {
  border-radius: 12px;
  padding: 16px;
}

.dxce-pane--code pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
}
</style>
