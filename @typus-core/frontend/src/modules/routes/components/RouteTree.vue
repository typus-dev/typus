<template>
  <dxCard class="route-tree">
    <dxSpinner v-if="loading" />

    <dxStack
      v-else-if="error"
      align="center"
      justify="between"
      class="w-full p-4 border-b"
      :class="'theme-colors-border-primary'"
    >
      <dxIcon name="ri:error-warning-fill" :class="'theme-colors-text-error'" size="lg" />
      <p :class="'theme-colors-text-primary'">{{ error }}</p>
      <dxButton @click="loadRoutes" variant="primary">Try Again</dxButton>
    </dxStack>

    <template v-else>
      <dxFlex
        align="center"
        justify="between"
        class="w-full p-4 border-b"
        :class="'theme-colors-border-primary'"
      >
        <dxButton @click="addRootRoute" variant="outline" size="sm">
          <template #prefix="{ iconColor }">
            <dxIcon name="ri:add-line" :class="['mr-1', iconColor]" />
          </template>
          Add Root
        </dxButton>
        <dxButton @click="saveOrder" variant="secondary" size="sm" :disabled="!hasChanges"
          >Save Order</dxButton
        >
      </dxFlex>

      <draggable
        v-if="routes.length"
        v-model="routes"
        group="routes"
        item-key="id"
       
        ghost-class="opacity-50"
        handle=".drag-handle"
        @end="onDragEnd"
      >
        <template #item="{ element }">
          <route-item
            :route="element"
            :level="0"
            :theme="theme"
            @edit="emit('edit', $event)"
            @delete="confirmDelete"
            @add-child="r => emit('add', { parentId: r.id })"
          />
        </template>
      </draggable>

      <dxStack v-else align="center" direction="col" spacing="4" class="py-8">
        <p :class="'theme-colors-text-secondary'">No routes available</p>
        <dxButton @click="addRootRoute" variant="primary">Add First Route</dxButton>
      </dxStack>
    </template>
  </dxCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import draggable from 'vuedraggable'
import RouteItem from './RouteItem.vue'
import { useApi } from '@/shared/composables/useApi'
import { useMessages } from '@/shared/composables/useMessages'
import { logger } from '@/core/logging/logger'
import type { RouteReorderItem } from '../types'

const emit = defineEmits(['edit', 'add', 'refresh'])
const { confirmMessage, errorMessage } = useMessages()

const routes = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const hasChanges = ref(false)

onMounted(loadRoutes)

async function loadRoutes() {
  loading.value = true
  error.value = null
  const { data, error: err } = await useApi('/dynamic-routes').get({ tree: true })
  if (err) error.value = err
  else routes.value = data || []
  hasChanges.value = false
  loading.value = false
}

function addRootRoute() {
  emit('add', { parentId: null })
}

function saveOrder() {
  if (hasChanges.value) onDragEnd()
}

async function onDragEnd() {
  hasChanges.value = true
  const flat: RouteReorderItem[] = []
  const flatten = (list: any[], parentId: string | null = null, i = 0) => {
    list.forEach((r, idx) => {
      flat.push({ id: r.id, parentId, orderIndex: i + idx })
      if (r.children?.length) flatten(r.children, r.id, (i + idx + 1) * 100)
    })
  }
  flatten(routes.value)

  loading.value = true
  const { error: err } = await useApi('/dynamic-routes/reorder').post({ routes: flat })
  if (err) errorMessage(err)
  else {
    hasChanges.value = false
    await loadRoutes()
  }
  loading.value = false
}

async function confirmDelete(route: any) {
  const msg = route.children?.length
    ? `Delete "${route.name}" and ${route.children.length} child routes?`
    : `Delete "${route.name}"?`
  if (await confirmMessage(msg)) {
    loading.value = true
    const { error: err } = await useApi(`/dynamic-routes/${route.id}`).del()
    if (err) errorMessage(err)
    else {
      await loadRoutes()
      emit('refresh')
    }
    loading.value = false
  }
}
</script>
