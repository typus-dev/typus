<script setup lang="ts">
interface Tab {
  key: string
  label: string
  badge?: number | string
  disabled?: boolean
}

interface Props {
  tabs: Tab[]
  modelValue: string
  variant?: 'underline' | 'pills' | 'buttons'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'underline',
  size: 'md',
  fullWidth: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectTab = (tab: Tab) => {
  if (!tab.disabled) {
    emit('update:modelValue', tab.key)
  }
}

const isActive = (tab: Tab) => props.modelValue === tab.key

const sizeClasses = {
  sm: 'px-3 py-1.5 theme-typography-size-sm',
  md: 'px-4 py-2 theme-typography-size-base',
  lg: 'px-6 py-3 theme-typography-size-lg'
}

const getTabClasses = (tab: Tab) => {
  const base = [
    sizeClasses[props.size],
    'font-medium transition-all duration-200 cursor-pointer',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
  ]

  if (tab.disabled) {
    base.push('opacity-50 cursor-not-allowed')
  }

  if (props.variant === 'underline') {
    base.push('border-b-2 -mb-px')
    if (isActive(tab)) {
      base.push('border-current theme-colors-text-accent')
    } else {
      base.push('border-transparent theme-colors-text-secondary hover:theme-colors-text-primary hover:border-gray-300')
    }
  }

  if (props.variant === 'pills') {
    base.push('rounded-lg')
    if (isActive(tab)) {
      base.push('theme-colors-background-accent theme-colors-text-on-accent')
    } else {
      base.push('theme-colors-text-secondary hover:theme-colors-background-tertiary hover:theme-colors-text-primary')
    }
  }

  if (props.variant === 'buttons') {
    if (isActive(tab)) {
      base.push('theme-colors-background-accent theme-colors-text-on-accent')
    } else {
      base.push('theme-colors-background-secondary theme-colors-text-secondary hover:theme-colors-text-primary')
    }
    // First tab
    if (props.tabs.indexOf(tab) === 0) {
      base.push('rounded-l-lg')
    }
    // Last tab
    if (props.tabs.indexOf(tab) === props.tabs.length - 1) {
      base.push('rounded-r-lg')
    }
  }

  return base
}
</script>

<template>
  <div
    role="tablist"
    :class="[
      'flex',
      variant === 'underline' ? 'border-b theme-colors-border-primary' : 'gap-1',
      fullWidth ? 'w-full' : 'w-fit'
    ]"
  >
    <button
      v-for="tab in tabs"
      :key="tab.key"
      role="tab"
      :aria-selected="isActive(tab)"
      :aria-disabled="tab.disabled"
      :tabindex="tab.disabled ? -1 : 0"
      :class="[
        ...getTabClasses(tab),
        fullWidth ? 'flex-1 justify-center' : ''
      ]"
      class="inline-flex items-center gap-2"
      @click="selectTab(tab)"
    >
      <span>{{ tab.label }}</span>
      <span
        v-if="tab.badge !== undefined"
        :class="[
          'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs',
          isActive(tab)
            ? 'bg-white/20 text-current'
            : 'theme-colors-background-tertiary theme-colors-text-secondary'
        ]"
      >
        {{ tab.badge }}
      </span>
    </button>
  </div>
</template>
