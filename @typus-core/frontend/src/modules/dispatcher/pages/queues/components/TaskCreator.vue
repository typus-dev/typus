<template>
  <div v-if="visible" class="fixed inset-0 z-50 overflow-y-auto" aria-modal="true" role="dialog">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="$emit('close')"></div>

      <!-- Modal panel -->
      <div
        class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all
               sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
      >
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-lg leading-6 font-medium text-gray-900">Create Task</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <i class="ri-close-line text-xl"></i>
          </button>
        </div>

        <form @submit.prevent="createTask" class="space-y-4">
          <!-- Task Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Task Type</label>
            <select
              v-model="selectedType"
              required
              :disabled="loading"
              class="mt-1 block w-full px-3 py-2 border theme-colors-border-primary rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
            >
              <option value="">Select task type</option>
              <option v-for="schema in availableSchemas" :key="schema.type" :value="schema.type">
                {{ formatSchemaName(schema.type) }}
              </option>
            </select>
          </div>

          <!-- Dynamic Fields from Schema -->
          <div v-if="formFields.length > 0" class="space-y-4">
            <div v-for="field in formFields" :key="field" class="form-field">
              <label class="block text-sm font-medium text-gray-700">{{ formatFieldLabel(field) }}</label>

              <!-- Email field -->
              <input
                v-if="isEmailField(field)"
                v-model="formData[field]"
                type="email"
                :placeholder="getFieldPlaceholder(field)"
                :disabled="loading"
                class="mt-1 block w-full px-3 py-2 border theme-colors-border-primary rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
              />

              <!-- Number field -->
              <input
                v-else-if="isNumberField(field)"
                v-model.number="formData[field]"
                type="number"
                :placeholder="getFieldPlaceholder(field)"
                :disabled="loading"
                class="mt-1 block w-full px-3 py-2 border theme-colors-border-primary rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
              />

              <!-- Textarea field -->
              <textarea
                v-else-if="isTextareaField(field)"
                v-model="formData[field]"
                :placeholder="getFieldPlaceholder(field)"
                :disabled="loading"
                rows="3"
                class="mt-1 block w-full px-3 py-2 border theme-colors-border-primary rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
              ></textarea>

              <!-- Default text field -->
              <input
                v-else
                v-model="formData[field]"
                type="text"
                :placeholder="getFieldPlaceholder(field)"
                :disabled="loading"
                class="mt-1 block w-full px-3 py-2 border theme-colors-border-primary rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          <!-- Task Count -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Number of Tasks</label>
            <input
              v-model.number="taskCount"
              type="number"
              min="1"
              max="100"
              required
              :disabled="loading"
              class="mt-1 block w-full px-3 py-2 border theme-colors-border-primary rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
            />
          </div>

          <!-- Priority -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Priority</label>
            <select
              v-model.number="priority"
              :disabled="loading"
              class="mt-1 block w-full px-3 py-2 border theme-colors-border-primary rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
            >
              <option :value="1">1 - Critical</option>
              <option :value="2">2 - High</option>
              <option :value="3">3 - Medium</option>
              <option :value="4">4 - Low</option>
              <option :value="5">5 - Very Low</option>
            </select>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="$emit('close')"
              :disabled="loading"
              class="px-4 py-2 border theme-colors-border-primary rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading || !selectedType"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white theme-colors-background-accent hover:opacity-90 disabled:opacity-50"
            >
              {{ loading ? 'Creating...' : 'Create Tasks' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Simple Task Creator modal - Auto Queue Detection
 * - Uses simple field arrays from plugins
 * - Auto-detects field types by name
 * - Auto-determines queue from task type
 */

import { ref, onMounted, watch } from 'vue'
import { queueApiService } from '../../../services/queueApiService'

defineProps({
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'task-created'])

const loading = ref(false)
const selectedType = ref('')
const taskCount = ref(1)
const priority = ref(3)
const availableSchemas = ref([])
const formFields = ref([])
const formData = ref({})

// Load all available schemas on component mount
onMounted(async () => {
  await loadSchemas()
})

// Fetch all plugin schemas
const loadSchemas = async () => {
  try {
    const response = await queueApiService.getAllPluginSchemas()
    availableSchemas.value = response.schemas || []
    logger.debug('📋 Loaded schemas:', response.schemas)
  } catch (error) {
    logger.error('❌ Failed to load schemas:', error)
  }
}

/**
 * Load fields based on selectedType using simple field arrays
 * 
 * ⚠️  NO FALLBACK LOGIC - relies entirely on plugin schema fields ⚠️
 */
const loadFormFields = async () => {
  if (!selectedType.value) {
    formFields.value = []
    formData.value = {}
    return
  }

  try {
    const schema = await queueApiService.getPluginSchema(selectedType.value)
    const previousData = { ...formData.value }

    // Use schema fields directly as received from dispatcher (no fallback)
    if (schema?.fields && Array.isArray(schema.fields)) {
      formFields.value = typeof schema.fields[0] === 'string' 
        ? schema.fields 
        : schema.fields.map(field => field.key || field.name || field)
    } else {
      // No fallback - if schema has no fields, show no fields
      formFields.value = []
    }

    // Initialize form data for available fields only
    const newFormData = {}
    formFields.value.forEach((field) => {
      newFormData[field] = previousData[field] || 
                          schema.defaults?.[field] || 
                          ''
    })
    formData.value = newFormData

    console.log('🔧 Loaded fields with defaults:', formFields.value, newFormData)
  } catch (error) {
    console.error('❌ Failed to load form fields:', error)
    // No fallback - if schema loading fails, show no fields
    formFields.value = []
    formData.value = {}
  }
}

// Field type detection helpers
const isEmailField = (field) => {
  return /email|mail|to/i.test(field)
}

const isNumberField = (field) => {
  return /count|number|amount|id|port|timeout|delay|priority/i.test(field)
}

const isTextareaField = (field) => {
  return /text|html|content|message|body|description|notes|steps|recipients|data|config/i.test(field)
}

// Format field names for display
const formatFieldLabel = (field) =>
  field.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())

// Generate placeholders based on field names
const getFieldPlaceholder = (field) => {
  if (isEmailField(field)) return 'user@example.com'
  if (/subject/i.test(field)) return 'Email subject'
  if (/text|message|content/i.test(field)) return 'Message content'
  if (/html/i.test(field)) return 'HTML content'
  if (/template/i.test(field)) return 'Template name'
  if (/recipients/i.test(field)) return 'JSON object with recipients'
  if (/steps/i.test(field)) return 'Array of steps'
  if (/url/i.test(field)) return 'https://example.com'
  if (/path/i.test(field)) return '/path/to/file'
  return `Enter ${formatFieldLabel(field).toLowerCase()}`
}

const formatSchemaName = (name) => {
  if (!name) return 'Unknown Schema'
  return name.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())
}

/**
 * Create tasks using simple field data with agnostic queue detection
 */
const createTask = async () => {
  try {
    loading.value = true

    // Get queue name directly from plugin schema (agnostic approach)
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

      await queueApiService.createTask(
        selectedType.value,
        taskData,
        queueKey
      )
    }

    emit('task-created', {
      queue: queueKey,
      added: taskCount.value,
      template: selectedType.value
    })

    resetForm()
  } catch (error) {
    logger.error('❌ Error creating tasks:', error)

  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  selectedType.value = ''
  taskCount.value = 1
  priority.value = 3
  formFields.value = []
  formData.value = {}
}

// Watch for type changes
watch(selectedType, loadFormFields)
</script>
