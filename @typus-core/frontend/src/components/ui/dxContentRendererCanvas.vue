<template>
  <div class="dx-content-renderer canvas-mode">
    <div v-if="content" class="dxce-preview">
      <div ref="containerRef" class="canvas"></div>
    </div>
    <div v-else class="empty-placeholder" :class="'theme-colors-text-secondary'">
      Content is not available.
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { applyDxceStaticLayout } from '@typus-core/shared/dxce/render'
import '@/components/ui/dxContentEditor/preview.css'

interface Props {
  content?: string | null
}

const props = defineProps<Props>()
const containerRef = ref<HTMLElement | null>(null)

const renderContent = async () => {
  const root = containerRef.value
  if (!root) return

  const html = props.content ?? ''
  if (!html) {
    root.innerHTML = ''
    return
  }

  root.innerHTML = html
  await nextTick()
  applyDxceStaticLayout(root)
}

onMounted(() => {
  void renderContent()
})

watch(() => props.content, () => { void renderContent() })
</script>

<style scoped>
.dx-content-renderer.canvas-mode {
  width: 100%;
  height: 100%;
}

.empty-placeholder {
  padding: 2rem 0;
  text-align: center;
  font-style: italic;
}
</style>
