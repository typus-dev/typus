<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { queueApiService } from '../services/queueApiService';

// DX Components
import dxSelect from '@/components/ui/dxSelect/dxSelect.vue';
import dxInput from '@/components/ui/dxInput.vue';
import dxButton from '@/components/ui/dxButton.vue';
import dxText from '@/components/ui/dxText.vue';
import dxCard from '@/components/ui/dxCard.vue';

interface ApiTaskTemplate {
  type: string;
  name: string;
  description: string;
  schema: {
    contexts?: {
      simple?: Record<string, string>;
      production?: Record<string, any>;
    };
  };
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number';
  placeholder: string;
}

// Reactive state
const loading = ref(false);
const templates = ref<ApiTaskTemplate[]>([]);
const selectedTaskType = ref<string>('');
const formData = ref<Record<string, any>>({});
const isSubmitting = ref(false);

// Computed properties
const taskTypeOptions = computed(() => 
  templates.value.map(template => ({
    label: template.name,
    value: template.type
  }))
);

const selectedTemplate = computed(() => 
  templates.value.find(t => t.type === selectedTaskType.value)
);

const dynamicFields = computed((): FormField[] => {
  if (!selectedTemplate.value?.schema?.contexts) return [];
  
  const contexts = selectedTemplate.value.schema.contexts;
  const simpleContext = contexts.simple || {};
  
  // Extract field placeholders like {{email}}, {{subject}}
  const fields: FormField[] = [];
  const fieldPattern = /\{\{(\w+)\}\}/g;
  
  for (const [key, value] of Object.entries(simpleContext)) {
    if (typeof value === 'string') {
      const matches = value.matchAll(fieldPattern);
      for (const match of matches) {
        const fieldName = match[1];
        if (!fields.find(f => f.name === fieldName)) {
          fields.push({
            name: fieldName,
            label: fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
            type: getFieldType(fieldName),
            placeholder: `Enter ${fieldName}`
          });
        }
      }
    }
  }
  
  return fields;
});

// Helper function to determine field type
function getFieldType(fieldName: string): 'text' | 'email' | 'number' {
  if (fieldName.toLowerCase().includes('email')) return 'email';
  if (fieldName.toLowerCase().includes('phone') || fieldName.toLowerCase().includes('number')) return 'number';
  return 'text';
}

// Methods
async function loadTaskTemplates() {
  try {
    loading.value = true;
    const response = await queueApiService.getTaskTemplates();
    // Transform the API response to match our interface
    templates.value = response.templates.map(template => ({
      type: template.type,
      name: template.title || template.type,
      description: `Plugin-based schema for ${template.type}`,
      schema: template.data || { contexts: { simple: {} } }
    }));
  } catch (error) {
    console.error('Failed to load task templates:', error);
  } finally {
    loading.value = false;
  }
}

function onTaskTypeChange(value: string) {
  selectedTaskType.value = value;
  formData.value = {}; // Reset form data when type changes
}

function getQueueForTaskType(taskType: string): string {
  if (taskType.includes('email')) return 'redis_email_queue';
  if (taskType.includes('telegram')) return 'redis_telegram_queue';
  if (taskType.includes('notification')) return 'redis_notifications_queue';
  if (taskType.includes('cache')) return 'redis_cache_queue';
  if (taskType.includes('backup')) return 'redis_backup_queue';
  if (taskType.includes('stats') || taskType.includes('report')) return 'redis_reports_queue';
  return 'redis_system_queue';
}

async function createTask() {
  if (!selectedTaskType.value || dynamicFields.value.length === 0) {
    alert('Please select a task type and fill in the fields');
    return;
  }

  try {
    isSubmitting.value = true;
    
    // Add default fields
    const taskData = {
      ...formData.value,
      title: `${selectedTemplate.value?.name || selectedTaskType.value} Task`,
      priority: 3
    };

    const queueKey = getQueueForTaskType(selectedTaskType.value);
    
    const result = await queueApiService.createTaskWithSchema(
      selectedTaskType.value,
      taskData,
      queueKey
    );

    alert(`Task created successfully! Added ${result.added} task(s) to queue: ${result.queue}`);
    
    // Reset form
    formData.value = {};
    selectedTaskType.value = '';
    
  } catch (error) {
    console.error('Failed to create task:', error);
    alert(`Failed to create task: ${error.message}`);
  } finally {
    isSubmitting.value = false;
  }
}

// Lifecycle
onMounted(() => {
  loadTaskTemplates();
});

// Watch for template changes to reset form
watch(selectedTaskType, () => {
  formData.value = {};
});
</script>

<template>
  <dxCard>
    <template #header>
      <dxText text="Create Dynamic Task" class="text-xl font-semibold" />
    </template>
    
    <div class="space-y-4">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-4">
        <dxText text="Loading task templates..." />
      </div>

      <!-- Task Type Selection -->
      <div v-else>
        <dxSelect
          label="Task Type"
          placeholder="Select a plugin/task type"
          :options="taskTypeOptions"
          :modelValue="selectedTaskType"
          @update:modelValue="onTaskTypeChange"
          class="mb-4"
        />

        <!-- Selected Template Info -->
        <div v-if="selectedTemplate" class="mb-4 p-3 bg-gray-50 rounded">
          <dxText :text="`Plugin: ${selectedTemplate.name}`" class="font-medium" />
          <dxText :text="selectedTemplate.description" class="text-sm text-gray-600 mt-1" />
        </div>

        <!-- Dynamic Form Fields -->
        <div v-if="dynamicFields.length > 0" class="space-y-3">
          <dxText text="Task Configuration:" class="font-medium" />
          
          <div 
            v-for="field in dynamicFields" 
            :key="field.name"
            class="mb-3"
          >
            <dxInput
              :label="field.label"
              :placeholder="field.placeholder"
              :type="field.type"
              v-model="formData[field.name]"
            />
          </div>

          <!-- Submit Button -->
          <div class="mt-6">
            <dxButton
              text="Create Task"
              type="submit"
              :disabled="isSubmitting"
              @click="createTask"
              class="w-full"
            />
          </div>
        </div>

        <!-- No Fields Message -->
        <div v-else-if="selectedTaskType" class="text-center py-4 text-gray-500">
          <dxText text="No configurable fields found for this task type" />
        </div>
      </div>
    </div>
  </dxCard>
</template>

<style scoped>
.space-y-4 > * + * {
  margin-top: 1rem;
}

.space-y-3 > * + * {
  margin-top: 0.75rem;
}
</style>
