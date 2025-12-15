<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
    <div class="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
      <h2 class="text-xl font-bold mb-2" :class="severityClass">{{ modalData?.severity?.toUpperCase() || 'ERROR' }}</h2>
      <p class="mb-4">{{ modalData?.message }}</p>
      <div v-if="modalData?.details" class="mb-4 text-xs text-gray-500 whitespace-pre-wrap">
        {{ modalData.details }}
      </div>
      <div class="flex flex-row gap-2 justify-end">
        <button
          v-for="action in modalData?.actions || []"
          :key="action"
          class="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
          @click="handleAction(action as RecoveryActionId)"
        >
          {{ action }}
        </button>
        <button class="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400" @click="closeErrorModal">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useErrorModal } from '@/core/errors/useErrorModal'
import type { RecoveryActionId } from '@/core/errors/config'

const { isOpen, modalData, closeErrorModal, handleAction } = useErrorModal()

const severityClass = computed(() => {
  switch (modalData.value?.severity) {
    case 'critical': return 'theme-colors-text-error'
    case 'warning': return 'theme-colors-text-warning'
    case 'info': return 'theme-colors-text-info'
    default: return 'text-gray-800'
  }
})
</script>
