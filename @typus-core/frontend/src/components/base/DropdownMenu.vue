<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useToggle, onClickOutside } from '@vueuse/core'
import { useBreakpoint } from '@/shared/composables/useBreakpoint'

type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

interface Props {
  modelValue?: boolean
  width?: string
  position?: Position
  menuClass?: string | string[]
  closeOnClickInside?: boolean
  isFixedPosition?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  width: 'w-48',
  position: 'bottom-right',
  menuClass: '',
  closeOnClickInside: true,
  isFixedPosition: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { isMobile } = useBreakpoint()
const triggerRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)

const menuStyles = ref<Record<string, string>>({})

const [internalIsOpen, toggleInternal] = useToggle(false)

const isOpen = computed({
  get: () => (props.modelValue === undefined ? internalIsOpen.value : props.modelValue),
  set: (value) => {
    if (props.modelValue === undefined) {
      internalIsOpen.value = value
    } else {
      emit('update:modelValue', value)
    }
  }
})

// Get menu width from Tailwind class or actual element
const getMenuWidth = () => {
  if (dropdownRef.value?.offsetWidth) {
    return dropdownRef.value.offsetWidth
  }
  
  // Fallback: parse Tailwind width classes
  const widthClass = props.width
  const widthMap: Record<string, number> = {
    'w-32': 128, 'w-36': 144, 'w-40': 160, 'w-44': 176,
    'w-48': 192, 'w-52': 208, 'w-56': 224, 'w-60': 240,
    'w-64': 256, 'w-72': 288, 'w-80': 320, 'w-96': 384
  }
  
  return widthMap[widthClass] || 192 // Default to w-48
}

const updateMenuPosition = () => {
  if (!isOpen.value || !triggerRef.value) return

  const rect = triggerRef.value.getBoundingClientRect()
  const menuWidth = getMenuWidth()
  const menuHeight = dropdownRef.value?.offsetHeight || 200
  const padding = 16 // Minimum edge padding

  // Menu is always positioned fixed (see template), so use viewport-relative coordinates
  const shouldPositionAbove = props.position.startsWith('top-')

  // Calculate positions (always use fixed positioning logic)
  let top: number
  let left = rect.left

  if (shouldPositionAbove) {
    // Position above trigger
    top = rect.top - menuHeight - 8
  } else {
    // Position below trigger
    top = rect.bottom + 8
  }

  // Horizontal positioning with edge detection
  const maxLeft = window.innerWidth - menuWidth - padding
  const minLeft = padding

  if (isMobile.value || left + menuWidth > window.innerWidth - padding) {
    // On mobile or overflow: position from right edge of trigger
    left = rect.right - menuWidth
  }

  // Final bounds check - clamp to viewport edges
  left = Math.max(minLeft, Math.min(maxLeft, left))

  // Vertical positioning - check if menu fits in viewport
  const viewportHeight = window.innerHeight
  const maxTop = viewportHeight - menuHeight - padding
  const minTop = padding

  // If positioned below and doesn't fit, try above
  if (!shouldPositionAbove && top + menuHeight > viewportHeight - padding) {
    top = rect.top - menuHeight - 8
  }

  // If positioned above and doesn't fit, try below
  if (shouldPositionAbove && top < minTop) {
    top = rect.bottom + 8
  }

  // Final clamp to viewport
  top = Math.max(minTop, Math.min(maxTop, top))

  menuStyles.value = {
    top: `${Math.max(0, top)}px`,
    left: `${left}px`,
    maxWidth: `${window.innerWidth - 32}px` // Ensure menu never exceeds viewport
  }
}

const toggleDropdown = () => {
  if (props.modelValue === undefined) {
    toggleInternal()
  } else {
    emit('update:modelValue', !props.modelValue)
  }

  // Update position after DOM update
  setTimeout(updateMenuPosition, 0)
}

onMounted(() => {
  window.addEventListener('scroll', updateMenuPosition, true)
  window.addEventListener('resize', updateMenuPosition)
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateMenuPosition, true)
  window.removeEventListener('resize', updateMenuPosition)
})

const closeDropdown = () => {
  if (isOpen.value) {
    isOpen.value = false
  }
}

onClickOutside(
  dropdownRef,
  (event) => {
    const target = event.target as HTMLElement
    const isTriggerClick = triggerRef.value?.contains(target)

    // Don't close if click is within trigger element
    if (isTriggerClick) {
      return
    }

    closeDropdown()
  },
  { ignore: [triggerRef] }
)

watch(isOpen, (newValue) => {
  if (newValue) {
    // Multiple position updates to handle async rendering
    setTimeout(updateMenuPosition, 0)
    setTimeout(updateMenuPosition, 50)
    setTimeout(updateMenuPosition, 100)
  }
})

const positionClasses = computed(() => {
  switch (props.position) {
    case 'bottom-left':
      return 'origin-top-left left-0'
    case 'top-right':
      return 'origin-bottom-right bottom-full right-0 mb-2'
    case 'top-left':
      return 'origin-bottom-left bottom-full left-0 mb-2'
    case 'bottom-right':
    default:
      return 'origin-top-right right-0'
  }
})

const handleMenuClick = (event: MouseEvent) => {
  if (props.closeOnClickInside) {
    const target = event.target as HTMLElement
    if (target.closest('button, a')) {
      closeDropdown()
    }
  }
}
</script>

<template>
  <div :class="['relative inline-block text-left w-full']">
    <div ref="triggerRef" @click="toggleDropdown">
      <slot name="trigger"></slot>
    </div>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <teleport to="body">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          :class="[
            'fixed z-[9999] pointer-events-auto shadow-md border',
            'theme-colors-background-secondary',
            'theme-colors-border-primary',
            'theme-layout-radius',
            props.width,
            props.menuClass
          ]"
          :style="menuStyles"
          @click="handleMenuClick"
        >
          <slot></slot>
        </div>
      </teleport>
    </Transition>
    
    <!-- Removed backdrop as it blocks clicks on other dropdown triggers.
         onClickOutside handles closing the menu when clicking outside. -->
  </div>
</template>