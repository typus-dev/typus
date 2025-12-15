<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import InlineToolbar from './InlineToolbar.vue'
import dxIcon from '@/components/ui/dxIcon.vue'

const sizes = ['Small', 'Normal', 'Large', 'XLarge'] as const
type SizeKey = typeof sizes[number]

const props = defineProps<{ modelValue: boolean; anchor?: 'top' | 'bottom'; align?: 'left' | 'center' | 'right' | 'justify' }>()
const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  bold: []
  italic: []
  underline: []
  'set-size': [px: number]
  transform: [t: 'text' | 'heading' | 'list' | 'quote' | 'code']
  align: [dir: 'left' | 'center' | 'right' | 'justify']
}>()

const sizeToPx = (k: SizeKey): number => ({ Small: 13, Normal: 16, Large: 18, XLarge: 24 } as Record<SizeKey, number>)[k]

const sizeOpen = ref(false)
const typeOpen = ref(false)

const onSetSize = (k: SizeKey) => emit('set-size', sizeToPx(k))
const onTransform = (t: 'text' | 'heading' | 'list' | 'quote' | 'code') => emit('transform', t)

const rootEl = ref<any | null>(null)
const onDocDown = (e: PointerEvent) => {
  // ref is on a child component (InlineToolbar), so resolve to its root DOM element
  const raw = rootEl.value as any
  const el: HTMLElement | null = raw && raw.$el ? (raw.$el as HTMLElement) : (raw as HTMLElement)
  if (!el || typeof (el as any).contains !== 'function') return
  if (!el.contains(e.target as Node)) { sizeOpen.value = false; typeOpen.value = false }
}
onMounted(() => document.addEventListener('pointerdown', onDocDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocDown))
</script>

<template>
  <InlineToolbar
    :model-value="props.modelValue"
    :anchor="props.anchor"
    ref="rootEl"
    :class="[
      'theme-colors-background-secondary',
      'theme-colors-text-primary',
      'theme-border'.primary,
      'border'
    ]"
    @update:modelValue="v => $emit('update:modelValue', v)"
  >
    <div class="tbwrap">
      <div class="group">
        <button class="btn" title="Bold" @mousedown.prevent @click="$emit('bold')"><b>B</b></button>
        <button class="btn" title="Italic" @mousedown.prevent @click="$emit('italic')"><i>I</i></button>
        <button class="btn" title="Underline" @mousedown.prevent @click="$emit('underline')"><u>U</u></button>
      </div>
      <div class="group">
        <button class="btn icon" :class="{ sel: (props.align ?? 'left') === 'left' }" title="Align left" @mousedown.prevent @click="$emit('align','left')">
          <dxIcon name="ri:align-left" size="sm" />
        </button>
        <button class="btn icon" :class="{ sel: props.align === 'center' }" title="Align center" @mousedown.prevent @click="$emit('align','center')">
          <dxIcon name="ri:align-center" size="sm" />
        </button>
        <button class="btn icon" :class="{ sel: props.align === 'right' }" title="Align right" @mousedown.prevent @click="$emit('align','right')">
          <dxIcon name="ri:align-right" size="sm" />
        </button>
        <button class="btn icon" :class="{ sel: props.align === 'justify' }" title="Justify" @mousedown.prevent @click="$emit('align','justify')">
          <dxIcon name="ri:align-justify" size="sm" />
        </button>
      </div>
      <div class="group">
        <div class="menu">
          <button class="btn" @mousedown.prevent @click="sizeOpen = !sizeOpen">
            Size
            <svg class="ico" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div v-if="sizeOpen" class="popup">
            <button v-for="s in sizes" :key="s" class="item" @mousedown.prevent @click="onSetSize(s); sizeOpen=false">{{ s }}</button>
          </div>
        </div>
      </div>
      <div class="group">
        <div class="menu">
          <button class="btn" @mousedown.prevent @click="typeOpen = !typeOpen">
            Convert
            <svg class="ico" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div v-if="typeOpen" class="popup">
            <div class="title">Convert to</div>
            <button class="item" @mousedown.prevent @click="onTransform('text'); typeOpen=false">Text</button>
            <button class="item" @mousedown.prevent @click="onTransform('quote'); typeOpen=false">Quote</button>
            <button class="item" @mousedown.prevent @click="onTransform('code'); typeOpen=false">Code</button>
            <button class="item" @mousedown.prevent @click="onTransform('list'); typeOpen=false">List</button>
            <button class="item" @mousedown.prevent @click="onTransform('heading'); typeOpen=false">Heading</button>
          </div>
        </div>
      </div>
    </div>
  </InlineToolbar>
</template>

<style scoped>
.tbwrap { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.group { display: flex; gap: 2px; }
.btn { color: inherit; background: transparent; border: 1px solid var(--border); height: 28px; padding: 0 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; line-height: 1; }
.ico { display: inline-block; opacity: .85; }
.menu { position: relative; }
.popup { position: absolute; top: 120%; left: 0; display: grid; gap: 4px; padding: 6px; z-index: 10; min-width: 130px; box-shadow: 0 8px 16px rgba(0,0,0,.45); }
.item { text-align: left; border: 1px solid currentColor; padding: 2px 6px; width: 100%; background: transparent; }
.item:hover { background: #1f2937aa; }
.title { font-size: 11px; opacity: .8; margin-bottom: 4px; }

.btn.icon { min-width: 28px; justify-content: center; }

</style>
