<script setup lang="ts">
import { ref, computed } from 'vue'
import dsxPageRendererWithContext from '@/dsx/components/dsxPageRendererWithContext.vue'
import dxButton from '@/components/ui/dxButton.vue'


const isOpen = ref(false)
const isSubscribed = ref(false)

const openModal = () => {
  isOpen.value = true
  isSubscribed.value = false
}

const closeModal = () => {
  isOpen.value = false
}

const handleSuccess = () => {
  isSubscribed.value = true
  setTimeout(() => {
    closeModal()
  }, 2000)
}

// DSX configuration for newsletter subscription form
const newsletterConfig = computed(() => ({
  title: 'Subscribe to Newsletter',
  contextConfig: {
    
    beforeDataSave: (data: any) => {
      // Add technical fields automatically
      return {
        ...data,
        source: 'main_page',
        ipAddress: '', // Will be filled by backend
        userAgent: navigator.userAgent
      }
    },
    afterDataSave: () => {
      handleSuccess()
    }
  },
  type: 'grid',
  columns: 12,
  blocks: [
    {
      id: 'form',
      colSpan: 12,
      components: [],
      fieldOverrides: {
        email: {
          component: 'dxInput',
          props: {
            placeholder: 'Enter your email address',
            autofocus: true
          }
        },
        name: {
          component: 'dxInput',
          props: {
            placeholder: 'Your name (optional)'
          }
        }
      }
    },
    {
      id: 'actions',
      colSpan: 12,
      components: [
        {
          type: 'dxButton',
          props: {
            label: 'Subscribe',
            variant: 'primary',
            size: 'lg',
            isSubmitButton: true
          }
        },
        {
          type: 'dxButton',
          props: {
            label: 'Cancel',
            variant: 'secondary',
            size: 'lg'
          },
          events: {
            click: closeModal
          }
        }
      ]
    }
  ]
}))

defineExpose({ openModal })
</script>

<template>
  <!-- Trigger Button -->
  <dxButton 
    @click="openModal"
    variant="primary"
    size="lg"
    label="Subscribe to Newsletter"
  />

  <!-- Modal -->
  <div 
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="closeModal"
  >
    <div 
      :class="[
        'theme-components-card-background',
        'theme-components-card-border',
        'theme-components-card-radius',
        'p-6 w-full max-w-md mx-4 relative'
      ]"
    >
      <!-- Close Button -->
      <button 
        @click="closeModal"
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Success Message -->
      <div v-if="isSubscribed" class="text-center py-8">
        <div class="theme-colors-text-success text-6xl mb-4">✓</div>
        <h3 :class="['theme-typography-content-h3', 'theme-colors-text-primary', 'mb-2']">
          You're subscribed!
        </h3>
        <p :class="'theme-colors-text-secondary'">
          Thank you for subscribing to our newsletter.
        </p>
      </div>

      <!-- Subscription Form -->
      <div v-else>
        <h3 :class="['theme-typography-content-h3', 'theme-colors-text-primary', 'mb-4']">
          Subscribe to Newsletter
        </h3>
        <p :class="['theme-colors-text-secondary', 'mb-6']">
          Get the latest updates and news delivered to your inbox.
        </p>
        
        <dsxPageRendererWithContext :config="newsletterConfig" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.z-50 {
  z-index: 50;
}
</style>
