<script setup lang="ts">

interface Props {
  modelValue?: string | Date | null
  placeholder?: string
  label?: string
  disabled?: boolean
  error?: boolean | string
  required?: boolean
  helperText?: string
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
  autofocus?: boolean
  name?: string
  min?: string
  max?: string
  labelPosition?: 'top' | 'left' | 'floating'
  noGutters?: boolean
  width?: string
  customClass?: string
  showTime?: boolean
  showCalendar?: boolean 
  showScheduledNotice?: boolean
  openOnMount?: boolean
  dropdown?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  placeholder: '',
  disabled: false,
  error: false,
  required: false,
  size: 'md',
  readonly: false,
  autofocus: false,
  labelPosition: 'floating',
  noGutters: false,
  customClass: '',
  showTime: false,
  showCalendar: false,
  showScheduledNotice: false,
  openOnMount: false
  ,
  dropdown: true
})

const emit = defineEmits([
  'update:modelValue',
  'focus',
  'blur',
  'input'
])

const inputRef = ref<HTMLInputElement>()
const wrapperRef = ref<HTMLElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const popoverStyles = ref<Record<string, string>>({ position: 'fixed', top: '0px', left: '0px', width: '0px', zIndex: '9999' })
const isFocused = ref(false)
const validationError = ref<string | boolean>(false)


const currentDate = ref(new Date())
const selectedTime = ref('09:00')

const inputType = computed(() => props.showTime ? 'datetime-local' : 'date')

const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

const normalizeDateTime = (value: string | Date | null): string | null => {
  if (!value) return null
  
  try {
    let date: Date
    
    if (value instanceof Date) {
      date = value
    } else if (typeof value === 'string') {
      if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        date = new Date(value + ':00.000Z')
      } else if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Date-only string
        const [y, m, d] = value.split('-').map(Number)
        date = new Date(y, (m as number) - 1, d as number)
      } else {
        date = new Date(value)
      }
    } else {
      return null
    }
    
    if (isNaN(date.getTime())) return null

    // Emit format depends on showTime: ISO when true; date-only when false
    return props.showTime ? date.toISOString() : formatDateLocal(date)
  } catch (e) {
    console.error('Date normalization error:', e)
    return null
  }
}

const formatForInput = (value: string | Date | null): string => {
  if (!value) return ''
  
  try {
    const date = value instanceof Date ? value : new Date(value)
    if (isNaN(date.getTime())) return ''
    
    if (props.showTime) {
      // Use ISO minutes for datetime-local input
      return date.toISOString().slice(0, 16)
    }
    // For date-only input, return local YYYY-MM-DD
    return formatDateLocal(date)
  } catch (e) {
    return ''
  }
}

const inputValue = computed(() => formatForInput(props.modelValue))

const shouldFloatLabel = computed(() => {
  return isFocused.value || (props.modelValue != null && props.modelValue !== '')
})


const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December']

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const currentMonth = computed(() => monthNames[currentDate.value.getMonth()])
const currentYear = computed(() => currentDate.value.getFullYear())

const selectedDate = computed(() => {
  if (!props.modelValue) return null
  return props.modelValue instanceof Date ? props.modelValue : new Date(props.modelValue)
})

const formattedSelectedDate = computed(() => {
  if (!selectedDate.value) return ''
  const date = selectedDate.value
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  
  if (props.showTime) {
    return `${day}.${month}.${year} ${hours}:${minutes}`
  }
  return `${day}.${month}.${year}`
})

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  
  let startDay = firstDay.getDay()
  startDay = startDay === 0 ? 6 : startDay - 1 
  
  const days = []
  
  
  for (let i = 0; i < startDay; i++) {
    days.push(null)
  }
  
  
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day)
  }
  
  return days
})

const isToday = (day: number | null) => {
  if (!day) return false
  const today = new Date()
  return day === today.getDate() && 
         currentDate.value.getMonth() === today.getMonth() && 
         currentDate.value.getFullYear() === today.getFullYear()
}

const isSelected = (day: number | null) => {
  if (!day || !selectedDate.value) return false
  return day === selectedDate.value.getDate() && 
         currentDate.value.getMonth() === selectedDate.value.getMonth() && 
         currentDate.value.getFullYear() === selectedDate.value.getFullYear()
}

const isScheduled = (day: number | null) => {
  if (!day) return false
  // : 21    
  return day === 21
}

const previousMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

const nextMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

const selectDay = (day: number | null) => {
  if (!day || props.disabled || props.readonly) return
  
  const newDate = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), day)
  
  if (props.showTime) {
    const [hours, minutes] = selectedTime.value.split(':')
    newDate.setHours(parseInt(hours), parseInt(minutes))
  }
  
  const normalizedValue = normalizeDateTime(newDate)
  emit('update:modelValue', normalizedValue)
  // Close dropdown after selection
  isOpen.value = false
}

const handleTimeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  selectedTime.value = target.value
  
  if (selectedDate.value) {
    const newDate = new Date(selectedDate.value)
    const [hours, minutes] = target.value.split(':')
    newDate.setHours(parseInt(hours), parseInt(minutes))
    
    const normalizedValue = normalizeDateTime(newDate)
    emit('update:modelValue', normalizedValue)
  }
}

const validate = () => {
  if (props.required && !props.modelValue) {
    validationError.value = `${props.label || 'Field'} is required`
    return false
  }
  validationError.value = false
  return true
}

const showError = computed(() => {
  return props.error || validationError.value
})

const errorMessage = computed(() => {
  if (typeof props.error === 'string') return props.error
  if (typeof validationError.value === 'string') return validationError.value
  return ''
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value
  
  if (!value) {
    emit('update:modelValue', null)
  } else {
    const normalizedValue = normalizeDateTime(value)
    emit('update:modelValue', normalizedValue)
  }
  
  emit('input', event)
}

const handleFocus = (event: FocusEvent) => {
  isFocused.value = true
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  isFocused.value = false
  emit('blur', event)
  validate()
}

const sizeClasses = computed(() => {
  const classes: Record<string, string> = {
    sm: 'h-8 text-sm py-1.5',
    md: 'h-10 text-sm py-2',
    lg: 'h-12 text-base py-3'
  }
  return classes[props.size || 'md']
})

const registerFormElement = inject<((arg: { validate: () => boolean; name: string }) => void) | null>('registerFormElement', null)

const updatePopoverPosition = () => {
  if (!isOpen.value || !inputRef.value) return
  const rect = inputRef.value.getBoundingClientRect()
  const initialTop = rect.bottom
  const left = rect.left
  const width = rect.width
  popoverStyles.value = {
    position: 'fixed',
    top: `${initialTop}px`,
    left: `${left}px`,
    minWidth: `${width}px`,
    zIndex: '9999'
  }

  // After next paint, check for overflow and flip if needed
  nextTick(() => {
    const pop = popoverRef.value
    if (!pop) return
    const popRect = pop.getBoundingClientRect()
    const margin = 8
    if (popRect.bottom > window.innerHeight - margin) {
      const newTop = Math.max(margin, rect.top - popRect.height - margin)
      popoverStyles.value.top = `${newTop}px`
    }
  })
}

const toggleOpen = () => {
  if (props.disabled || props.readonly) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    updatePopoverPosition()
  }
}

onMounted(() => {
  const onDocClick = (e: MouseEvent) => {
    if (!isOpen.value) return
    const target = e.target as Node
    const clickedInsideWrapper = !!(wrapperRef.value && wrapperRef.value.contains(target))
    const clickedInsidePopover = !!(popoverRef.value && popoverRef.value.contains(target as Node))
    if (!clickedInsideWrapper && !clickedInsidePopover) {
      isOpen.value = false
    }
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') isOpen.value = false
  }
  const onResize = () => updatePopoverPosition()
  const onScroll = () => updatePopoverPosition()
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', onResize)
  window.addEventListener('scroll', onScroll, true)
  // Store listeners for cleanup
  ;(onMounted as any)._dx_dt_listeners = { onDocClick, onKeyDown, onResize, onScroll }
  if (registerFormElement) {
    registerFormElement({ 
      validate, 
      name: props.name || props.label || `datetime-${Date.now()}` 
    })
  }
  
  if (props.autofocus) {
    inputRef.value?.focus()
  }

  //    modelValue
  if (props.modelValue && props.showTime) {
    const date = props.modelValue instanceof Date ? props.modelValue : new Date(props.modelValue)
    if (!isNaN(date.getTime())) {
      selectedTime.value = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
      currentDate.value = new Date(date.getFullYear(), date.getMonth(), 1)
    }
  }

  // Open dropdown on mount if requested
  if (props.showCalendar && props.openOnMount) {
    isOpen.value = true
    updatePopoverPosition()
  }
})

onBeforeUnmount(() => {
  const listeners = (onMounted as any)._dx_dt_listeners as { onDocClick: any; onKeyDown: any; onResize: any; onScroll: any } | undefined
  if (listeners) {
    document.removeEventListener('mousedown', listeners.onDocClick)
    document.removeEventListener('keydown', listeners.onKeyDown)
    window.removeEventListener('resize', listeners.onResize)
    window.removeEventListener('scroll', listeners.onScroll, true)
  }
})

watch(() => props.modelValue, (newValue) => {
  if (newValue && props.showTime) {
    const date = newValue instanceof Date ? newValue : new Date(newValue);
    if (!isNaN(date.getTime())) {
      selectedTime.value = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      currentDate.value = new Date(date.getFullYear(), date.getMonth(), date.getDate()); // Set to the selected day's month and year
    }
  } else if (!newValue) {
    // Reset current date and selected time if modelValue becomes null
    currentDate.value = new Date();
    selectedTime.value = '09:00';
  }
}, { immediate: true }); // Immediate to set initial state

defineExpose({ 
  validate, 
  focus: () => inputRef.value?.focus() 
})
</script>

<template>
  <div
    ref="wrapperRef"
    :class="[
      labelPosition === 'left' ? 'flex items-center gap-4' : '',
      !props.noGutters ? 'mb-4' : '',
      width,
      customClass
    ]"
  >
    <!-- Non-floating Label -->
    <label
      v-if="label && labelPosition !== 'floating'"
      :class="[
        labelPosition === 'top'
          ? 'theme-components-input-label block mb-1'
          : 'theme-components-input-label min-w-[100px] flex items-center m-0',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        showError ? 'theme-colors-text-error' : ''
      ]"
    >
      {{ label }}
      <span v-if="required" :class="'theme-colors-text-error'">*</span>
    </label>

    <div class="flex-1">
      <!--   -->
      <div v-if="showCalendar" class="space-y-3 relative">
        <!--       -->
        <div class="relative">
          <input
            ref="inputRef"
            type="text"
            :value="formattedSelectedDate"
            :placeholder="labelPosition === 'floating' ? '' : (placeholder || 'Select date')"
            :disabled="disabled"
            :required="required"
            readonly
            :name="name"
            :class="[
              'theme-components-input-base',
              'theme-components-input-field',
              sizeClasses,
              showError && 'theme-components-input-states-error',
              disabled && 'theme-components-input-states-disabled',
              'cursor-pointer'
            ]"
            @click="dropdown ? toggleOpen() : null"
            @focus="handleFocus"
            @blur="handleBlur"
          />

          <!-- Floating Label -->
          <label
            v-if="label && labelPosition === 'floating'"
            :class="[
              'absolute transition-all duration-200 pointer-events-none origin-[0] bg-inherit px-1 py-[1px] rounded-sm text-xs font-medium',
              disabled ? 'opacity-50' : '',
              showError ? 'theme-colors-text-error' : '',
              'theme-colors-text-tertiary'
            ]"
            :style="shouldFloatLabel || formattedSelectedDate
              ? { top: '2px', transform: 'scale(0.75) translateY(-4px)', left: '0.75rem' }
              : { top: '50%', transform: 'translateY(-50%)', left: '0.75rem' }"
          >
            {{ label }}
            <span v-if="required" :class="'theme-colors-text-error'">*</span>
          </label>
        </div>

        <!-- Inline calendar (non-dropdown) -->
        <div v-if="!dropdown" :class="'theme-components-datetime-container'">
          <!-- Calendar header -->
          <div :class="'theme-components-datetime-header'">
            <button 
              @click="previousMonth"
              :disabled="disabled"
              :class="'theme-components-datetime-navButton'"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
            
            <h3 :class="'theme-components-datetime-title'">
              {{ currentMonth }} {{ currentYear }}
            </h3>
            
            <button 
              @click="nextMonth"
              :disabled="disabled"
              :class="'theme-components-datetime-navButton'"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <!--   -->
          <div :class="['theme-components-datetime-calendarGrid', 'text-center mb-2']">
            <div 
              v-for="day in dayNames" 
              :key="day"
              :class="['theme-components-datetime-weekday']"
            >
              {{ day }}
            </div>
          </div>
          

          <div :class="'theme-components-datetime-calendarGrid'">
            <div 
              v-for="(day, index) in calendarDays" 
              :key="index"
              class="h-6 flex items-center justify-center"
            >
              <button
                v-if="day"
                @click="selectDay(day)"
                :disabled="disabled"
                :class="[
                  'theme-components-datetime-day-base',
                  {
                    ['theme-components-datetime-day-selected']: isSelected(day),
                    ['theme-components-datetime-day-default']: !isSelected(day) && !disabled,
                    ['theme-components-datetime-day-scheduled']: isScheduled(day) && !isSelected(day),
                    ['theme-components-datetime-day-today']: isToday(day) && !isSelected(day),
                    ['theme-components-datetime-day-disabled']: disabled
                  }
                ]"
              >
                {{ day }}
              </button>
            </div>
          </div>
          
          <!-- Time selection -->
          <div v-if="showTime" :class="'theme-components-datetime-time-wrapper'">
            <div class="flex items-center gap-2">
              <span :class="'theme-components-datetime-time-label'">Time:</span>
              <select 
                :value="selectedTime"
                @change="handleTimeChange"
                :disabled="disabled"
                :class="'theme-components-datetime-time-select'"
              >
                <option v-for="hour in 24" :key="hour-1" :value="`${(hour-1).toString().padStart(2, '0')}:00`">
                  {{ (hour-1).toString().padStart(2, '0') }}:00
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Calendar Dropdown via Teleport to avoid parent scroll clipping -->
        <teleport to="body">
          <div v-if="dropdown && isOpen" ref="popoverRef" class="theme-components-datetime-container min-w-[280px]" :style="popoverStyles">
            <!-- Calendar header -->
            <div :class="'theme-components-datetime-header'">
              <button 
                @click="previousMonth"
                :disabled="disabled"
                :class="'theme-components-datetime-navButton'"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </button>
              
              <h3 :class="'theme-components-datetime-title'">
                {{ currentMonth }} {{ currentYear }}
              </h3>
              
              <button 
                @click="nextMonth"
                :disabled="disabled"
                :class="'theme-components-datetime-navButton'"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>

            <!--   -->
            <div :class="['theme-components-datetime-calendarGrid', 'text-center mb-2']">
              <div 
                v-for="day in dayNames" 
                :key="day"
                :class="['theme-components-datetime-weekday']"
              >
                {{ day }}
              </div>
            </div>

            <div :class="'theme-components-datetime-calendarGrid'">
              <div 
                v-for="(day, index) in calendarDays" 
                :key="index"
                class="h-6 flex items-center justify-center"
              >
                <button
                  v-if="day"
                  @click="selectDay(day)"
                  :disabled="disabled"
                  :class="[
                    'theme-components-datetime-day-base',
                    {
                      ['theme-components-datetime-day-selected']: isSelected(day),
                      ['theme-components-datetime-day-default']: !isSelected(day) && !disabled,
                      ['theme-components-datetime-day-scheduled']: isScheduled(day) && !isSelected(day),
                      ['theme-components-datetime-day-today']: isToday(day) && !isSelected(day),
                      ['theme-components-datetime-day-disabled']: disabled
                    }
                  ]"
                >
                  {{ day }}
                </button>
              </div>
            </div>

            <!-- Time selection -->
            <div v-if="showTime" :class="'theme-components-datetime-time-wrapper'">
              <div class="flex items-center gap-2">
                <span :class="'theme-components-datetime-time-label'">Time:</span>
                <select 
                  :value="selectedTime"
                  @change="handleTimeChange"
                  :disabled="disabled"
                  :class="'theme-components-datetime-time-select'"
                >
                  <option v-for="hour in 24" :key="hour-1" :value="`${(hour-1).toString().padStart(2, '0')}:00`">
                    {{ (hour-1).toString().padStart(2, '0') }}:00
                  </option>
                </select>
              </div>
            </div>
          </div>
        </teleport>
        
        <!-- Scheduled date notification (optional) -->
        <div v-if="showScheduledNotice && formattedSelectedDate" :class="'theme-components-datetime-scheduledNotice'">
          📅 Scheduled for {{ formattedSelectedDate }}
        </div>
      </div>


      <div v-else class="relative">
        <input
          ref="inputRef"
          :type="inputType"
          :value="inputValue"
          :placeholder="labelPosition === 'floating' ? ' ' : placeholder"
          :disabled="disabled"
          :required="required"
          :readonly="readonly"
          :name="name"
          :min="min"
          :max="max"
          :autofocus="autofocus"
          :class="[
            'theme-components-input-base',
            'theme-components-input-field',
            sizeClasses,
            isFocused && 'theme-components-input-states-focus',
            showError && 'theme-components-input-states-error',
            disabled && 'theme-components-input-states-disabled',
            showError && 'error',
          ]"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
        />

        <!-- Floating Label -->
        <label
          v-if="label && labelPosition === 'floating'"
          :class="[
            'absolute transition-all duration-200 pointer-events-none origin-[0] bg-inherit px-1 py-[1px] rounded-sm text-xs font-medium',
            disabled ? 'opacity-50' : '',
            showError ? 'theme-colors-text-error' : '',
            'theme-colors-text-tertiary'
          ]"
          :style="shouldFloatLabel
            ? { top: '2px', transform: 'scale(0.75) translateY(-4px)', left: '0.75rem' }
            : { top: '50%', transform: 'translateY(-50%)', left: '0.75rem' }"
        >
          {{ label }}
          <span v-if="required" :class="'theme-colors-text-error'">*</span>
        </label>
      </div>

      <!-- Helper/Error Text -->
      <div
        v-if="helperText || errorMessage"
        :class="[
          'theme-components-input-helper',
          errorMessage ? 'theme-colors-text-error' : ''
        ]"
      >
        {{ errorMessage || helperText }}
      </div>
    </div>
  </div>
</template>

<style scoped>
label {
  transition: all 0.2s ease;
}

input[type="datetime-local"]::-webkit-calendar-picker-indicator,
input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

input[type="datetime-local"]::-webkit-calendar-picker-indicator:hover,
input[type="date"]::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
}

button:disabled {
  cursor: not-allowed;
}
</style>
