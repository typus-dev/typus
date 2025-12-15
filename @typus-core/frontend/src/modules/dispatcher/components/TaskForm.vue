<script setup lang="ts">
import { computed, ref } from 'vue'
import dxInput from '@/components/ui/dxInput.vue'
import dxSwitch from '@/components/ui/dxSwitch.vue'
import dxTextArea from '@/components/ui/dxTextArea.vue'
import dxSelect from '@/components/ui/dxSelect/dxSelect.vue'

export interface TaskFormData {
  id?: number
  name: string
  type: string
  data?: Record<string, any>
  periodSec?: number
  parentId?: number
  isActive: boolean
}

const props = defineProps<{
  modelValue: TaskFormData
  isCreateMode?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TaskFormData]
  'validate': [hasErrors: boolean]
}>()

const updateField = (field: keyof TaskFormData, value: any) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value
  })
}

const dataString = computed({
  get: () => {
    if (!props.modelValue.data) return ''
    if (typeof props.modelValue.data === 'string') return props.modelValue.data
    return JSON.stringify(props.modelValue.data, null, 2)
  },
  set: (value: string) => {
    try {
      const parsed = JSON.parse(value)
      updateField('data', parsed)
    } catch {
      updateField('data', value)
    }
  }
})

// Period presets (in seconds)
const periodPresets = [
  { label: '1 minute', value: 60 },
  { label: '5 minutes', value: 300 },
  { label: '15 minutes', value: 900 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
  { label: '3 hours', value: 10800 },
  { label: '6 hours', value: 21600 },
  { label: '12 hours', value: 43200 },
  { label: '24 hours (1 day)', value: 86400 },
  { label: '3 days', value: 259200 },
  { label: '7 days (1 week)', value: 604800 },
  { label: '14 days (2 weeks)', value: 1209600 },
  { label: '30 days (1 month)', value: 2592000 },
  { label: 'Custom', value: 0 }
]

const isCustomPeriod = ref(false)
const customPeriodValue = ref<number | undefined>(undefined)

const selectedPreset = computed({
  get: () => {
    const current = props.modelValue.periodSec
    if (!current) return 0

    const preset = periodPresets.find(p => p.value === current)
    if (preset) {
      isCustomPeriod.value = false
      return preset.value
    }

    // Custom value
    isCustomPeriod.value = true
    customPeriodValue.value = current
    return 0 // "Custom" option
  },
  set: (value: number) => {
    if (value === 0) {
      // Custom selected
      isCustomPeriod.value = true
      if (customPeriodValue.value) {
        updateField('periodSec', customPeriodValue.value)
      }
    } else {
      // Preset selected
      isCustomPeriod.value = false
      updateField('periodSec', value)
    }
  }
})

const updateCustomPeriod = (value: any) => {
  const numValue = value ? Number(value) : undefined
  customPeriodValue.value = numValue
  if (isCustomPeriod.value) {
    updateField('periodSec', numValue)
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Main fields grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- Task Name -->
      <div>
        <label class="block text-sm font-medium mb-2">
          Task Name <span class="theme-colors-text-error">*</span>
        </label>
        <dxInput
          :model-value="modelValue.name"
          @update:model-value="updateField('name', $event)"
          placeholder="Enter task name"
          required
        />
      </div>

      <!-- Task Type -->
      <div>
        <label class="block text-sm font-medium mb-2">
          Task Type <span class="theme-colors-text-error">*</span>
        </label>
        <dxInput
          :model-value="modelValue.type"
          @update:model-value="updateField('type', $event)"
          placeholder="task_type"
          required
        />
      </div>

      <!-- Active Switch (centered) -->
      <div>
        <label class="block text-sm font-medium mb-2">Active</label>
        <div class="flex items-center justify-center h-10">
          <dxSwitch
            :model-value="modelValue.isActive"
            @update:model-value="updateField('isActive', $event)"
          />
        </div>
      </div>

      <!-- Period -->
      <div>
        <dxSelect
          v-model="selectedPreset"
          :options="periodPresets"
          label="Period"
          label-position="top"
          placeholder="Select period"
          :clearable="false"
          :no-gutters="true"
        />

        <!-- Custom period input (shown when "Custom" selected) -->
        <div v-if="isCustomPeriod" class="mt-2">
          <dxInput
            type="number"
            :model-value="customPeriodValue"
            @update:model-value="updateCustomPeriod"
            placeholder="Seconds (e.g., 7200)"
            class="text-sm"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter custom period in seconds</p>
        </div>
      </div>
    </div>

    <!-- Configuration Data (JSON) -->
    <div>
      <label class="block text-sm font-medium mb-2">Configuration Data (JSON)</label>
      <dxTextArea
        v-model="dataString"
        :rows="30"
        placeholder='{ "key": "value" }'
        class="font-mono text-sm"
      />
    </div>
  </div>
</template>
