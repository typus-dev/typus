<template>
  <div class="bg-white rounded-xl ring-1 ring-slate-200 p-6">
    <div class="flex items-center gap-2 mb-4">
      <div class="w-2 h-2 theme-colors-background-info rounded-full"></div>
      <h3 class="text-sm font-semibold theme-colors-text-primary">🧪 Custom Test Tasks</h3>
    </div>

    <!-- Template Selection -->
    <div class="mb-4">
      <label class="text-xs text-slate-700 block mb-2">Template</label>
      <div class="flex gap-2">
        <select 
          v-model="selectedTemplateIndex"
          @change="onTemplateChange"
          class="flex-1 px-3 py-2 text-sm bg-white ring-1 ring-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
        >
          <option value="-1">Select a template...</option>
          <option 
            v-for="(template, index) in availableTemplates" 
            :key="index" 
            :value="index"
          >
            {{ template.title }} ({{ template.type }})
          </option>
        </select>
        <button 
          @click="loadTemplates"
          :disabled="templatesLoading"
          class="px-3 py-2 rounded-lg ring-1 ring-slate-200 bg-white hover:bg-slate-50 text-sm"
        >
          <Loader2 v-if="templatesLoading" class="w-4 h-4 animate-spin" />
          <RefreshCw v-else class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Template Editor -->
    <div v-if="currentTemplate" class="space-y-4">
      <!-- Basic Settings -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-slate-700 block mb-1">Task Type</label>
          <input 
            v-model="currentTemplate.type"
            class="w-full px-3 py-2 text-sm border-0 bg-slate-50 ring-1 ring-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
          />
        </div>
        <div>
          <label class="text-xs text-slate-700 block mb-1">Title Template</label>
          <input 
            v-model="currentTemplate.title"
            placeholder="Use {index} for task number"
            class="w-full px-3 py-2 text-sm border-0 bg-slate-50 ring-1 ring-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
          />
        </div>
        <div>
          <label class="text-xs text-slate-700 block mb-1">Priority</label>
          <select 
            v-model="currentTemplate.priority"
            class="w-full px-3 py-2 text-sm bg-white ring-1 ring-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
          >
            <option :value="1">P1 - High</option>
            <option :value="2">P2 - Medium</option>
            <option :value="3">P3 - Normal</option>
            <option :value="4">P4 - Low</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-slate-700 block mb-1">Delay (ms)</label>
          <input 
            v-model.number="currentTemplate.delay"
            type="number"
            min="0"
            placeholder="0"
            class="w-full px-3 py-2 text-sm border-0 bg-slate-50 ring-1 ring-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
          />
        </div>
      </div>

      <!-- JSON Data Editor -->
      <div>
        <label class="text-xs text-slate-700 block mb-2">Task Data (JSON)</label>
        <div class="relative">
          <textarea 
            v-model="dataJson"
            rows="8"
            placeholder="Enter task data as JSON..."
            class="w-full px-3 py-3 text-xs font-mono border-0 bg-slate-50 ring-1 ring-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none resize-none"
            @input="validateJson"
          />
          <div 
            v-if="jsonError" 
            class="absolute top-2 right-2 px-2 py-1 theme-colors-background-error theme-colors-text-error text-xs rounded"
          >
            Invalid JSON
          </div>
        </div>
        <div class="text-xs text-slate-500 mt-1">
          Use placeholders: {index}, {timestamp}, {random}
        </div>
      </div>

      <!-- Queue and Count Selection -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-slate-700 block mb-1">Target Queue</label>
          <select 
            v-model="selectedQueue"
            class="w-full px-3 py-2 text-sm bg-white ring-1 ring-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
          >
            <option value="">Select queue...</option>
            <option 
              v-for="queue in queues" 
              :key="queue.key" 
              :value="queue.key"
            >
              {{ queue.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs text-slate-700 block mb-1">Count</label>
          <div class="flex items-center gap-1">
            <button 
              @click="taskCount = Math.max(1, taskCount - 1)"
              class="w-8 h-8 rounded-lg bg-white ring-1 ring-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600"
            >
              <span class="text-sm">−</span>
            </button>
            <input 
              v-model.number="taskCount" 
              type="number" 
              min="1" 
              max="100"
              class="flex-1 px-2 py-2 text-sm text-center border-0 bg-white ring-1 ring-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
            />
            <button 
              @click="taskCount = Math.min(100, taskCount + 1)"
              class="w-8 h-8 rounded-lg bg-white ring-1 ring-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600"
            >
              <span class="text-sm">+</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 pt-2">
        <button 
          @click="createTasks"
          :disabled="!canCreateTasks || creating"
          class="flex-1 px-4 py-2 theme-colors-background-accent hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2"
        >
          <Loader2 v-if="creating" class="w-4 h-4 animate-spin" />
          <span v-else>Create {{ taskCount }} Task{{ taskCount !== 1 ? 's' : '' }}</span>
        </button>
        <button 
          @click="resetTemplate"
          class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition"
        >
          Reset
        </button>
      </div>
    </div>

    <!-- Template Preview -->
    <div v-if="currentTemplate && !jsonError" class="mt-6 p-4 bg-slate-50 rounded-lg">
      <h4 class="text-xs font-semibold text-slate-700 mb-2">Preview (Task #1)</h4>
      <div class="text-xs text-slate-600 space-y-1">
        <div><strong>Type:</strong> {{ currentTemplate.type }}</div>
        <div><strong>Title:</strong> {{ previewTitle }}</div>
        <div><strong>Priority:</strong> P{{ currentTemplate.priority || 3 }}</div>
        <div v-if="currentTemplate.delay"><strong>Delay:</strong> {{ currentTemplate.delay }}ms</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Loader2, RefreshCw } from 'lucide-vue-next'
import { queueApiService } from '../services/queueApiService'

// Props
const props = defineProps({
  queues: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['task-created', 'error'])

// State
const availableTemplates = ref([])
const templatesLoading = ref(false)
const selectedTemplateIndex = ref(-1)
const currentTemplate = ref(null)
const dataJson = ref('')
const jsonError = ref(false)
const selectedQueue = ref('')
const taskCount = ref(5)
const creating = ref(false)

// Computed
const canCreateTasks = computed(() => {
  return currentTemplate.value && 
         selectedQueue.value && 
         taskCount.value > 0 && 
         !jsonError.value &&
         dataJson.value.trim()
})

const previewTitle = computed(() => {
  if (!currentTemplate.value) return ''
  return currentTemplate.value.title
    .replace(/\{index\}/g, '1')
    .replace(/\{timestamp\}/g, new Date().toLocaleString())
    .replace(/\{random\}/g, 'abc123')
})

// Methods
const loadTemplates = async () => {
  templatesLoading.value = true
  try {
    const response = await queueApiService.getTaskTemplates()
    availableTemplates.value = response.templates
  } catch (error) {
    console.error('Failed to load templates:', error)
    emit('error', `Failed to load templates: ${error.message}`)
  } finally {
    templatesLoading.value = false
  }
}

const onTemplateChange = () => {
  if (selectedTemplateIndex.value >= 0) {
    const template = availableTemplates.value[selectedTemplateIndex.value]
    currentTemplate.value = {
      type: template.type,
      title: template.title,
      priority: template.priority || 3,
      delay: template.delay || 0
    }
    dataJson.value = JSON.stringify(template.data, null, 2)
    validateJson()
  } else {
    resetTemplate()
  }
}

const validateJson = () => {
  try {
    if (dataJson.value.trim()) {
      JSON.parse(dataJson.value)
      jsonError.value = false
    } else {
      jsonError.value = true
    }
  } catch (error) {
    jsonError.value = true
  }
}

const resetTemplate = () => {
  selectedTemplateIndex.value = -1
  currentTemplate.value = null
  dataJson.value = ''
  jsonError.value = false
  selectedQueue.value = ''
  taskCount.value = 5
}

const createTasks = async () => {
  if (!canCreateTasks.value) return

  creating.value = true
  try {
    const template = {
      ...currentTemplate.value,
      data: JSON.parse(dataJson.value)
    }

    const request = {
      queueKey: selectedQueue.value,
      count: taskCount.value,
      template
    }

    const response = await queueApiService.addCustomTestTasks(request)
    
    emit('task-created', {
      queue: selectedQueue.value,
      added: response.added,
      template: template.title
    })

    // Optionally reset form
    resetTemplate()
  } catch (error) {
    console.error('Failed to create custom test tasks:', error)
    emit('error', `Failed to create tasks: ${error.message}`)
  } finally {
    creating.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadTemplates()
})

// Watchers
watch(dataJson, () => {
  if (currentTemplate.value) {
    validateJson()
  }
})
</script>
