<template>
  <div class="p-4">
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <!-- Status Filters -->
      <div class="flex flex-wrap gap-2">
        <dx-button
          v-for="config in statusConfigs"
          :key="config.key"
          :variant="selectedStatus === config.key ? 'primary' : 'secondary'"
          size="sm"
          @click="$emit('update-status-filter', config.key)"
          class="min-w-fit"
        >
          <div class="flex items-center gap-2">
            <div
              v-if="config.key !== 'all'"
              class="w-2 h-2 rounded-full"
              :class="config.color"
            ></div>
            {{ config.label }} ({{ config.count }})
          </div>
        </dx-button>
      </div>

      <!-- Controls -->
      <div class="flex items-center gap-2">
        <dx-select
          :model-value="selectedCategory"
          :options="categoryOptions"
          size="md"
          width="w-64"
          :clearable="true"
          :clear-value="'all'"
          @clear="$emit('clear-category')"
          @update:model-value="(value) => $emit('update-category', value as string | number)"
        />

        <dx-select
          :model-value="selectedSort"
          :options="sortOptions"
          size="md"
          width="w-64"
          @update:model-value="(value) => $emit('update-sort', value as string)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import dxButton from '@/components/ui/dxButton.vue'
import dxSelect from '@/components/ui/dxSelect/dxSelect.vue'

// Props
interface Props {
  statusConfigs: any[]
  categoryOptions: any[]
  sortOptions: any[]
  selectedStatus: string
  selectedCategory: string | number
  selectedSort: string
}

defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update-status-filter': [status: string]
  'clear-category': []
  'update-category': [value: string | number]
  'update-sort': [value: string]
}>()
</script>
