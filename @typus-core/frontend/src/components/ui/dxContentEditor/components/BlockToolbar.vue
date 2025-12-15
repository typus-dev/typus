<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import dxIcon from '@/components/ui/dxIcon.vue'

type WidthOpt = 25 | 33 | 50 | 66 | 75 | 100
type RatioOpt = 'free' | '16:9' | '4:3' | '1:1'
type TransformType = 'text' | 'heading' | 'list' | 'quote' | 'code'

interface Props {
  modelValue: boolean
  width: WidthOpt
  ratio?: RatioOpt
  ratios?: RatioOpt[]
  blockType?: string
}
const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  'set:width': [w: WidthOpt]
  'set:ratio': [r: RatioOpt]
  'menu:delete': []
  'menu:transform': [t: TransformType]
}>()

const isVisible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const widths: WidthOpt[] = [25, 33, 50, 66, 75, 100]
const inlineWidths = computed(() => widths.filter((w) => w !== 100))
const emitWidth = (value: WidthOpt) => {
  console.log('[BlockToolbar] emit width', value)
  emit('set:width', value)
}
const ratioOpts = computed<RatioOpt[] | undefined>(() => props.ratios)
const menuOpen = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const showWidthInline = ref(true)
const showRatioInline = ref(true)

let ro: ResizeObserver | null = null

const measure = () => {
  const toolbar = rootEl.value
  if (!toolbar) return
  const block = toolbar.closest('.block') as HTMLElement | null
  const blockWidth = block?.clientWidth ?? 0
  if (!blockWidth) return
  showWidthInline.value = true
  showRatioInline.value = false
}

const onDocPointerDown = (e: PointerEvent) => {
  if (!menuOpen.value) return
  const el = rootEl.value
  if (!el) return
  if (!el.contains(e.target as Node)) {
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown)
  nextTick(() => {
    measure()
    const block = rootEl.value?.closest('.block') as HTMLElement | null
    if (block && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => measure())
      ro.observe(block)
    }
    window.addEventListener('resize', measure)
  })
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
  if (ro) { ro.disconnect(); ro = null }
  window.removeEventListener('resize', measure)
})

watch(isVisible, value => {
  if (!value) {
    menuOpen.value = false
  }
})
</script>

<template>
  <div
    v-show="isVisible"
    ref="rootEl"
    :class="[
      'toolbar border',
      'theme-colors-background-secondary',
      'theme-colors-text-primary',
      'theme-border'.primary
    ]"
  >
    <div class="menu">
      <button class="menu-btn" title="Block menu" @click.stop="menuOpen = !menuOpen">⋮</button>
      <div
        v-show="menuOpen"
        @click.stop
        :class="[
          'menu-pop border',
          'theme-colors-background-secondary',
          'theme-border'.primary
        ]"
      >
        <div class="menu-grid">
          <div class="col" v-if="blockType === 'text'">
            <div class="menu-section">Transform</div>
            <div class="menu-list">
              <button class="menu-item" @click="emit('menu:transform','text')">¶ Text</button>
              <button class="menu-item" @click="emit('menu:transform','heading')">H Heading</button>
              <button class="menu-item" @click="emit('menu:transform','list')">• List</button>
              <button class="menu-item" @click="emit('menu:transform','quote')">❝ Quote</button>
              <button class="menu-item" @click="emit('menu:transform','code')">&lt;/&gt; Code</button>
            </div>
          </div>
          <div class="col">
            <template v-if="!showWidthInline">
              <div class="menu-section">Width</div>
              <button v-for="w in widths" :key="'mw-'+w" class="menu-item" @click="emit('set:width', w)">{{ w }}%</button>
            </template>
            <template v-if="ratioOpts && ratioOpts.length && !showRatioInline">
              <div class="menu-section">Ratio</div>
              <button v-for="r in ratioOpts" :key="'mr-'+r" class="menu-item" @click="emit('set:ratio', r as any)">{{ r }}</button>
            </template>
            <div class="menu-section sep" />
            <button class="menu-item" @click="emit('menu:delete')">Delete</button>
          </div>
        </div>
      </div>
    </div>
    <div :class="['group', 'theme-colors-text-primary']" v-show="showWidthInline">
      <button class="chip icon" :class="{ sel: width === 100 }" title="Full width" @click="emitWidth(100)">
        <dxIcon name="ri:expand-left-right-fill" size="xs" />
      </button>
      <button v-for="w in inlineWidths" :key="w" class="chip" :class="{ sel: width === w }" @click="emitWidth(w)">{{ w }}%</button>
    </div>
    <div class="group" v-if="ratio && ratioOpts && showRatioInline">
      <button v-for="r in ratioOpts" :key="r" class="chip" :class="{ sel: ratio === r }" @click="emit('set:ratio', r)">{{ r }}</button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  position: relative;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  padding: 6px 8px;
  border-radius: 6px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
}
.group { display: inline-flex; align-items: center; gap: 4px; }
.label { font-size: 11px; opacity: .8; color: var(--text); }
.chip { min-width: 34px; height: 26px; padding: 0 8px; background: transparent; color: var(--text); border: 1px solid var(--border); border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; }
.chip.icon { min-width: 26px; padding: 0 6px; }
.chip.sel { background: #1f2937; color: #e5e7eb; }
.menu { position: relative; }
.menu-btn { width: 26px; height: 26px; background: transparent; border: 1px solid currentColor; border-radius: 6px; }
.menu-pop {
  position: absolute;
  top: 120%;
  left: 0;
  padding: 6px;
  border-radius: 6px;
  box-shadow: 0 10px 24px rgba(0,0,0,0.4);
}
.menu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.menu-section { font-size: 11px; opacity: .8; color: var(--text); margin-bottom: 4px; }
.menu-section.sep { height: 1px; background: var(--border); margin: 4px 0; }
.menu-list { display: grid; gap: 4px; }
.menu-item { text-align: left; border: 1px solid currentColor; padding: 2px 6px; background: transparent; }
.menu-item:hover { background: #1f2937aa; }
</style>
