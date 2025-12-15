<template>
  <div :style="{ width }" class="quick-editor">
    <dx-card background="secondary" bordered fullHeight class="border-dashed">
      <!-- Body -->
      <div class="p-4 md:p-6 flex flex-col gap-4" :style="{ minHeight }">
        <!-- Title -->
        <div>
          <label class="block text-sm font-medium mb-2 text-slate-300">Title2</label>
          <dx-input
            v-model="title"
            placeholder="Enter title..."
            size="md"
          />
        </div>
        <!-- Content -->
        <div class="flex-1 flex flex-col">
          <label class="block text-sm font-medium mb-2 text-slate-300">Content</label>
          <textarea
            v-model="content"
            class="w-full flex-1 min-h-[12rem] md:min-h-[18rem] rounded-lg border border-slate-700 bg-slate-800 text-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write your text here..."
          ></textarea>
        </div>
      </div>
      <!-- Footer -->
      <template #footer>
        <div class="flex items-center justify-end gap-2 p-3">
          <dx-button variant="ghost" size="sm" @click="onCancel">Cancel</dx-button>
          <dx-button variant="primary" size="sm" :disabled="!canSave" @click="onSave">Save</dx-button>
        </div>
      </template>
    </dx-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import dxCard from '@/components/ui/dxCard.vue'
import dxButton from '@/components/ui/dxButton.vue'
import dxInput from '@/components/ui/dxInput.vue'

interface Props {
  /** Full width by default to span the grid */
  width?: string
  /** Visual height for “two rows” effect */
  minHeight?: string
  /** Optional initial values */
  initialTitle?: string
  initialContent?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  minHeight: '28rem', // ~ two card rows visually
  initialTitle: '',
  initialContent: ''
})

const emit = defineEmits<{
  save: [payload: { title: string; content: string }]
  cancel: []
}>()

const title = ref(props.initialTitle)
const content = ref(props.initialContent)

watchEffect(() => {
  // keep initial props in sync if they change
  if (props.initialTitle !== undefined) title.value = props.initialTitle
  if (props.initialContent !== undefined) content.value = props.initialContent
})

const canSave = computed(() => title.value.trim().length > 0 || content.value.trim().length > 0)

function onSave() {
  emit('save', { title: title.value.trim(), content: content.value.trim() })
}
function onCancel() {
  emit('cancel')
}
</script>

<style scoped>
.quick-editor :deep(.dx-card){
  border-style: dashed;
}
</style>