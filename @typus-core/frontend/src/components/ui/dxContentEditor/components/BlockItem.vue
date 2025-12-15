<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, type CSSProperties } from 'vue'
import type { Block } from '../types/block'
import UnifiedBlockToolbar, {
  type ToolbarAction,
  type ToolbarMenuGroup,
  type ToolbarSection,
} from './UnifiedBlockToolbar.vue'
import TextRenderer from './blocks/renderers/TextRenderer.vue'
import HeadingRenderer from './blocks/renderers/HeadingRenderer.vue'
import QuoteRenderer from './blocks/renderers/QuoteRenderer.vue'
import CodeRenderer from './blocks/renderers/CodeRenderer.vue'
import ListRenderer from './blocks/renderers/ListRenderer.vue'
import ImageRenderer from './blocks/renderers/ImageRenderer.vue'
import DragGrip from './blocks/DragGrip.vue'
import ResizeHandle from './blocks/ResizeHandle.vue'
import { normalizeHtml } from '../composables/useBlockContent'
import { inlineCommands } from '../utils/inlineCommands'
import { ensureSelectionContext, selectionFallback } from '../utils/selection'

interface Props {
  block: Block
  readonly?: boolean
  selected?: boolean
}
const props = withDefaults(defineProps<Props>(), { readonly: false, selected: false })

const emit = defineEmits<{
  update: [block: Block]
  delete: [id: string]
  dragstart: [id: string, x: number, y: number]
  'transform': [id: string, type: Block['type']]
  focus: [id: string]
  blur: [id: string]
  layoutchange: [id: string]
  resizeend: [id: string]
  history: []
}>()

const showToolbar = ref(false)
const isFocused = ref(false)

const setActiveEditable = (el: HTMLElement | null) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('dx-editor-active-editable', { detail: el }))
}
const editableEl = ref<any | null>(null)
const blockEl = ref<HTMLElement | null>(null)
const localContent = ref<string>(props.block.content)

const hasTextToolbar = computed(() => ['text', 'heading', 'list', 'quote', 'code'].includes(props.block.type))

let hideToolbarTimeout: ReturnType<typeof setTimeout> | null = null

const cancelHide = () => {
  if (hideToolbarTimeout) {
    clearTimeout(hideToolbarTimeout)
    hideToolbarTimeout = null
  }
}

const scheduleHide = (force = false) => {
  cancelHide()
  if (!force && isFocused.value) return
  hideToolbarTimeout = setTimeout(() => {
    showToolbar.value = false
    isFocused.value = false
    hideToolbarTimeout = null
  }, 120)
}

const blockClass = computed(() => ({
  [`w-${props.block.layout.width}`]: true,
  [`align-${props.block.layout.alignRow}`]: true,
  'full-row': props.block.type === 'heading',
}))

const cssItem = computed(() => ({
  'block-item': true,
}))

const syncFromProps = () => {
  localContent.value = props.block.content
}

onMounted(() => {
  syncFromProps()
  window.addEventListener('dx-editor-block-align', onGlobalAlign as EventListener)
})

onBeforeUnmount(() => {
  window.removeEventListener('dx-editor-block-align', onGlobalAlign as EventListener)
})

watch(
  () => [props.block.id, props.block.content],
  () => syncFromProps(),
)
watch(
  () => props.block.type,
  async () => {
    await nextTick()
    syncFromProps()
  },
)

watch(
  () => props.selected,
  (selected) => {
    if (!isImageBlock.value) return
    if (selected && !props.readonly) {
      cancelHide()
      isFocused.value = true
      showToolbar.value = true
    } else if (!selected) {
      showToolbar.value = false
      isFocused.value = false
    }
  },
)

const onBlur = () => {
  const content = normalizeHtml(props.block.type, localContent.value)
  emit('update', { ...props.block, content })
  isFocused.value = false
  scheduleHide(true)
  setActiveEditable(null)
  lastSelection.value = null
  emit('blur', props.block.id)
}

const onDelete = () => {
  setActiveEditable(null)
  emit('delete', props.block.id)
}

const setWidth = (w: 25 | 33 | 50 | 66 | 75 | 100) => {
  emit('layoutchange', props.block.id)
  emit('update', { ...props.block, layout: { ...props.block.layout, width: w } })
}

const lastSelection = ref<Range | null>(null)

const ensureSelectionWithinEditable = (expand = false) => {
  const el = (editableEl.value?.getEl?.() ?? null) as HTMLElement | null
  if (!el) {
    console.log('[BlockItem]', props.block.id, 'ensureSelection', 'no editable element')
    return null
  }

  const ctx = ensureSelectionContext({
    root: el,
    fallbackRange: lastSelection.value,
    expand,
  })

  if (!ctx) {
    console.log('[BlockItem]', props.block.id, 'ensureSelection', 'no selection context')
    return null
  }

  lastSelection.value = selectionFallback.store(ctx.range)
  return ctx
}

const applyInlineCommand = (cmd: 'bold' | 'italic' | 'underline') => {
  const ctx = ensureSelectionWithinEditable(true)
  if (!ctx) {
    console.log('[BlockItem]', props.block.id, 'applyInlineCommand aborted', cmd)
    return
  }
  emit('history')
  console.log('[BlockItem]', props.block.id, 'applyInlineCommand', cmd)
  inlineCommands.toggle(ctx, cmd)
  const sel = ctx.selection
  if (sel && sel.rangeCount > 0) {
    lastSelection.value = selectionFallback.store(sel.getRangeAt(0))
  }
  const el = ctx.root
  localContent.value = el.innerHTML
  emit('update', { ...props.block, content: localContent.value })
}

const applyDomAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
  console.log('[BlockItem]', props.block.id, 'applyDomAlign', align)
  const ctx = ensureSelectionWithinEditable(true)
  if (!ctx) return
  inlineCommands.align(ctx, align)
  const sel = ctx.selection
  if (sel && sel.rangeCount > 0) {
    lastSelection.value = selectionFallback.store(sel.getRangeAt(0))
  }
  const el = ctx.root
  localContent.value = el.innerHTML
  emit('update', { ...props.block, content: localContent.value })
}

const setAlign = (a: 'left' | 'center' | 'right' | 'justify') => {
  const currentAlign = (props.block.layout.alignRow || 'left') as 'left' | 'center' | 'right'
  const nextLayout: any = { ...props.block.layout }
  if (a === 'justify') {
    nextLayout.alignRow = currentAlign
    nextLayout.contentAlign = 'justify'
  } else {
    nextLayout.alignRow = a
    nextLayout.contentAlign = a
  }
  console.log('[BlockItem]', props.block.id, 'setAlign', { request: a, prevAlign: currentAlign, prevContent: props.block.layout.contentAlign, nextAlign: nextLayout.alignRow, nextContent: nextLayout.contentAlign })
  emit('history')
  emit('layoutchange', props.block.id)
  emit('update', { ...props.block, layout: nextLayout })
  if (hasTextToolbar.value) applyDomAlign(a)
}

const setBlockPosition = (pos: AlignOption) => {
  const layout = { ...props.block.layout, alignRow: pos }
  emit('history')
  emit('layoutchange', props.block.id)
  emit('update', { ...props.block, layout })
}

const setTextAlignment = (dir: AlignOption | 'justify') => {
  const layout = { ...props.block.layout, contentAlign: dir }
  emit('history')
  emit('layoutchange', props.block.id)
  emit('update', { ...props.block, layout })
  applyDomAlign(dir)
}
const ratioOptions = ['free', '16:9', '4:3', '1:1'] as unknown as Array<'free' | '16:9' | '4:3' | '1:1'>
type RatioOpt = 'free' | '16:9' | '4:3' | '1:1'
const setRatio = (r: RatioOpt) => {
  if (props.block.type !== 'image') return
  const patch = r === 'free'
    ? { aspectRatio: r }
    : { aspectRatio: r, height: undefined as unknown as number | undefined }
  emit('update', { ...props.block, layout: { ...props.block.layout, ...patch } })
}

const imgStyle = computed<CSSProperties>(() => {
  if (props.block.type !== 'image') return {}
  const l = props.block.layout as any
  if (l.aspectRatio && l.aspectRatio !== 'free') {
    const map: Record<string, string> = { '16:9': '16 / 9', '4:3': '4 / 3', '1:1': '1 / 1' }
    const ar = map[l.aspectRatio as string]
    if (ar) return { width: '100%', height: 'auto', aspectRatio: ar as any, objectFit: 'cover' }
  }
  if (l.height) return { width: '100%', height: l.height + 'px', objectFit: 'cover' }
  return { width: '100%', height: 'auto', objectFit: 'cover' }
})

const textStyle = computed<CSSProperties>(() => {
  const l = props.block.layout as any
  const style: CSSProperties = {}
  const fs = l?.fontSize as number | undefined
  if (fs && Number.isFinite(fs)) style.fontSize = fs + 'px'
  const align = (l?.contentAlign || l?.alignRow || 'left') as 'left' | 'center' | 'right' | 'justify'
  style.textAlign = align
  return style
})

const onGlobalAlign = (event: CustomEvent<'left' | 'center' | 'right' | 'justify'>) => {
  console.log('[BlockItem]', props.block.id, 'align event', event.detail, { focused: isFocused.value, selected: props.selected, readonly: props.readonly, hasTextToolbar: hasTextToolbar.value }, 'current layout', props.block.layout)
  if (props.readonly) return
  if (!isFocused.value && !props.selected) return
  const target = event.detail
  if (!target) return
  if (!hasTextToolbar.value) return
  setAlign(target)
}

const setFontPx = (px: number) => {
  const clamped = Math.max(10, Math.min(40, Math.round(px)))
  const el = editableEl.value?.getEl?.() as HTMLElement | null
  if (el) {
    const nodes = Array.from(el.querySelectorAll<HTMLElement>("[style*='font-size']"))
    for (const n of nodes) {
      n.style.fontSize = ''
      if (n.getAttribute('style') === '') n.removeAttribute('style')
    }
    const fonts = Array.from(el.getElementsByTagName('font'))
    for (const f of fonts) {
      const span = document.createElement('span')
      while (f.firstChild) span.appendChild(f.firstChild)
      f.replaceWith(span)
    }
    localContent.value = el.innerHTML
  }
  emit('update', { ...props.block, layout: { ...props.block.layout, fontSize: clamped }, content: localContent.value })
}

const onFocus = () => {
  cancelHide()
  isFocused.value = !props.readonly
  showToolbar.value = true
  const raw = editableEl.value as any
  const el = (raw?.getEl?.() ?? raw?.$el ?? raw) as HTMLElement | null
  setActiveEditable(el && el instanceof HTMLElement ? el : null)
  emit('focus', props.block.id)
}

const focusImageBlock = () => {
  if (!isImageBlock.value || props.readonly) return
  cancelHide()
  isFocused.value = true
  showToolbar.value = true
  setActiveEditable(null)
  emit('focus', props.block.id)
}

const onToolbarDragStart = (e: PointerEvent) => {
  emit('dragstart', props.block.id, e.clientX, e.clientY)
}

const onToolbarTransform = (t: 'text' | 'heading' | 'list' | 'quote' | 'code') => {
  emit('transform', props.block.id, t)
  nextTick(() => { editableEl.value?.focus() })
}

const handleContentPointerDown = () => {
  if (isImageBlock.value) {
    focusImageBlock()
  }
}

const isResizing = ref(false)
const dragWidth = ref<number | null>(null)
const resizePreviewWidth = ref<number | null>(null)
const primaryWidths: Array<50 | 100> = [50, 100]
const extraImageWidths: Array<25 | 75> = [25, 75]
const legacyWidths: Array<33 | 66> = [33, 66]
type AlignOption = 'left' | 'center' | 'right' | 'justify'
const alignOptions: AlignOption[] = ['left', 'center', 'right', 'justify']
const alignIconMap: Record<AlignOption, string> = {
  left: 'ri:align-left',
  center: 'ri:align-center',
  right: 'ri:align-right',
  justify: 'ri:align-justify',
}

const FONT_PRESETS = [
  { id: 'Small', value: 13 },
  { id: 'Normal', value: 16 },
  { id: 'Large', value: 18 },
  { id: 'XLarge', value: 24 },
] as const

const currentWidth = computed(() => (props.block.layout.width as 25 | 33 | 50 | 66 | 75 | 100) ?? 100)
const currentFontSize = computed(() => {
  const layout = props.block.layout as any
  const size = layout.fontSize
  return Number.isFinite(size) ? Number(size) : null
})

const isImageBlock = computed(() => props.block.type === 'image')
const blockPositionOptions: AlignOption[] = ['left', 'center', 'right']

const currentBlockPosition = computed<AlignOption>(() => {
  const layout = props.block.layout as any
  return (layout.alignRow || 'left') as AlignOption
})

const currentTextAlign = computed<AlignOption | 'justify'>(() => {
  const layout = props.block.layout as any
  return (layout.contentAlign || 'left') as AlignOption | 'justify'
})

const buildWidthSection = (widths: Array<25 | 33 | 50 | 66 | 75 | 100>) => ({
  id: 'width',
  actions: widths.map((w) => ({
    id: `width-${w}`,
    label: `${w}%`,
    icon: w === 100 ? 'ri:expand-left-right-fill' : undefined,
    tooltip: w === 100 ? 'Full width' : `${w}% width`,
    appearance: w === 100 ? 'icon' : 'chip',
    selected: currentWidth.value === w,
    kind: 'width',
    value: w,
  })) as ToolbarAction[],
})

const buildBlockPositionSection = () => ({
  id: 'block-position',
  actions: blockPositionOptions.map((option) => ({
    id: `block-pos-${option}`,
    icon: alignIconMap[option],
    tooltip: `Block ${option}`,
    appearance: 'icon',
    selected: currentBlockPosition.value === option,
    kind: 'blockPosition',
    value: option,
  })) as ToolbarAction[],
})

const buildAlignSection = (options: AlignOption[]) => ({
  id: 'align',
  actions: options.map((option) => ({
    id: `align-${option}`,
    icon: alignIconMap[option],
    tooltip: `Align ${option}`,
    appearance: 'icon',
    selected: currentBlockPosition.value === option,
    kind: 'align',
    value: option,
  })) as ToolbarAction[],
})
const imageToolbarSections = computed<ToolbarSection[]>(() => {
  if (!isImageBlock.value) return []
  return [buildWidthSection(primaryWidths), buildBlockPositionSection()]
})

const sanitizeLayoutForType = (targetType: Block['type']) => {
  if (targetType !== 'heading') return null
  const layout = { ...(props.block.layout as Record<string, unknown>) }
  if (!('fontSize' in layout)) return null
  delete (layout as Record<string, unknown>).fontSize
  return layout
}

const toolbarSections = computed<ToolbarSection[]>(() => {
  const sections: ToolbarSection[] = []

  if (!isImageBlock.value) {
    sections.push({
      id: 'primary-actions',
      actions: [
        ...buildWidthSection(primaryWidths).actions,
        ...(hasTextToolbar.value ? buildBlockPositionSection().actions : []),
      ],
    })
  }

  return sections
})

const toolbarMenuGroups = computed<ToolbarMenuGroup[]>(() => {
  const groups: ToolbarMenuGroup[] = []

  if (hasTextToolbar.value) {
    groups.push({
      id: 'block-position-menu',
      label: 'Block position',
      actions: blockPositionOptions.map((option) => ({
        id: `menu-block-pos-${option}`,
        label: undefined,
        icon: alignIconMap[option],
        selected: currentBlockPosition.value === option,
        kind: 'blockPosition',
        value: option,
        appearance: 'icon',
        tooltip: `Block ${option}`,
      })),
    })

    groups.push({
      id: 'text-format',
      label: 'Text formatting',
      actions: [
        { id: 'fmt-bold', label: undefined, icon: 'ri:bold', kind: 'format', value: 'bold', appearance: 'icon', tooltip: 'Bold' },
        { id: 'fmt-italic', label: undefined, icon: 'ri:italic', kind: 'format', value: 'italic', appearance: 'icon', tooltip: 'Italic' },
        { id: 'fmt-underline', label: undefined, icon: 'ri:underline', kind: 'format', value: 'underline', appearance: 'icon', tooltip: 'Underline' },
      ],
    })

    groups.push({
      id: 'text-align',
      label: 'Text alignment',
      actions: alignOptions.map((option) => ({
        id: `text-align-${option}`,
        label: undefined,
        icon: alignIconMap[option],
        selected: currentTextAlign.value === option,
        kind: 'textAlign',
        value: option,
        appearance: 'icon',
        tooltip: option === 'justify' ? 'Justify' : `Align ${option}`,
      })),
    })

    const fontGroup: ToolbarMenuGroup = {
      id: 'font-size',
      label: 'Text size',
      actions: FONT_PRESETS.map((preset) => ({
        id: `font-${preset.id}`,
        label: preset.id,
        selected: preset.id === 'Normal'
          ? currentFontSize.value === null || Math.abs((currentFontSize.value ?? 16) - preset.value) <= 1
          : Math.abs((currentFontSize.value ?? -1) - preset.value) <= 1,
        kind: 'fontSize',
        value: preset.value,
      })),
    }
    groups.push(fontGroup)

    const transformOptions: Array<{ id: string; type: Block['type']; label: string }> = [
      { id: 'transform-text', type: 'text', label: 'Text' },
      { id: 'transform-heading', type: 'heading', label: 'Heading' },
      { id: 'transform-list', type: 'list', label: 'List' },
      { id: 'transform-quote', type: 'quote', label: 'Quote' },
      { id: 'transform-code', type: 'code', label: 'Code' },
    ]

    groups.push({
      id: 'transform',
      label: 'Convert to',
      actions: transformOptions.map((item) => ({
        id: item.id,
        label: item.label,
        selected: props.block.type === item.type,
        kind: 'transform',
        value: item.type,
      })),
    })
  }

  if (isImageBlock.value) {
    const legacy = legacyWidths.filter(w => currentWidth.value === w)
    const imageWidths = Array.from(new Set([...primaryWidths, ...extraImageWidths, ...legacy])).sort((a, b) => a - b)
    groups.push({
      id: 'image-width',
      label: 'Width',
      actions: imageWidths.map((w) => ({
        id: `image-width-${w}`,
        label: `${w}%`,
        selected: currentWidth.value === w,
        kind: 'width',
        value: w,
      })),
    })

    groups.push({
      id: 'ratio',
      label: 'Aspect ratio',
      actions: ratioOptions.map((ratio) => ({
        id: `ratio-${ratio}`,
        label: ratio,
        selected: ((props.block.layout as any).aspectRatio ?? 'free') === ratio,
        kind: 'ratio',
        value: ratio,
      })),
    })
  }

  groups.push({
    id: 'actions',
    label: 'Block actions',
    actions: [
      {
        id: 'delete-block',
        label: 'Delete',
        icon: 'ri:delete-bin-line',
        kind: 'delete',
      },
    ],
  })

  return groups.filter((group) => group.actions.length > 0)
})

const handleToolbarAction = (action: ToolbarAction) => {
  switch (action.kind) {
    case 'width':
      if (typeof action.value === 'number') {
        setWidth(action.value as 25 | 33 | 50 | 66 | 75 | 100)
      }
      break
    case 'align':
      if (action.value) {
        setAlign(action.value as AlignOption)
      }
      break
    case 'blockPosition':
      if (action.value) {
        setBlockPosition(action.value as AlignOption)
      }
      break
    case 'format':
      if (hasTextToolbar.value && typeof action.value === 'string') {
        applyInlineCommand(action.value as 'bold' | 'italic' | 'underline')
      }
      break
    case 'textAlign':
      if (typeof action.value === 'string') {
        setTextAlignment(action.value as AlignOption | 'justify')
      }
      break
    case 'fontSize':
      if (typeof action.value === 'number') {
        setFontPx(action.value)
      }
      break
    case 'transform':
      if (typeof action.value === 'string') {
        const type = action.value as Block['type']
        const nextLayout = sanitizeLayoutForType(type)
        if (nextLayout) {
          emit('update', { ...props.block, layout: nextLayout })
        }
        onToolbarTransform(type)
      }
      break
    case 'ratio':
      if (typeof action.value === 'string') {
        setRatio(action.value as RatioOpt)
      }
      break
    case 'delete':
      onDelete()
      break
    default:
      break
  }
}

const nearestWidth = (percent: number): 50 | 100 => {
  let best = 50
  let minDiff = Infinity
  for (const w of primaryWidths) {
    const d = Math.abs(percent - w)
    if (d < minDiff) {
      minDiff = d
      best = w
    }
  }
  return best as 50 | 100
}

const onResizeDown = (e: PointerEvent) => {
  isResizing.value = true
  const el = blockEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const startW = r.width
  const parent = el.parentElement as HTMLElement | null
  const parentW = parent?.clientWidth || r.width
  resizePreviewWidth.value = props.block.layout.width

  const onMove = (ev: PointerEvent) => {
    const dx = ev.clientX - e.clientX
    const newWidthPx = Math.max(60, startW + dx)
    const percent = (newWidthPx / parentW) * 100
    dragWidth.value = percent
    resizePreviewWidth.value = Math.max(20, Math.min(100, percent))
  }

  const finish = () => {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', finish)
    document.removeEventListener('pointercancel', finish)
    if (dragWidth.value !== null) {
      const snapped = nearestWidth(dragWidth.value)
      setWidth(snapped)
    }
    dragWidth.value = null
    resizePreviewWidth.value = null
    isResizing.value = false
    emit('resizeend', props.block.id)
  }

  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', finish)
  document.addEventListener('pointercancel', finish)
}

const previewStyle = computed(() => {
  if (resizePreviewWidth.value === null) return {}
  const width = resizePreviewWidth.value
  const style: Record<string, string> = {
    flex: `0 0 ${width}%`,
    maxWidth: `${width}%`
  }
  return style
})

</script>

<template>
  <div
    ref="blockEl"
    class="block"
    :class="[blockClass, cssItem, { selected, readonly, resizing: resizePreviewWidth !== null, focused: isFocused }]"
    :data-id="block.id"
    :style="previewStyle"
  >
    <div class="left-grip" @pointerdown.stop.prevent="onToolbarDragStart"></div>
    <div class="drag-grip-tl" title="Drag block" @pointerdown.stop.prevent="onToolbarDragStart"></div>
    <div class="inner">
      <div class="content" @pointerdown="handleContentPointerDown">
        <component
          :is="
            block.type === 'text' ? TextRenderer :
            block.type === 'heading' ? HeadingRenderer :
            block.type === 'quote' ? QuoteRenderer :
            block.type === 'code' ? CodeRenderer :
            block.type === 'list' ? ListRenderer :
            ImageRenderer
          "
          ref="editableEl"
          v-model:html="localContent"
          :readonly="readonly"
          :content-style="block.type !== 'image' ? textStyle : imgStyle"
          @focus="onFocus"
          @blur="onBlur"
        />
      </div>

      <div v-if="isImageBlock && showToolbar" class="image-toolbar">
        <UnifiedBlockToolbar
          :sections="imageToolbarSections"
          :menu-groups="toolbarMenuGroups"
          @trigger="handleToolbarAction"
        />
      </div>


      <div
        v-if="showToolbar && !isImageBlock"
        class="toolbar-stack"
        @mouseenter="cancelHide"
        @mouseleave="scheduleHide()"
        @pointerdown="cancelHide"
        @pointerup="cancelHide"
        @focusin="cancelHide"
      >
        <UnifiedBlockToolbar
          :sections="toolbarSections"
          :menu-groups="toolbarMenuGroups"
          @trigger="handleToolbarAction"
        />
      </div>

      <ResizeHandle :active="isResizing" @down="onResizeDown" />
    </div>
  </div>
</template>

<style scoped>
.block {
  position: relative;
  box-sizing: border-box;
  padding: 6px;
  transition: background 120ms ease, transform 120ms ease;
  outline: none;
  box-shadow: none;
}
.inner { position: relative; }
.content { position: relative; padding: 4px; }
.image-toolbar {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  pointer-events: none;
}
.image-toolbar :deep(*) {
  pointer-events: auto;
}
.block-item { background: transparent; }
.block.focused,
.block.selected {
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.45);
}
.block.resizing {
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.45);
}
.block.focused .content::after,
.block.resizing .content::after,
.block.selected .content::after {
  display: none;
}
.left-grip { position: absolute; left: -4px; top: 0; bottom: 0; width: 4px; cursor: grab; }
.drag-grip-tl { position: absolute; top: 5px; left: -2px; width: 12px; height: 12px; cursor: grab; z-index: 10; border-radius: 2px; background: rgba(148,163,184,.25); border: 1px dashed #6b7280; }
.resize-handle { position: absolute; right: 0; bottom: 0; width: 14px; height: 14px; border-radius: 2px; background: rgba(148,163,184,.25); cursor: nwse-resize; }
.resize-handle.active { background: rgba(148,163,184,.45); }

.toolbar-stack {
  position: absolute;
  left: 8px;
  right: 8px;
  top: calc(100% + 8px);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
  justify-content: flex-start;
  z-index: 20;
  pointer-events: none;
}
.toolbar-stack :deep(*) {
  pointer-events: auto;
}

/* Width utilities */
.w-100 { flex: 0 0 100%; max-width: 100%; }
.w-75  { flex: 0 0 75%; max-width: 75%; }
.w-66  { flex: 0 0 66%; max-width: 66%; }
.w-50  { flex: 0 0 50%; max-width: 50%; }
.w-33  { flex: 0 0 33%; max-width: 33%; }
.w-25  { flex: 0 0 25%; max-width: 25%; }
.align-left   { margin-right: auto; }
.align-center { margin-left: auto; margin-right: auto; }
.align-right  { margin-left: auto; }

.heading :deep(h1), .heading :deep(h2), .heading :deep(h3) { margin: 8px 0; }
.text :deep(p) { margin: 0; line-height: 1.7; }
.text :deep(p + p) { margin-top: 1.2rem; }
.quote :deep(blockquote) { border-left: 3px solid #1f2937; margin: 8px 0; padding: 8px 12px; }
.code :deep(pre) { background: #0b0f14; color: #e2e8f0; padding: 12px; border: 1px solid #1f2937; white-space: pre-wrap; }
.list :deep(ul), .list :deep(ol) { padding-left: 1.2em; margin: 8px 0; }
.image :deep(img) { display: block; width: 100%; height: auto; }
</style>
