<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

const formatDate = (timestamp: string) => {
  return new Date(timestamp).toLocaleString()
}

const getLevelClass = (level: string) => {
  const classes: { [key: string]: string } = {
    'error': 'px-2 py-1 rounded-full text-xs font-medium theme-colors-text-error theme-colors-background-error',
    'warn': 'px-2 py-1 rounded-full text-xs font-medium theme-colors-text-warning theme-colors-background-warning',
    'info': 'px-2 py-1 rounded-full text-xs font-medium theme-colors-text-info theme-colors-background-info',
    'debug': 'px-2 py-1 rounded-full text-xs font-medium theme-colors-text-primary theme-colors-background-secondary'
  }
  return classes[level?.toLowerCase()] || 'px-2 py-1 rounded-full text-xs font-medium theme-colors-text-tertiary theme-colors-background-tertiary'
}

const formatJSON = (obj: any) => {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span :class="['font-medium', 'theme-colors-text-secondary']">Timestamp:</span>
        <div :class="['mt-1', 'theme-colors-text-primary']">{{ formatDate(item.timestamp) }}</div>
      </div>
      <div>
        <span :class="['font-medium', 'theme-colors-text-secondary']">Level:</span>
        <div class="mt-1">
          <span :class="getLevelClass(item.level)">{{ item.level?.toUpperCase() }}</span>
        </div>
      </div>
      <div>
        <span :class="['font-medium', 'theme-colors-text-secondary']">Source:</span>
        <div :class="['mt-1', 'theme-colors-text-primary']">{{ item.source || 'N/A' }}</div>
      </div>
      <div>
        <span :class="['font-medium', 'theme-colors-text-secondary']">Module:</span>
        <div :class="['mt-1', 'theme-colors-text-primary']">{{ item.module || 'N/A' }}</div>
      </div>
      <div>
        <span :class="['font-medium', 'theme-colors-text-secondary']">Component:</span>
        <div :class="['mt-1', 'theme-colors-text-primary']">{{ item.component || 'N/A' }}</div>
      </div>
      <div>
        <span :class="['font-medium', 'theme-colors-text-secondary']">User ID:</span>
        <div :class="['mt-1', 'theme-colors-text-primary']">{{ item.userId || 'N/A' }}</div>
      </div>
      <div>
        <span :class="['font-medium', 'theme-colors-text-secondary']">IP Address:</span>
        <div :class="['mt-1', 'theme-colors-text-primary']">{{ item.ipAddress || 'N/A' }}</div>
      </div>
      <div>
        <span :class="['font-medium', 'theme-colors-text-secondary']">Log ID:</span>
        <div :class="['mt-1', 'theme-colors-text-primary']">{{ item.id }}</div>
      </div>
    </div>
    
    <div :class="['border-t pt-4', 'theme-colors-border-primary']">
      <dxInput
        label="Message"
        multiline
        rows="4"
        :model-value="item.message || 'No message'"
        readonly
        :class="'theme-colors-text-primary'"
      />
    </div>
    
    <div v-if="item.stack" :class="['border-t pt-4', 'theme-colors-border-primary']">
      <dxInput
        label="Stack Trace"
        multiline
        rows="6"
        :model-value="item.stack"
        readonly
        :class="'theme-colors-text-error'"
      />
    </div>
    
    <div v-if="item.metadata" :class="['border-t pt-4', 'theme-colors-border-primary']">
      <dxInput
        label="Metadata"
        multiline
        rows="4"
        :model-value="formatJSON(item.metadata)"
        readonly
        :class="'theme-colors-text-primary'"
      />
    </div>
  </div>
</template>