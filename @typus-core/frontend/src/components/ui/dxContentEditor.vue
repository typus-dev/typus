<script setup lang="ts">
/* @Tags: ui, editor */
import { ref, watch, onMounted, computed, onBeforeUnmount } from 'vue'
import Editor from './dxContentEditor/components/Editor.vue'
import TopToolbar from './dxContentEditor/components/TopToolbar.vue'
import ViewTabs from './dxContentEditor/components/ViewTabs.vue'
import DxContentRendererCanvas from '@/components/ui/dxContentRendererCanvas.vue'
import type { Block } from './dxContentEditor/types/block'
import { importFromHtml } from './dxContentEditor/composables/useImportPipeline'
import { blocksToHTML } from './dxContentEditor/utils/toHtml'
import { blocksToMarkdown } from './dxContentEditor/utils/toMarkdown'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [val: string] }>()

const blocks = ref<Block[]>([])
const view = ref<'edit' | 'document' | 'blocks' | 'html' | 'markdown'>('edit')
const htmlView = computed(() => blocksToHTML(blocks.value))
const markdownView = computed(() => blocksToMarkdown(blocks.value))
const blocksJson = computed(() => JSON.stringify(blocks.value, null, 2))
const exportTitle = computed(() => {
  const heading = blocks.value.find(block => block.type === 'heading')
  if (!heading) return 'document'
  return stripTags(heading.content || '') || 'document'
})

onMounted(() => {
  try {
    blocks.value = importFromHtml(props.modelValue || '')
  } catch (e) {
    console.warn('[dxContentEditor] Failed to import HTML, starting empty', e)
    blocks.value = []
  }
  attachExportListeners()
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
  }
})

watch(blocks, (val) => {
  try {
    const html = blocksToHTML(val)
    emit('update:modelValue', html)
  } catch (e) {
    console.warn('[dxContentEditor] Failed to export HTML', e)
  }
}, { deep: true })

onBeforeUnmount(() => {
  detachExportListeners()
})

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    detachExportListeners()
  })
}

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
  <div class="dxce-theme w-full h-full flex flex-col" :class="['theme-colors-background-secondary', 'theme-colors-text-primary']">
    <div class="dxce-topbar" :class="['theme-colors-background-primary', 'theme-border'.primary, 'border-b']">
      <ViewTabs v-model="view" />
      <TopToolbar />
    </div>

    <div class="dxce-content">
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
  /* fallback CSS variables for internal toolbar styling */
  --text: #e5e7eb;
  --border: #1f2937;
  --surface: #111827;
  --bg-dark: #0b0f14;
}

.dxce-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  position: sticky;
  top: 0;
  z-index: 5;
}

.dxce-content {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px;
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
