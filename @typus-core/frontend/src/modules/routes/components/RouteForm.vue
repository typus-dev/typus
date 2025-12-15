<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '@/shared/composables/useApi'
import { logger } from '@/core/logging/logger'
import { useMessages } from '@/shared/composables/useMessages'
import type { RouteFormData } from '../types'

const { errorMessage } = useMessages()

const props = defineProps<{
  modelValue: RouteFormData
}>()

const emit = defineEmits<{
  'update:modelValue': [value: RouteFormData]
}>()

const routes = ref<any[]>([])
const metaJson = ref('{}')

const formData = computed({
  get: () => props.modelValue,
  set: (value: RouteFormData) => {
    if (JSON.stringify(value) !== JSON.stringify(props.modelValue)) {
      emit('update:modelValue', value)
    }
  }
})

// Watch metaJson changes and update form.meta
watch(metaJson, (newMetaJson) => {
  try {
    let meta = {}
    if (newMetaJson.trim()) {
      meta = JSON.parse(newMetaJson)
    }
    
    const updatedForm = { ...formData.value, meta }
    if (JSON.stringify(updatedForm) !== JSON.stringify(formData.value)) {
      emit('update:modelValue', updatedForm)
    }
  } catch (err) {
    // Invalid JSON, don't update
  }
})

// Watch modelValue changes to update metaJson
watch(() => props.modelValue.meta, (newMeta) => {
  const newMetaJsonString = JSON.stringify(newMeta || {}, null, 2)
  if (metaJson.value !== newMetaJsonString) {
    metaJson.value = newMetaJsonString
  }
}, { deep: true })

const parentOptions = computed(() => {
  return [
    { label: 'None (root route)', value: '' },
    ...(Array.isArray(routes.value)
      ? routes.value.map(route => ({
          label: `${route.name} (${route.path})`,
          value: route.id
        }))
      : [])
  ]
})

async function loadRoutes() {
  const { data, error: apiError } = await useApi('/dynamic-routes').get()

  if (apiError) {
    logger.error('[RouteForm] Failed to load routes', { error: apiError })
    errorMessage(apiError)
    return
  }

  routes.value = data || []
  logger.debug('[RouteForm] Routes loaded', { count: routes.value.length })
}

onMounted(async () => {
  await loadRoutes()
  metaJson.value = JSON.stringify(props.modelValue.meta || {}, null, 2)
})
</script>

<template>
  <form @submit.prevent>
      <dxGrid cols="1" gap="4">
        <dxCol>
          <dxInput
            id="name"
            :model-value="formData.name"
            @update:model-value="formData = { ...formData, name: $event }"
            label="Route Name*"
            placeholder="Example: users, dashboard, settings"
            required
          />
        </dxCol>

        <dxCol>
          <dxInput
            id="path"
            :model-value="formData.path"
            @update:model-value="formData = { ...formData, path: $event }"
            label="Route Path*"
            placeholder="Example: /users, /dashboard, /settings"
            required
            helperText="Path must start with / and contain only Latin letters, numbers, hyphens and slashes"
          />
        </dxCol>

        <dxCol>
          <dxInput
            id="component"
            :model-value="formData.component"
            @update:model-value="formData = { ...formData, component: $event }"
            label="Component"
            placeholder="Example: UserList, Dashboard, Settings"
            helperText="Vue component name to be displayed when navigating to this route"
          />
        </dxCol>

        <dxCol>
          <dxSelect
            id="parent"
            :model-value="formData.parentId"
            @update:model-value="formData = { ...formData, parentId: $event }"
            label="Parent Route"
            :options="parentOptions"
            placeholder="Select parent route"
          />
        </dxCol>

        <dxCol>
          <dxGrid cols="2" gap="4">
            <dxCol>
              <dxInput
                id="orderIndex"
                :model-value="formData.orderIndex"
                @update:model-value="formData = { ...formData, orderIndex: Number($event) }"
                label="Display Order"
                type="number"
                min="0"
              />
            </dxCol>

            <dxCol>
              <div :class="['theme-layout-flex-items', 'h-full']">
                <dxCheckbox 
                  id="isActive" 
                  :model-value="formData.isActive"
                  @update:model-value="formData = { ...formData, isActive: $event }"
                  label="Active Route" 
                />
              </div>
            </dxCol>
          </dxGrid>
        </dxCol>

        <dxCol>
          <dxInput
            id="meta"
            v-model="metaJson"
            label="Metadata (JSON)"
            multiline
            rows="5"
            placeholder='{"icon": "dashboard", "requiresAuth": true}'
            helperText="Additional route metadata in JSON format"
          />
        </dxCol>
      </dxGrid>
  </form>
</template>
