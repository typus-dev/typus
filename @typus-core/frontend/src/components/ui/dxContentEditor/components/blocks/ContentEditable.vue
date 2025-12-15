<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

interface Props {
  html: string
  readonly?: boolean
}
const props = withDefaults(defineProps<Props>(), { readonly: false })
const emit = defineEmits<{ 'update:html': [val: string]; focus: []; blur: []; keydown: [e: KeyboardEvent] }>()

const el = ref<HTMLElement | null>(null)
const local = ref<string>(props.html)

const syncDom = (force = false) => {
  const root = el.value
  if (!root) return
  const focused = document.activeElement === root
  if (!focused || force) {
    root.innerHTML = local.value
  }
}

watch(() => props.html, (v) => { local.value = v; syncDom() })

const onInput = (e: Event) => {
  const target = e.target as HTMLElement
  local.value = target.innerHTML
  emit('update:html', local.value)
}

const insertBrAtCaret = () => {
  const root = el.value
  if (!root) return
  root.focus()
  const sel = window.getSelection()
  if (!sel) return
  if (sel.rangeCount === 0) {
    const r = document.createRange()
    r.selectNodeContents(root)
    r.collapse(false)
    sel.addRange(r)
  }
  const range = sel.getRangeAt(0)
  let container: Node | null = range.commonAncestorContainer
  while (container && container !== root) container = container.parentNode
  if (!container) {
    const r = document.createRange()
    r.selectNodeContents(root)
    r.collapse(false)
    sel.removeAllRanges()
    sel.addRange(r)
  }

  const br = document.createElement('br')
  range.deleteContents()
  range.insertNode(br)

  // Ensure caret visibly moves to a new line when breaking at the end
  if (!br.nextSibling) {
    const extra = document.createElement('br')
    br.parentNode?.insertBefore(extra, br.nextSibling)
  }

  range.setStartAfter(br)
  range.setEndAfter(br)
  sel.removeAllRanges()
  sel.addRange(range)
}

const onKeydown = (e: KeyboardEvent) => {
  emit('keydown', e)
  if (e.key === 'Enter' && e.shiftKey) {
    e.preventDefault()
    insertBrAtCaret()
    const root = el.value
    if (root) {
      local.value = root.innerHTML
      emit('update:html', local.value)
    }
  }
}

const onFocus = () => emit('focus')
const onBlur = () => emit('blur')

defineExpose({ focus: () => el.value?.focus(), getEl: () => el.value })

nextTick(() => syncDom(true))
</script>

<template>
  <div
    ref="el"
    :contenteditable="!props.readonly"
    @input="onInput"
    @keydown="onKeydown"
    @focus="onFocus"
    @blur="onBlur"
  />
</template>

<style scoped>
/* inherits styling via parent classes */
</style>
