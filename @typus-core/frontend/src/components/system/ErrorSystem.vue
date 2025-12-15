<route lang="json">
  {
    "name": "SystemError",
    "meta": {
      "layout": "public",
      "title": "System Error",
      "subject": "system"
    }
  }
  </route>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { errorHandler } from '@/core/errors/handler'
  import { errorConfig, type RecoveryActionId } from '@/core/errors/config' // Import RecoveryActionId
  
  
  const errorData = ref<any>(null)
  const showDetails = ref(errorConfig.logStackTraces !== 'none')
  
  // Correctly type actionId as RecoveryActionId
  function handleAction(actionId: RecoveryActionId) {
    errorHandler.executeRecoveryAction(actionId)
  }
  
  onMounted(() => {
    if (window.history.state && window.history.state.error) {
      errorData.value = window.history.state.error
    }
  })
  </script>
  
  <template>
    <SystemPage
      :code="errorData?.severity?.toUpperCase() || 'ERROR'"
      :title="errorData?.message || 'Error Occurred'"
      :message="errorData?.details || 'We are sorry, we already know about this issue and are working on it.'"
      :showBackButton="true"
      variant="error"
      :fluid="true"
    >
      <template #actions>
        <button
          v-for="action in (errorData?.actions || []) as RecoveryActionId[]"
          :key="action"
          class="px-4 py-2 rounded mr-2 transition-all duration-200"
          :style="{
            backgroundColor: 'theme-colors-background-error',
            color: 'theme-colors-text-contrast'
          }"
          @click="handleAction(action)"
          @mouseover="e => (e.target as HTMLElement).style.backgroundColor = 'theme-colors-background-errorHover'"
          @mouseleave="e => (e.target as HTMLElement).style.backgroundColor = 'theme-colors-background-error'"
        >
          {{ action }}
        </button>
      </template>
  
      <div
        v-if="showDetails"
        class="mt-4 text-xs whitespace-pre-wrap"
        :style="{
          color: 'theme-colors-text-tertiary'
        }"
      >
        {{ errorData?.details }}
      </div>
    </SystemPage>
  </template>
