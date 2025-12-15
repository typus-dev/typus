<script setup lang="ts">
import { computed } from 'vue'
import dxCard from './dxCard.vue'
import dxButton from './dxButton.vue'
import dxFlex from '../layout/dxFlex.vue'
import dxIcon from './dxIcon.vue'
import dxText from './dxText.vue'

type FormMode = 'create' | 'edit'
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'warning' | 'ghost' | 'link' | 'info'

interface AdditionalAction {
  label: string
  variant: ButtonVariant
  icon?: string
  action: string
  disabled?: boolean
}

interface Props {
  // Form mode
  mode: FormMode

  // Form title (optional, displayed on the right side of header)
  title?: string

  // Loading and validation states
  loading?: boolean
  disabled?: boolean
  hasErrors?: boolean

  // Button customization
  saveLabel?: string
  cancelLabel?: string
  showCancel?: boolean
  showSave?: boolean
  buttonsPosition?: 'header' | 'footer'

  // Additional action buttons
  additionalActions?: AdditionalAction[]

  // Card customization
  variant?: 'elevated' | 'outlined' | 'flat' | 'gradient' | 'transparent'
  compact?: boolean
  noPadding?: boolean

  // Submit handling
  preventSubmit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
  title: '',
  loading: false,
  disabled: false,
  hasErrors: false,
  saveLabel: '',
  cancelLabel: 'Cancel',
  showCancel: true,
  showSave: true,
  buttonsPosition: 'header',
  additionalActions: () => [],
  variant: 'elevated',
  compact: false,
  noPadding: false,
  preventSubmit: false
})

const emit = defineEmits<{
  save: []
  cancel: []
  action: [actionName: string]
}>()

const computedSaveLabel = computed(() => {
  if (props.saveLabel) return props.saveLabel
  return props.mode === 'create' ? 'Create' : 'Save'
})

const handleSave = () => {
  if (props.disabled || props.loading || props.hasErrors) return
  emit('save')
}

const handleCancel = () => {
  if (props.disabled) return
  emit('cancel')
}

const handleAction = (actionName: string) => {
  if (props.disabled) return
  emit('action', actionName)
}

const handleSubmit = (event: Event) => {
  if (props.preventSubmit) {
    event.preventDefault()
  }
  handleSave()
}
</script>

<template>
  <dxCard
    :variant="variant"
    :noPadding="noPadding"
    class="form-wrapper"
  >
    <!-- Header with action buttons (only show if there's content) -->
    <template v-if="buttonsPosition === 'header' && (showCancel || showSave || additionalActions.length > 0 || title)" #header>
      <div class="border-gray-200 py-3 flex-shrink-0 space-y-4">
        <!-- Title (if provided) -->
        <dxText v-if="title" tag="h3" :text="title" />

        <!-- Buttons row -->
        <dxFlex justify="between" align="center">
          <!-- Left: Cancel + Save buttons -->
          <dxFlex gap="3" align="center">
            <!-- Cancel Button -->
            <dxButton
              v-if="showCancel"
              @click="handleCancel"
              variant="secondary"
              size="sm"
              :disabled="disabled"
              :loading="false"
            >
              <template #prefix="{ iconColor }">
                <dxIcon name="ri:arrow-left-line" size="sm" :class="iconColor" class="mr-1" />
              </template>
              {{ cancelLabel }}
            </dxButton>

            <!-- Save Button -->
            <dxButton
              v-if="showSave"
              @click="handleSave"
              variant="primary"
              size="sm"
              :loading="loading"
              :disabled="disabled || hasErrors"
              type="submit"
            >
              <template #prefix="{ iconColor }">
                <dxIcon name="ri:save-line" size="sm" :class="iconColor" class="mr-1" />
              </template>
              {{ computedSaveLabel }}
            </dxButton>
          </dxFlex>

          <!-- Right: Additional Actions -->
          <dxFlex gap="3" align="center" justify="end">
            <!-- Additional Action Buttons -->
            <dxButton
              v-for="action in additionalActions"
              :key="action.action"
              @click="handleAction(action.action)"
              :variant="action.variant"
              size="sm"
              :disabled="disabled || action.disabled"
            >
              <template v-if="action.icon" #prefix="{ iconColor }">
                <dxIcon :name="action.icon" size="sm" :class="iconColor" class="mr-1" />
              </template>
              {{ action.label }}
            </dxButton>
          </dxFlex>
        </dxFlex>
      </div>
    </template>

    <!-- Main form content -->
    <form @submit.prevent="handleSubmit" class="form-wrapper-content">
      <slot
        :loading="loading"
        :disabled="disabled"
        :hasErrors="hasErrors"
        :mode="mode"
        :handleSave="handleSave"
        :handleCancel="handleCancel"
      />
    </form>

    <!-- Footer -->
    <template #footer>
      <!-- Action buttons (if buttonsPosition='footer') -->
      <div v-if="buttonsPosition === 'footer'" class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
        <dxFlex justify="end" align="center" gap="3">
          <!-- Cancel Button -->
          <dxButton
            v-if="showCancel"
            @click="handleCancel"
            variant="secondary"
            size="sm"
            :disabled="disabled"
            :loading="false"
          >
            {{ cancelLabel }}
          </dxButton>

          <!-- Save Button -->
          <dxButton
            v-if="showSave"
            @click="handleSave"
            variant="primary"
            size="sm"
            :loading="loading"
            :disabled="disabled || hasErrors"
            type="submit"
          >
            {{ computedSaveLabel }}
          </dxButton>
        </dxFlex>
      </div>

      <!-- Custom footer slot (optional) -->
      <slot name="footer" />
    </template>
  </dxCard>
</template>

<style scoped>
.form-wrapper {
  min-height: 0;
}

.form-wrapper-content {
  flex: 1;
  min-height: 0;
}

/* Ensure proper form submission handling */
.form-wrapper-content button[type="submit"] {
  display: none;
}
</style>
