<!-- dxModalsContainer.vue -->
<script setup lang="ts">
import { useModals } from '@/shared/composables/useModals'

const { modals, remove } = useModals()

const handleConfirm = (modal: any, value: boolean) => {
  modal.resolve?.(value)
  remove(modal.id)
}

const handleBackdropClick = (event: MouseEvent) => {
  if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
    if (modals.value.length > 0) {
      const modal = modals.value[modals.value.length - 1]
      // Allow closing for view type and non-confirm types
      if (modal.type === 'view' || modal.type !== 'confirm') {
        remove(modal.id)
      }
    }
  }
}

const handleEsc = () => {
  if (modals.value.length > 0) {
    const modal = modals.value[modals.value.length - 1]
    // Allow closing for view type and non-confirm types
    if (modal.type === 'view' || modal.type !== 'confirm') {
      remove(modal.id)
    }
  }
}

const handleModelUpdate = (modal: any, value: any) => {
  if (modal.options.props?.modelValue) {
    // Update the modelValue in the modal's props
    Object.assign(modal.options.props.modelValue, value)
  }
}
</script>

<template>
  <TransitionGroup name="modal">
    <div
      v-for="modal in modals"
      :key="modal.id"
      :class="[
        'fixed inset-0 w-screen h-screen flex items-center justify-center z-[9999] modal-backdrop',
        'theme-components-modal-overlay'
      ]"
      @click="handleBackdropClick"
      tabindex="0"
      @keydown.esc="handleEsc"
    >
      <div
        :class="[
          'flex flex-col w-full rounded-xl shadow-2xl mx-4 opacity-100',
          'theme-components-modal-container',
          'theme-colors-border-primary',
          modal.options.maxWidth === 'sm' ? 'max-w-sm' :
          modal.options.maxWidth === 'md' ? 'max-w-md' :
          modal.options.maxWidth === 'lg' ? 'max-w-lg' :
          modal.options.maxWidth === 'xl' ? 'max-w-xl' :
          modal.options.maxWidth === '2xl' ? 'max-w-2xl' :
          modal.options.maxWidth === '3xl' ? 'max-w-3xl' 
          : 'max-w-md'
        ]"
      >
        <div :class="['theme-components-modal-header', 'flex items-center justify-between']">
          <div class="flex items-center">
            <div
              v-if="modal.type === 'error'"
              :class="[
                'w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0',
                'theme-colors-background-error' || 'theme-colors-background-error0 bg-opacity-20'
              ]"
            >
              <dxIcon name="ri:close-line" :class="['theme-colors-text-error' || 'theme-colors-text-error', 'w-6 h-6']" />
            </div>
            <div
              v-else-if="modal.type === 'success'"
              :class="[
                'w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0',
                'theme-colors-background-success' || 'theme-colors-background-success bg-opacity-20'
              ]"
            >
              <dxIcon name="ri:check-line" :class="['theme-colors-text-success' || 'theme-colors-text-success', 'w-6 h-6']" />
            </div>
            <div
              v-else-if="modal.type === 'confirm'"
              :class="[
                'w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0',
                'theme-colors-background-warning' || 'theme-colors-background-warning bg-opacity-20'
              ]"
            >
              <dxIcon name="ri:question-line" :class="['theme-colors-text-warning' || 'theme-colors-text-warning', 'w-6 h-6']" />
            </div>
            <span :class="[
              'theme-typography-size-lg' || 'text-lg',
              'theme-typography-weight-medium' || 'font-medium',
              'theme-colors-text-primary' || 'text-neutral-100'
            ]">
              {{ modal.options.title }}
            </span>
          </div>
          <!-- Close button for view type -->
          <button
            v-if="modal.type === 'view'"
            @click="remove(modal.id)"
            :class="['theme-colors-text-secondary', 'hover:opacity-80', 'p-1']"
          >
            <dxIcon name="ri:close-line" class="w-5 h-5" />
          </button>
        </div>
        
        <div :class="['theme-components-modal-content', 'pb-4']">
          <component
            v-if="modal.options.component"
            :is="modal.options.component"
            v-bind="modal.options.props || {}"
            @update:modelValue="(value) => handleModelUpdate(modal, value)"
            @close="remove(modal.id)"
            @submit="modal.options.props?.onSubmit?.()"
          />
          <p v-else v-html="modal.message" :class="['theme-colors-text-secondary' || 'text-neutral-300', 'theme-typography-size-base' || 'text-base']">
          </p>
        </div>
        
        <div v-if="modal.type !== 'view'" :class="['theme-components-modal-footer', 'flex justify-end gap-2']">
          <template v-if="modal.type === 'confirm' || modal.type === 'custom'">
            <dxButton
              v-if="modal.options.cancelText"
              @click="handleConfirm(modal, false)"
              variant="secondary"
              class="py-2.5 px-4"
            >
              {{ modal.options.cancelText }}
            </dxButton>
            <dxButton
              @click="handleConfirm(modal, true)"
              :variant="modal.options.variant || (modal.type === 'custom' ? 'primary' : 'warning')"
              class="py-2.5 px-4"
            >
              {{ modal.options.confirmText }}
            </dxButton>
          </template>
          <template v-else>
            <dxButton
              @click="remove(modal.id)"
              :variant="modal.type === 'success' ? 'primary' : modal.type === 'error' ? 'danger' : 'primary'"
              class="py-2.5 px-5 min-w-28"
            >
              OK
            </dxButton>
          </template>
        </div>
      </div>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>