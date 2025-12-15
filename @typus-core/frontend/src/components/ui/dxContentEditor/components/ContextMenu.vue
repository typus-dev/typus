<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, toRefs, computed } from 'vue'
import dxIcon from '@/components/ui/dxIcon.vue'

type InsertType = 'text' | 'heading' | 'image' | 'list' | 'quote' | 'code' | 'table'
type TransformType = 'text' | 'heading' | 'list' | 'quote' | 'code'

interface Props {
  modelValue: boolean
  x: number
  y: number
  target: 'canvas' | 'block'
  canTransform?: boolean
}
const props = defineProps<Props>()
const { modelValue, x, y, target, canTransform } = toRefs(props)

const ctxClasses = computed(() => [
  'ctx border shadow-xl backdrop-blur-md',
  'theme-colors-background-secondary',
  'theme-colors-border-primary',
  'theme-colors-text-primary',
])

const menuButtonClass = computed(() => [
  'mi border rounded-md transition-colors duration-150 ease-out bg-transparent hover:brightness-110',
  'theme-colors-border-primary',
  'theme-colors-text-primary',
])

const chipClass = computed(() => [
  'chip border rounded-md transition-colors duration-150 ease-out bg-transparent hover:brightness-110',
  'theme-colors-border-primary',
  'theme-colors-text-primary',
])

const insertOptionsClass = computed(() => [
  'insert-options border rounded-lg',
  'theme-colors-background-secondary',
  'theme-colors-border-primary',
])

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  insert: [t: InsertType]
  delete: []
  transform: [t: TransformType]
  setWidth: [w: 25 | 33 | 50 | 66 | 75 | 100]
  setAlign: [a: 'left' | 'center' | 'right' | 'justify']
}>()

const rootEl = ref<HTMLElement | null>(null)
const showInsertOptions = ref(false)

const close = () => {
  emit('update:modelValue', false)
  showInsertOptions.value = false
}

const onDocPointerDown = (e: PointerEvent) => {
  const el = rootEl.value
  if (!el) return
  if (!el.contains(e.target as Node)) close()
}

onMounted(() => document.addEventListener('pointerdown', onDocPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown))

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    document.removeEventListener('pointerdown', onDocPointerDown)
  })
}

watch(modelValue, value => {
  if (!value) showInsertOptions.value = false
})
</script>

<template>
  <div v-show="modelValue" ref="rootEl" :class="ctxClasses" :style="{ left: x + 'px', top: y + 'px' }">
    <!-- Canvas: compact icon palette -->
    <div v-if="target === 'canvas'" class="menu" role="menu" aria-label="Canvas menu">
      <button :class="menuButtonClass" @click="emit('insert','text'); close()" title="Insert text" aria-label="Insert text">
        <dxIcon name="ri:paragraph" size="sm" />
        <span class="txt">Text block</span>
      </button>
      <button :class="menuButtonClass" @click="emit('insert','heading'); close()" title="Insert heading" aria-label="Insert heading">
        <dxIcon name="ri:h-2" size="sm" />
        <span class="txt">Heading</span>
      </button>
      <button :class="menuButtonClass" @click="emit('insert','list'); close()" title="Insert list" aria-label="Insert list">
        <dxIcon name="ri:list-unordered" size="sm" />
        <span class="txt">List</span>
      </button>
      <button :class="menuButtonClass" @click="emit('insert','quote'); close()" title="Insert quote" aria-label="Insert quote">
        <dxIcon name="ri:double-quotes-l" size="sm" />
        <span class="txt">Quote</span>
      </button>
      <button :class="menuButtonClass" @click="emit('insert','code'); close()" title="Insert code" aria-label="Insert code">
        <dxIcon name="ri:code-line" size="sm" />
        <span class="txt">Code</span>
      </button>
      <button :class="menuButtonClass" @click="emit('insert','table'); close()" title="Insert table" aria-label="Insert table">
        <dxIcon name="ri:table-2" size="sm" />
        <span class="txt">Table</span>
      </button>
      <button :class="menuButtonClass" @click="emit('insert','image'); close()" title="Insert image" aria-label="Insert image">
        <dxIcon name="ri:image-line" size="sm" />
        <span class="txt">Image</span>
      </button>
    </div>

    <!-- Block: compact formatting/actions -->
    <div v-else class="menu" role="menu" aria-label="Block menu">
      <div class="insert-group">
        <button :class="[menuButtonClass, 'justify-between']" @click="showInsertOptions = !showInsertOptions" title="Add block" aria-label="Add block after current">
          <dxIcon name="ri:add-line" size="sm" />
          <span class="txt">Add block after</span>
          <dxIcon :name="showInsertOptions ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'" size="xs" />
        </button>

        <div v-if="showInsertOptions" :class="insertOptionsClass">
          <button :class="menuButtonClass" @click="emit('insert','text'); close()" title="Insert text" aria-label="Insert text">
            <dxIcon name="ri:paragraph" size="sm" />
            <span class="txt">Text</span>
          </button>
          <button :class="menuButtonClass" @click="emit('insert','heading'); close()" title="Insert heading" aria-label="Insert heading">
            <dxIcon name="ri:h-2" size="sm" />
            <span class="txt">Heading</span>
          </button>
          <button :class="menuButtonClass" @click="emit('insert','list'); close()" title="Insert list" aria-label="Insert list">
            <dxIcon name="ri:list-unordered" size="sm" />
            <span class="txt">List</span>
          </button>
          <button :class="menuButtonClass" @click="emit('insert','quote'); close()" title="Insert quote" aria-label="Insert quote">
            <dxIcon name="ri:double-quotes-l" size="sm" />
            <span class="txt">Quote</span>
          </button>
          <button :class="menuButtonClass" @click="emit('insert','code'); close()" title="Insert code" aria-label="Insert code">
            <dxIcon name="ri:code-line" size="sm" />
            <span class="txt">Code</span>
          </button>
          <button :class="menuButtonClass" @click="emit('insert','table'); close()" title="Insert table" aria-label="Insert table">
            <dxIcon name="ri:table-2" size="sm" />
            <span class="txt">Table</span>
          </button>
          <button :class="menuButtonClass" @click="emit('insert','image'); close()" title="Insert image" aria-label="Insert image">
            <dxIcon name="ri:image-line" size="sm" />
            <span class="txt">Image</span>
          </button>
        </div>
      </div>

      <div class="row chips" role="group" aria-label="Width">
        <button :class="chipClass" title="25%" @click="emit('setWidth', 25); close()">25%</button>
        <button :class="chipClass" title="50%" @click="emit('setWidth', 50); close()">50%</button>
        <button :class="chipClass" title="75%" @click="emit('setWidth', 75); close()">75%</button>
        <button :class="chipClass" title="100%" @click="emit('setWidth', 100); close()">100%</button>
      </div>
      <button :class="menuButtonClass" @click="emit('setAlign','left'); close()" title="Align left" aria-label="Align left">
        <dxIcon name="ri:align-left" size="sm" />
        <span class="txt">Align left</span>
      </button>
      <button :class="menuButtonClass" @click="emit('setAlign','center'); close()" title="Align center" aria-label="Align center">
        <dxIcon name="ri:align-center" size="sm" />
        <span class="txt">Align center</span>
      </button>
      <button :class="menuButtonClass" @click="emit('setAlign','right'); close()" title="Align right" aria-label="Align right">
        <dxIcon name="ri:align-right" size="sm" />
        <span class="txt">Align right</span>
      </button>
      <button :class="menuButtonClass" @click="emit('setAlign','justify'); close()" title="Align justify" aria-label="Align justify">
        <dxIcon name="ri:align-justify" size="sm" />
        <span class="txt">Justify</span>
      </button>
      <template v-if="canTransform">
        <button :class="menuButtonClass" @click="emit('transform','text'); close()" title="To text" aria-label="To text">
          <dxIcon name="ri:paragraph" size="sm" />
          <span class="txt">To text</span>
        </button>
        <button :class="menuButtonClass" @click="emit('transform','heading'); close()" title="To heading" aria-label="To heading">
          <dxIcon name="ri:h-2" size="sm" />
          <span class="txt">To heading</span>
        </button>
        <button :class="menuButtonClass" @click="emit('transform','list'); close()" title="To list" aria-label="To list">
          <dxIcon name="ri:list-unordered" size="sm" />
          <span class="txt">To list</span>
        </button>
        <button :class="menuButtonClass" @click="emit('transform','quote'); close()" title="To quote" aria-label="To quote">
          <dxIcon name="ri:double-quotes-l" size="sm" />
          <span class="txt">To quote</span>
        </button>
        <button :class="menuButtonClass" @click="emit('transform','code'); close()" title="To code" aria-label="To code">
          <dxIcon name="ri:code-line" size="sm" />
          <span class="txt">To code</span>
        </button>
      </template>
      <button :class="[menuButtonClass, 'danger']" @click="emit('delete'); close()" title="Delete" aria-label="Delete">
        <dxIcon name="ri:delete-bin-line" size="sm" />
        <span class="txt">Delete</span>
      </button>
    </div>
  </div>
  
</template>

<style scoped>
.ctx {
  position: fixed;
  z-index: 100;
  border-radius: 12px;
  padding: 10px;
  min-width: 240px;
  max-width: 320px;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.menu { display: grid; gap: 8px; }
.insert-group { display: flex; flex-direction: column; gap: 8px; }
.insert-options { display: grid; gap: 6px; margin-top: 6px; padding: 8px; border-radius: 10px; }
.row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.section-title {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.7;
  margin-bottom: 4px;
}
.txt { font-size: 12px; }
.mi {
  height: 34px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  border-width: 1px;
  border-style: solid;
  border-color: rgba(148, 163, 184, 0.26);
  background-color: rgba(148, 163, 184, 0.08);
  color: inherit;
  transition: background-color 160ms ease, filter 160ms ease, transform 160ms ease;
}
.mi:hover {
  filter: brightness(1.08);
  background-color: rgba(148, 163, 184, 0.16);
}
.mi:active { transform: translateY(0.5px); }
.mi.danger {
  border-color: rgba(248, 113, 113, 0.55);
  color: #fca5a5;
  background-color: rgba(127, 29, 29, 0.18);
}
.chip {
  min-width: 42px;
  height: 30px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-width: 1px;
  border-style: solid;
  border-color: rgba(148, 163, 184, 0.26);
  background-color: rgba(148, 163, 184, 0.08);
  color: inherit;
  transition: background-color 160ms ease, filter 160ms ease, transform 160ms ease;
}
.chip:hover {
  filter: brightness(1.08);
  background-color: rgba(148, 163, 184, 0.16);
}
.chip:active { transform: translateY(0.5px); }
.mi:disabled, .chip:disabled { opacity: .45; cursor: not-allowed; filter: none; }
@supports (color-mix(in srgb, currentColor 10%, transparent)) {
  .mi {
    border-color: color-mix(in srgb, currentColor 24%, transparent);
    background-color: color-mix(in srgb, currentColor 8%, transparent);
  }
  .mi:hover {
    background-color: color-mix(in srgb, currentColor 18%, transparent);
  }
  .chip {
    border-color: color-mix(in srgb, currentColor 24%, transparent);
    background-color: color-mix(in srgb, currentColor 6%, transparent);
  }
  .chip:hover {
    background-color: color-mix(in srgb, currentColor 16%, transparent);
  }
}
</style>
