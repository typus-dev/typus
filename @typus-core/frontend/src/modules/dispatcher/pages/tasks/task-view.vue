<route lang="json">
{
  "name": "dispatcher-tasks-view",
  "path": "/dispatcher/tasks/view/:id",
  "meta": {
    "layout": "private",
    "requiresAuth": true,
    "subject": "dispatcher"
  }
}
</route>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { DispatcherTaskMethods } from '../../methods/task.methods.dsx';
import { logger } from '@/core/logging/logger';

// Import UI components
import dxCard from '@/components/ui/dxCard.vue';
import dxButton from '@/components/ui/dxButton.vue';
import dxBadge from '@/components/ui/dxBadge.vue';

const router = useRouter();
const route = useRoute();

// Data
const task = ref(null);
const loading = ref(false);
const taskId = ref(route.params.id as string);

// Computed properties
const statusBadgeVariant = computed(() => {
  if (!task.value) return 'secondary';
  return task.value.isActive ? 'success' : 'secondary';
});

const statusText = computed(() => {
  if (!task.value) return 'Unknown';
  return task.value.isActive ? 'Active' : 'Inactive';
});

const scheduleDisplay = computed(() => {
  if (!task.value) return '-';
  
  switch (task.value.scheduleType) {
    case 'manual':
      return 'Manual execution only';
    case 'interval':
      return `Every ${task.value.periodSec} seconds`;
    case 'cron':
      return `Cron: ${task.value.cronExpr}`;
    default:
      return task.value.scheduleType;
  }
});

const taskTypeDisplay = computed(() => {
  if (!task.value) return '-';
  
  const typeMap = {
    'database_backup': 'Database Backup',
    'system_health': 'System Health Check',
    'container_status': 'Container Status',
    'notification': 'Notification',
    'page_cache': 'Page Cache Generation',
    'custom': 'Custom Task'
  };
  
  return typeMap[task.value.type] || task.value.type;
});

// Methods
const loadTask = async () => {
  loading.value = true;
  try {
    const taskData = await DispatcherTaskMethods.getTaskById(taskId.value);
    task.value = taskData;
    logger.debug('[DispatcherTaskView] Task loaded:', taskData);
  } catch (error) {
    logger.error('[DispatcherTaskView] Error loading task:', error);
    // Redirect to tasks list if task not found
    router.push('/dispatcher/tasks');
  } finally {
    loading.value = false;
  }
};

const handleEdit = () => {
  router.push(`/dispatcher/tasks/edit/${taskId.value}`);
};

const handleBack = () => {
  router.push('/dispatcher/tasks');
};

const handleRunTask = async () => {
  if (!task.value) return;
  
  try {
    await DispatcherTaskMethods.runTask(taskId.value);
    logger.debug('[DispatcherTaskView] Task executed:', taskId.value);
    // Reload task to get updated status
    await loadTask();
  } catch (error) {
    logger.error('[DispatcherTaskView] Error running task:', error);
  }
};

const handleToggleActive = async () => {
  if (!task.value) return;
  
  try {
    await DispatcherTaskMethods.updateTask(taskId.value, {
      ...task.value,
      isActive: !task.value.isActive
    });
    
    // Update local state
    task.value.isActive = !task.value.isActive;
    logger.debug('[DispatcherTaskView] Task status updated:', taskId.value);
  } catch (error) {
    logger.error('[DispatcherTaskView] Error updating task status:', error);
  }
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleString();
};

const formatJSON = (data: any) => {
  if (!data) return '{}';
  return JSON.stringify(data, null, 2);
};

// Lifecycle
onMounted(() => {
  loadTask();
});
</script>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 theme-colors-border-accent mx-auto mb-4"></div>
        <p class="text-gray-600">Loading task...</p>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else-if="task">
      <!-- Page Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <h1 class="text-3xl font-bold text-gray-900">{{ task.name }}</h1>
              <dxBadge :variant="statusBadgeVariant">{{ statusText }}</dxBadge>
            </div>
            <p class="text-gray-600">Task ID: {{ task.id }}</p>
          </div>
          <div class="flex gap-3">
            <dxButton
              variant="secondary"
              @click="handleBack"
            >
              <template #prefix>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </template>
              Back to Tasks
            </dxButton>
            <dxButton
              variant="outline"
              @click="handleRunTask"
              :disabled="!task.isActive"
            >
              <template #prefix>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </template>
              Run Now
            </dxButton>
            <dxButton
              variant="primary"
              @click="handleEdit"
            >
              <template #prefix>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </template>
              Edit Task
            </dxButton>
          </div>
        </div>
      </div>

      <!-- Task Information Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Basic Information -->
        <dxCard title="Basic Information" variant="elevated">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
              <p class="text-gray-900">{{ taskTypeDisplay }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div class="flex items-center gap-2">
                <dxBadge :variant="statusBadgeVariant">{{ statusText }}</dxBadge>
                <dxButton
                  variant="ghost"
                  size="sm"
                  @click="handleToggleActive"
                >
                  {{ task.isActive ? 'Disable' : 'Enable' }}
                </dxButton>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Created</label>
              <p class="text-gray-900">{{ formatDateTime(task.createdAt) }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
              <p class="text-gray-900">{{ formatDateTime(task.updatedAt) }}</p>
            </div>
          </div>
        </dxCard>

        <!-- Schedule Information -->
        <dxCard title="Schedule Configuration" variant="elevated">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Schedule Type</label>
              <p class="text-gray-900">{{ scheduleDisplay }}</p>
            </div>
            <div v-if="task.scheduleType === 'interval'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <p class="text-gray-900">{{ task.periodSec }} seconds</p>
            </div>
            <div v-if="task.scheduleType === 'cron'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Cron Expression</label>
              <p class="text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">{{ task.cronExpr }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Last Run</label>
              <p class="text-gray-900">{{ formatDateTime(task.lastRun) }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Next Run</label>
              <p class="text-gray-900">{{ formatDateTime(task.nextRun) }}</p>
            </div>
          </div>
        </dxCard>
      </div>

      <!-- Advanced Options -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Execution Settings -->
        <dxCard title="Execution Settings" variant="elevated">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Timeout</label>
              <p class="text-gray-900">{{ task.timeout ? `${task.timeout} seconds` : 'No timeout' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Max Runs</label>
              <p class="text-gray-900">{{ task.maxRuns || 'Unlimited' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Retry Count</label>
              <p class="text-gray-900">{{ task.retryCount || 0 }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Retry Delay</label>
              <p class="text-gray-900">{{ task.retryDelay || 300 }} seconds</p>
            </div>
          </div>
        </dxCard>

        <!-- Statistics -->
        <dxCard title="Statistics" variant="elevated">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Total Runs</label>
              <p class="text-gray-900">{{ task.runCount || 0 }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Success Count</label>
              <p class="text-gray-900">{{ task.successCount || 0 }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Failure Count</label>
              <p class="text-gray-900">{{ task.failureCount || 0 }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Last Status</label>
              <p class="text-gray-900">{{ task.lastStatus || 'Never run' }}</p>
            </div>
          </div>
        </dxCard>
      </div>

      <!-- Task Configuration Data -->
      <dxCard title="Configuration Data" variant="elevated">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">JSON Configuration</label>
          <pre class="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto"><code>{{ formatJSON(task.data) }}</code></pre>
        </div>
      </dxCard>
    </template>

    <!-- Error State -->
    <div v-else class="text-center py-12">
      <div class="text-gray-500 mb-4">
        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">Task Not Found</h3>
      <p class="text-gray-600 mb-4">The requested task could not be found.</p>
      <dxButton variant="primary" @click="handleBack">
        Back to Tasks
      </dxButton>
    </div>
  </div>
</template>
