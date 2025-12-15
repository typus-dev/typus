<template>
  <div>
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Task Type -->
      <DxSelect
        v-model="selectedType"
        label="Task Type"
        :options="schemaOptions"
        :loading="loadingSchemas"
        :disabled="loading"
        required
        noGutters
      />

      <!-- Dynamic Fields from Schema -->
      <template v-if="formFields.length > 0">
        <div v-for="field in formFields" :key="field">
          <!-- Email field -->
          <DxInput
            v-if="isEmailField(field)"
            v-model="formData[field]"
            type="email"
            :label="formatFieldLabel(field)"
            :placeholder="getFieldPlaceholder(field)"
            :disabled="loading"
            noGutters
          />

          <!-- Number field -->
          <DxInput
            v-else-if="isNumberField(field)"
            v-model="formData[field]"
            type="number"
            :label="formatFieldLabel(field)"
            :placeholder="getFieldPlaceholder(field)"
            :disabled="loading"
            noGutters
          />

          <!-- Textarea field -->
          <DxInput
            v-else-if="isTextareaField(field)"
            v-model="formData[field]"
            :label="formatFieldLabel(field)"
            :placeholder="getFieldPlaceholder(field)"
            :disabled="loading"
            multiline
            :rows="3"
            noGutters
          />

          <!-- Default text field -->
          <DxInput
            v-else
            v-model="formData[field]"
            :label="formatFieldLabel(field)"
            :placeholder="getFieldPlaceholder(field)"
            :disabled="loading"
            noGutters
          />
        </div>
      </template>

      <!-- Task Count -->
      <DxInput
        v-model="taskCount"
        type="number"
        label="Number of Tasks"
        :min="1"
        :max="100"
        :disabled="loading"
        noGutters
      />

      <!-- Priority -->
      <DxSelect
        v-model="priority"
        label="Priority"
        :options="priorityOptions"
        :disabled="loading"
        noGutters
      />

      <!-- Error message -->
      <div v-if="error" :class="['theme-typography-size-sm', 'theme-colors-text-error', 'p-3 rounded', 'theme-colors-background-tertiary']">
        {{ error }}
      </div>
    </form>

    <!-- Footer with buttons -->
    <div class="flex justify-end gap-3 mt-6 pt-4 border-t" :class="'theme-colors-border-primary'">
      <DxButton
        variant="secondary"
        :disabled="loading"
        @click="$emit('close')"
      >
        Cancel
      </DxButton>
      <DxButton
        variant="primary"
        :disabled="!canSubmit"
        :loading="loading"
        @click="handleSubmit"
      >
        Create Tasks
      </DxButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import DxInput from '@/components/ui/dxInput.vue'
import DxSelect from '@/components/ui/dxSelect'
import DxButton from '@/components/ui/dxButton.vue'
import { queueApiService } from '../../../services/queueApiService'

const emit = defineEmits(['submit', 'close', 'update:canSubmit'])

const loading = ref(false)
const loadingSchemas = ref(false)
const error = ref('')
const selectedType = ref('')
const taskCount = ref(1)
const priority = ref(3)
const availableSchemas = ref<any[]>([])
const formFields = ref<string[]>([])
const formData = ref<Record<string, any>>({})

const priorityOptions = [
  { label: '1 - Critical', value: 1 },
  { label: '2 - High', value: 2 },
  { label: '3 - Medium', value: 3 },
  { label: '4 - Low', value: 4 },
  { label: '5 - Very Low', value: 5 }
]

const schemaOptions = computed(() => [
  { label: 'Select task type', value: '' },
  ...availableSchemas.value.map(s => ({
    label: formatSchemaName(s.type),
    value: s.type
  }))
])

const canSubmit = computed(() => !!selectedType.value && !loading.value)

watch(canSubmit, (val) => emit('update:canSubmit', val), { immediate: true })

onMounted(async () => {
  await loadSchemas()
})

const loadSchemas = async () => {
  loadingSchemas.value = true
  try {
    const response = await queueApiService.getAllPluginSchemas()
    availableSchemas.value = response.schemas || []
  } catch (err) {
    console.error('Failed to load schemas:', err)
  } finally {
    loadingSchemas.value = false
  }
}

const loadFormFields = async () => {
  if (!selectedType.value) {
    formFields.value = []
    formData.value = {}
    return
  }

  try {
    const schema = await queueApiService.getPluginSchema(selectedType.value)
    const previousData = { ...formData.value }

    if (schema?.fields && Array.isArray(schema.fields)) {
      formFields.value = typeof schema.fields[0] === 'string'
        ? schema.fields
        : schema.fields.map((field: any) => field.key || field.name || field)
    } else {
      formFields.value = []
    }

    const newFormData: Record<string, any> = {}
    formFields.value.forEach((field) => {
      newFormData[field] = previousData[field] || schema.defaults?.[field] || ''
    })
    formData.value = newFormData
  } catch (err) {
    console.error('Failed to load form fields:', err)
    formFields.value = []
    formData.value = {}
  }
}

watch(selectedType, loadFormFields)

// Field type detection
const isEmailField = (field: string) => /email|mail|to/i.test(field)
const isNumberField = (field: string) => /count|number|amount|id|port|timeout|delay|priority/i.test(field)
const isTextareaField = (field: string) => /text|html|content|message|body|description|notes|steps|recipients|data|config/i.test(field)

const formatFieldLabel = (field: string) =>
  field.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())

const formatSchemaName = (name: string) => {
  if (!name) return 'Unknown Schema'
  return name.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
}

const getFieldPlaceholder = (field: string) => {
  if (isEmailField(field)) return 'user@example.com'
  if (/subject/i.test(field)) return 'Email subject'
  if (/text|message|content/i.test(field)) return 'Message content'
  if (/html/i.test(field)) return 'HTML content'
  if (/template/i.test(field)) return 'Template name'
  if (/recipients/i.test(field)) return 'JSON object with recipients'
  if (/url/i.test(field)) return 'https://example.com'
  if (/path/i.test(field)) return '/path/to/file'
  return `Enter ${formatFieldLabel(field).toLowerCase()}`
}

const handleSubmit = async () => {
  error.value = ''
  loading.value = true

  try {
    const selectedSchema = availableSchemas.value.find(s => s.type === selectedType.value)
    const queueKey = selectedSchema?.queueName || 'redis_system_queue'

    const userData = {
      ...formData.value,
      priority: priority.value,
      createdBy: 'Task Creator'
    }

    for (let i = 0; i < taskCount.value; i++) {
      const taskData = {
        ...userData,
        title: taskCount.value > 1 && userData.title ? `${userData.title} #${i + 1}` : userData.title
      }

      await queueApiService.createTask(selectedType.value, taskData, queueKey)
    }

    emit('submit', {
      queue: queueKey,
      added: taskCount.value,
      template: selectedType.value
    })
  } catch (err: any) {
    error.value = err.message || 'Failed to create tasks'
  } finally {
    loading.value = false
  }
}

// Expose submit method for parent
defineExpose({ submit: handleSubmit, canSubmit })
</script>
