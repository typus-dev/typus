<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue'
import { themeClass } from '@/shared/utils/themeClass'

const combineClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(' ')

interface Option {
  label: string
  value: string | number
}

// eslint-disable-next-line no-unused-vars
type RemoteMethod = (value: string) => Promise<void> | void

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | (string | number)[] | null
    options: Option[]
    multiple?: boolean
    placeholder?: string
    helperText?: string
    filterable?: boolean
    loading?: boolean
    error?: string | boolean
    disabled?: boolean
    label?: string
    labelPosition?: 'top' | 'left' | 'floating'
    required?: boolean
    width?: string
    size?: 'sm' | 'md' | 'lg'
    clearable?: boolean
    customClass?: string
    name?: string
    remote?: boolean
    remoteMethod?: RemoteMethod
    noGutters?: boolean // Add prop for bottom margin control
  }>(),
  {
    modelValue: null,
    multiple: false,
    placeholder: 'Select option',
    helperText: '',
    filterable: false,
    loading: false,
    error: false,
    disabled: false,
    label: '',
    labelPosition: 'floating',
    required: false,
    width: 'w-full',
    size: 'md',
    clearable: true,
    noGutters: false, // Default to having bottom margin
    customClass: '',
    name: undefined,
    remote: false,
    remoteMethod: undefined,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number | (string | number)[] | null],
  'focus': [event: FocusEvent],
  'blur': [event: FocusEvent],
  'clear': []
}>()

const componentInstanceUid = `dxSelect-${Math.random().toString(36).substring(2, 9)}`;
const baseId = computed(() => props.name || componentInstanceUid);
const dropdownId = computed(() => `${baseId.value}-dropdown`);
const labelId = computed(() => `${baseId.value}-label`);
const getOptionId = (index: number) => `${baseId.value}-option-${index}`;

const selectRef = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const searchQuery = ref('')
const isFocused = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const clickOutsideEnabled = ref(false)
const dropdownPosition = ref<'above' | 'below'>('below')
const highlightedOptionIndex = ref(-1);

const currentOptions = computed(() => {
    return props.remote && asyncOptions.value.length ? asyncOptions.value : props.options;
});

const filteredOptions = computed(() => {
  if (props.remote) return currentOptions.value;
  if (!props.filterable || !searchQuery.value) return props.options
  return props.options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const selectedLabels = computed(() => {
  if (props.multiple && Array.isArray(props.modelValue)) {
    return props.modelValue
      .map(value => props.options.find(opt => opt.value === value)?.label || '')
      .filter(label => label !== '')
  }
  return []
})

const selectedLabel = computed(() => {
  if (!props.multiple) {
    if (props.modelValue === null || props.modelValue === undefined) return '';
    return props.options.find(opt => opt.value === props.modelValue)?.label || ''
  }
  return ''
})

const hasValue = computed(() => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.length > 0
  }
  // Check if there's a selected label (option is selected, even with empty string value)
  return selectedLabel.value !== ''
})

const showError = computed(() => !!props.error || (typeof props.error === 'string' && props.error.length > 0) )

const selectStateClass = computed(() => {
  if (props.disabled) return 'theme-components-input-states-disabled'
  if (showError.value) return 'theme-components-input-states-error'
  return 'theme-components-input-states-default'
})

const selectSizeTokens = {
  sm: {
    font: 'theme-typography-size-sm',
    height: 'var(--control-height-sm, 2.25rem)',
    paddingX: 'var(--spacing-sm, 0.75rem)',
    paddingY: 'var(--spacing-xs, 0.5rem)',
    chipSize: 'xs',
    iconSize: 'xs',
    labelTopFloated: '0.25rem',
    labelTopResting: '0.75rem'
  },
  md: {
    font: 'theme-typography-size-base',
    height: 'var(--control-height-md, 2.75rem)',
    paddingX: 'var(--spacing-md, 1rem)',
    paddingY: 'var(--spacing-sm, 0.75rem)',
    chipSize: 'xs',
    iconSize: 'sm',
    labelTopFloated: '0.5rem',
    labelTopResting: '1rem'
  },
  lg: {
    font: 'theme-typography-size-lg',
    height: 'var(--control-height-lg, 3.25rem)',
    paddingX: 'var(--spacing-lg, 1.25rem)',
    paddingY: 'var(--spacing-md, 1rem)',
    chipSize: 'sm',
    iconSize: 'sm',
    labelTopFloated: '0.75rem',
    labelTopResting: '1.25rem'
  }
} as const

const resolveSizeConfig = (size?: string) => {
  if (size === 'sm' || size === 'lg') {
    return selectSizeTokens[size]
  }
  return selectSizeTokens.md
}

const rawSizeConfig = computed(() => resolveSizeConfig(props.size))
const sizeConfig = computed(() => rawSizeConfig.value || selectSizeTokens.md)
const sizeFontClass = computed(() => sizeConfig.value?.font || selectSizeTokens.md.font)
const sizePaddingX = computed(() => sizeConfig.value?.paddingX || selectSizeTokens.md.paddingX)
const sizePaddingY = computed(() => sizeConfig.value?.paddingY || selectSizeTokens.md.paddingY)
const sizeHeight = computed(() => sizeConfig.value?.height || selectSizeTokens.md.height)

const containerClasses = computed(() => [
  props.width,
  props.labelPosition === 'left' ? 'flex items-start gap-4' : '',
  !props.noGutters ? 'mb-4' : '', // Add conditional bottom margin
  'relative',
  props.customClass
]);

const inputWrapperClasses = computed(() => [
  'flex-1',
  'relative',
  props.width,
])

const selectTriggerClasses = computed(() => [
  'theme-components-input-base',
  sizeFontClass.value,
  'flex items-center justify-between',
  props.disabled ? 'theme-interactions-disabled' : 'cursor-pointer',
  selectStateClass.value,
  isFocused.value && 'theme-components-input-states-focus',
  'theme-colors-text-primary'
])

const triggerInlineStyle = computed(() => ({
  minHeight: sizeHeight.value,
  paddingLeft: sizePaddingX.value,
  paddingRight: sizePaddingX.value,
  paddingTop: sizePaddingY.value,
  paddingBottom: sizePaddingY.value
}))

const labelClasses = computed(() => [
  'theme-components-form-label',
  props.labelPosition === 'left' ? `${sizePaddingY.value} mr-4` : 'mb-1',
  props.disabled ? 'theme-colors-text-disabled' :
  showError.value ? 'theme-colors-text-error' : 'theme-colors-text-secondary'
])

const isLabelFloated = computed(() => hasValue.value || isFocused.value || (props.labelPosition === 'floating' && showError.value))

const floatingLabelClasses = computed(() => [
  'absolute transition-all duration-200 pointer-events-none origin-left z-10 bg-transparent',
  'left-3',
  props.disabled ? 'theme-colors-text-disabled' :
  showError.value ? 'theme-colors-text-error' :
  isFocused.value ? 'theme-colors-text-accent' :
  'theme-colors-text-tertiary',
  isLabelFloated.value ? 'theme-typography-size-xs scale-75' : `${sizeFontClass.value} scale-100`
]);

const floatingLabelStyle = computed(() => ({
  top: isLabelFloated.value
    ? sizeConfig.value?.labelTopFloated || '0.25rem'
    : sizeConfig.value?.labelTopResting || '1rem'
}))

const chipClasses = computed(() => [
  'inline-flex items-center',
  themeClass('components', 'badge', 'size', sizeConfig.value.chipSize),
  'font-medium',
  'theme-colors-background-tertiary',
  'theme-colors-text-primary',
  'px-2 py-0.5',
  'theme-base-radius'
])

const chipRemoveButtonClasses = computed(() => [
    'ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full',
    'theme-mixins-interactive',
    'focus:outline-none'
]);

const chipRemoveIconClasses = computed(() => [
    'theme-icons-size-xs',
    'theme-colors-text-tertiary'
]);

const placeholderClasses = computed(() => [
    'theme-colors-text-tertiary',
    sizeFontClass.value
]);

const filterInputClasses = computed(() => [
    'theme-colors-background-secondary',
    'theme-colors-text-primary',
    sizeFontClass.value,
    'w-full border-none focus:outline-none focus:ring-0',
    'p-0 m-0 bg-transparent'
]);

const clearButtonClasses = computed(() => [
    'inline-flex items-center justify-center rounded-full p-0.5',
    'theme-mixins-interactive',
    'focus:outline-none'
]);

const clearIconClasses = computed(() => [
  themeClass('icons', 'size', sizeConfig.value.iconSize),
  'theme-colors-text-primary',
  'opacity-60 hover:opacity-100',
  'flex-shrink-0'
])

const dropdownArrowIconClasses = computed(() => [
  themeClass('icons', 'size', sizeConfig.value.iconSize),
  'theme-colors-text-primary',
  'opacity-60',
  'flex-shrink-0',
  'transition-transform duration-200',
  { 'transform rotate-180': isOpen.value }
])

const dropdownContainerClasses = computed(() => [
  'absolute left-0 z-50 min-w-full w-max max-w-[400px]',
  'theme-colors-background-secondary',
  'theme-base-radius',
  'border theme-colors-border-secondary',
  'theme-base-shadow',
  'overflow-hidden'
])

const dropdownContentWrapperClasses = computed(() => [
    'dropdown-scroll-container',
    'max-h-[200px] overflow-y-auto p-1',
    'theme-components-scrollbar-width',
    'theme-components-scrollbar-color',
    'theme-components-scrollbar-hover'
]);

const dropdownOptionClasses = computed(() => (isSelected: boolean, isHighlighted: boolean) => [
  'theme-components-select-dropdown-option-base',
  'px-3 py-1.5 cursor-pointer rounded flex items-center',
  'theme-typography-size-sm',
  isHighlighted && 'theme-components-select-dropdown-option-hover',
  isSelected && 'theme-components-select-dropdown-option-selected'
]);

const dropdownCheckboxClasses = (isSelected: boolean) => [
  'mr-2 w-4 h-4 rounded-sm flex-shrink-0 transition-colors duration-150 border',
  isSelected
    ? combineClasses('theme-colors-background-accent', 'theme-colors-border-focus')
    : combineClasses('theme-colors-background-primary', 'theme-colors-border-secondary'),
  'focus:outline-none focus:ring-0 pointer-events-none'
]

const noOptionsClasses = computed(() => [
    'px-4 py-2 text-center',
    'theme-colors-text-tertiary',
    'theme-typography-size-sm'
]);

const helperTextClasses = computed(() => [
    'mt-0.5', // Use a small positive margin again
    'theme-typography-size-xs',
    showError.value ? 'theme-colors-text-error' : 'theme-colors-text-tertiary'
]);

const activeDescendant = computed(() => {
    return isOpen.value && highlightedOptionIndex.value >= 0
        ? getOptionId(highlightedOptionIndex.value)
        : undefined;
});

const handleFocus = (event: FocusEvent) => {
  if(props.disabled) return;
  isFocused.value = true;
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  setTimeout(() => {
      const activeElement = document.activeElement;
      const isFocusInside = selectRef.value?.contains(activeElement) || dropdownRef.value?.contains(activeElement);

      if (!isOpen.value && !isFocusInside) {
          isFocused.value = false;
          searchQuery.value = '';
          highlightedOptionIndex.value = -1;
          emit('blur', event);
      } else if (!isFocusInside) {
           isOpen.value = false;
           isFocused.value = false;
           searchQuery.value = '';
           highlightedOptionIndex.value = -1;
           emit('blur', event);
      }
  }, 0);
}

const openDropdown = () => {
    if (props.disabled || isOpen.value) return;
    isOpen.value = true;
    isFocused.value = true;
    highlightedOptionIndex.value = -1;
    clickOutsideEnabled.value = false;
    setTimeout(() => { clickOutsideEnabled.value = true; }, 100);

    nextTick(() => {
      if (props.filterable && searchInput.value) {
        searchInput.value.focus();
      }
      if (dropdownRef.value && selectRef.value) {
          const rect = selectRef.value.getBoundingClientRect()
          const dropdownHeight = 200
          const viewportHeight = window.innerHeight
          const spaceBelow = viewportHeight - rect.bottom
          const spaceAbove = rect.top
          if (spaceBelow < dropdownHeight + 10 && spaceAbove > spaceBelow && spaceBelow < 150) {
            dropdownPosition.value = 'above'
          } else {
            dropdownPosition.value = 'below'
          }
       }
    });
}

const closeDropdown = (returnFocus = false) => {
    if (!isOpen.value) return;
    isOpen.value = false;
    searchQuery.value = '';
    highlightedOptionIndex.value = -1;
    if (returnFocus) {
         selectRef.value?.focus();
    } else {
         handleBlur(new FocusEvent('blur'));
    }
}

const toggleDropdown = () => {
  if (props.disabled) return;
  if (isOpen.value) {
      closeDropdown(true);
  } else {
      openDropdown();
  }
};

const handleClickOutside = (event: MouseEvent) => {
  if (!clickOutsideEnabled.value || !isOpen.value) return

  const target = event.target as Node
  const isClickInsideSelect = selectRef.value && selectRef.value.contains(target);
  const isClickInsideDropdown = dropdownRef.value && (dropdownRef.value as HTMLElement).contains(target);

  if (!isClickInsideSelect && !isClickInsideDropdown) {
     closeDropdown(false);
  }
}

const isOptionSelected = (value: string | number): boolean => {
    if (props.multiple) {
        return Array.isArray(props.modelValue) && props.modelValue.includes(value);
    }
    return props.modelValue !== null && props.modelValue !== undefined && props.modelValue === value;
}

const handleOptionSelect = (option: Option, index?: number) => {
    if (index !== undefined) {
         highlightedOptionIndex.value = index;
    }

  if (props.multiple) {
    const currentValue = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
    const idx = currentValue.indexOf(option.value);
    if (idx === -1) {
      currentValue.push(option.value);
    } else {
      currentValue.splice(idx, 1);
    }
    emit('update:modelValue', currentValue);
    if (props.filterable && searchInput.value) {
        searchInput.value.focus();
    } else if (selectRef.value) {
       selectRef.value.focus();
    }
  } else {
    emit('update:modelValue', option.value);
    closeDropdown(true);
  }
}

const handleSearchInput = (event: Event) => {
    searchQuery.value = (event.target as HTMLInputElement).value;
    highlightedOptionIndex.value = -1;
    if (props.remote && props.remoteMethod) {
        props.remoteMethod(searchQuery.value);
    }
}

const highlightNextOption = () => {
    if (filteredOptions.value.length === 0) return;
    highlightedOptionIndex.value = (highlightedOptionIndex.value + 1) % filteredOptions.value.length;
    scrollToHighlighted();
}

const highlightPrevOption = () => {
    if (filteredOptions.value.length === 0) return;
    highlightedOptionIndex.value = (highlightedOptionIndex.value - 1 + filteredOptions.value.length) % filteredOptions.value.length;
     scrollToHighlighted();
}

const selectHighlightedOption = () => {
    if (highlightedOptionIndex.value >= 0 && highlightedOptionIndex.value < filteredOptions.value.length) {
        handleOptionSelect(filteredOptions.value[highlightedOptionIndex.value], highlightedOptionIndex.value);
    }
}

const scrollToHighlighted = () => {
    nextTick(() => {
        const list = dropdownRef.value as HTMLElement | null;
        const optionElement = list?.querySelector(`#${getOptionId(highlightedOptionIndex.value)}`) as HTMLElement | null;
        if (list && optionElement) {
            const listRect = list.getBoundingClientRect();
            const optionRect = optionElement.getBoundingClientRect();

             if (optionRect.bottom > listRect.bottom) {
                list.scrollTop += optionRect.bottom - listRect.bottom;
            } else if (optionRect.top < listRect.top) {
                list.scrollTop -= listRect.top - optionRect.top;
            }
        }
    });
}

const handleKeydown = (event: KeyboardEvent) => {
    if(props.disabled) return;

    switch (event.key) {
        case 'Escape':
            if (isOpen.value) {
                event.preventDefault();
                event.stopPropagation();
                closeDropdown(true);
            }
            break;
        case 'Enter':
        case ' ':
            if (isOpen.value) {
                 if(highlightedOptionIndex.value !== -1) {
                     event.preventDefault();
                     selectHighlightedOption();
                 } else if (!props.filterable && !props.multiple && event.key === ' ') {
                      event.preventDefault();
                 } else if (!props.filterable && !props.multiple && event.key === 'Enter') {
                      closeDropdown(true);
                 }
            } else if (isFocused.value) {
                 event.preventDefault();
                 openDropdown();
            }
            break;
        case 'ArrowDown':
             event.preventDefault();
             if (!isOpen.value) {
                 openDropdown();
             } else {
                 highlightNextOption();
             }
            break;
        case 'ArrowUp':
             event.preventDefault();
              if (!isOpen.value) {
                 openDropdown();
             } else {
                 highlightPrevOption();
             }
            break;
        case 'Tab':
            if (isOpen.value) {
                 closeDropdown(false);
            }
            break;
         case 'Home':
             if (isOpen.value) {
                 event.preventDefault();
                 highlightedOptionIndex.value = 0;
                 scrollToHighlighted();
             }
             break;
         case 'End':
              if (isOpen.value) {
                 event.preventDefault();
                 highlightedOptionIndex.value = filteredOptions.value.length - 1;
                 scrollToHighlighted();
             }
             break;
    }
}

const removeSelected = (index: number) => {
  if (props.multiple && Array.isArray(props.modelValue)) {
    const newValue = [...props.modelValue]
    newValue.splice(index, 1)
    emit('update:modelValue', newValue)
    selectRef.value?.focus();
  }
}

 const clearSelection = () => {
    if (props.disabled) return;
    if (props.multiple) {
        emit('update:modelValue', [])
    } else {
        emit('update:modelValue', null)
    }
    searchQuery.value = ''
    emit('clear')
    selectRef.value?.focus();
}

const asyncOptions = ref<Array<{ label: string, value: string }>>([]);

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

</script>

<template>
  <div :class="containerClasses">
     <label
      v-if="label && labelPosition !== 'floating'"
      :class="labelClasses"
      :for="baseId"
      @click="selectRef?.focus()"
    >
      {{ label }}
      <span v-if="required" :class="'theme-colors-text-error'" class="ml-1">*</span>
    </label>

    <div :class="inputWrapperClasses">
      <div :class="selectTriggerClasses" :style="triggerInlineStyle" @mousedown.prevent @click="toggleDropdown" @focus="handleFocus" @blur="handleBlur" @keydown="handleKeydown" :tabindex="disabled ? -1 : 0" ref="selectRef" role="combobox" :aria-expanded="isOpen" :aria-haspopup="'listbox'" :aria-disabled="disabled" :aria-invalid="showError" :aria-labelledby="label && labelPosition === 'floating' ? labelId : undefined" :aria-controls="isOpen ? dropdownId : undefined" :aria-activedescendant="activeDescendant">
            <div class="flex-1 truncate min-w-0 pr-2 flex items-center h-full">
                <input v-if="isOpen && filterable" :id="baseId" type="text" :value="searchQuery" :placeholder="selectedLabel || (multiple && selectedLabels.length) ? '' : placeholder" :class="filterInputClasses" @input="handleSearchInput" @click.stop @keydown.stop="event => { if(['Enter', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) event.preventDefault(); if(event.key === 'Escape') handleKeydown(event); if(event.key === 'Enter' && highlightedOptionIndex !== -1) selectHighlightedOption(); }" ref="searchInput" autocomplete="off" role="searchbox" aria-autocomplete="list" :aria-controls="dropdownId" :aria-labelledby="label && labelPosition === 'floating' ? labelId : undefined" :aria-activedescendant="activeDescendant" :disabled="disabled" />
                <div v-else class="flex items-center h-full w-full">
                   <template v-if="multiple">
                       <div v-if="selectedLabels.length > 1" class="flex flex-nowrap gap-1 items-center overflow-hidden">
                            <span :key="`chip-${modelValue?.[0]}`" :class="chipClasses"> <span class="truncate">{{ selectedLabels[0] }}</span> <button type="button" @mousedown.stop.prevent @click.stop="removeSelected(0)" :class="chipRemoveButtonClasses" title="Remove" :disabled="disabled"> <svg :class="chipRemoveIconClasses" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg> </button> </span>
                            <span :class="[chipClasses, 'theme-colors-text-secondary', 'theme-colors-background-primary', 'font-normal cursor-default']" :aria-label="`plus ${selectedLabels.length - 1} more selected items`"> +{{ selectedLabels.length - 1 }} </span>
                       </div>
                       <div v-else-if="selectedLabels.length === 1" class="flex flex-wrap gap-1 items-center">
                           <span :key="`chip-${modelValue?.[0]}`" :class="chipClasses"> <span class="truncate">{{ selectedLabels[0] }}</span> <button type="button" @mousedown.stop.prevent @click.stop="removeSelected(0)" :class="chipRemoveButtonClasses" title="Remove" :disabled="disabled"> <svg :class="chipRemoveIconClasses" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg> </button> </span>
                       </div>
                     <span v-else-if="!label || labelPosition !== 'floating'" :class="placeholderClasses"> {{ placeholder }} </span>
                   </template>
                   <template v-else>
                      <span v-if="selectedLabel" :class="['theme-colors-text-primary', sizeFontClass.value]"> {{ selectedLabel }} </span>
                      <span v-else-if="!label || labelPosition !== 'floating'" :class="placeholderClasses"> {{ placeholder }} </span>
                   </template>
               </div>
           </div>
           <div class="flex items-center space-x-1 pr-1 flex-shrink-0">
               <div v-if="loading" role="status" class="p-0.5"> <svg aria-hidden="true" :class="[clearIconClasses, 'theme-colors-text-secondary', 'animate-spin']" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/> <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/> </svg> <span class="sr-only">Loading...</span> </div>
             <button v-if="clearable && hasValue && !disabled && !multiple && !loading" type="button" @mousedown.stop.prevent @click.stop="clearSelection" :class="clearButtonClasses" title="Clear selection" :disabled="disabled"> <svg :class="clearIconClasses" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg> </button>
             <svg :class="dropdownArrowIconClasses" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"> <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /> </svg>
           </div>
            <label
              v-if="label && labelPosition === 'floating'"
              :id="labelId"
              :class="floatingLabelClasses"
              :style="floatingLabelStyle"
              :for="baseId"
              @click.stop="selectRef?.focus()"
            >
              {{ label }}
              <span v-if="required" :class="'theme-colors-text-error'" class="ml-0.5">*</span>
            </label>
      </div>

      <Transition name="dropdown-fade">
          <div v-if="isOpen" ref="dropdownRef" :id="dropdownId" role="listbox" :aria-multiselectable="multiple" :aria-labelledby="label && labelPosition === 'floating' ? labelId : undefined" :class="dropdownContainerClasses" :style="{ top: dropdownPosition === 'above' ? 'auto' : '100%', bottom: dropdownPosition === 'above' ? '100%' : 'auto', marginTop: dropdownPosition === 'above' ? '0' : '4px', marginBottom: dropdownPosition === 'above' ? '4px' : '0' }" >
            <div :class="dropdownContentWrapperClasses">
                 <div v-for="(option, index) in filteredOptions" :key="option.value" :id="getOptionId(index)" @mousedown.prevent @click.stop="handleOptionSelect(option, index)" :class="dropdownOptionClasses(isOptionSelected(option.value), index === highlightedOptionIndex)" role="option" :aria-selected="isOptionSelected(option.value)">
                      <input
                        v-if="multiple"
                        type="checkbox"
                        :checked="isOptionSelected(option.value)"
                        :class="dropdownCheckboxClasses(isOptionSelected(option.value))"
                        tabindex="-1"
                        aria-hidden="true"
                      />
                      <span>{{ option.label }}</span>
                 </div>
                <div v-if="!loading && filteredOptions.length === 0" :class="noOptionsClasses" role="status"> {{ (filterable || remote) && searchQuery ? 'No options found' : 'No options available' }} </div>
                <div v-if="loading && filteredOptions.length === 0" :class="noOptionsClasses" role="status"> Loading... </div>
            </div>
          </div>
      </Transition>

      <div
        v-if="helperText || error"
        :class="helperTextClasses"
        role="alert"
        :aria-live="showError ? 'polite' : 'off'"
      >
        {{ showError && typeof error === 'string' ? error : helperText }}
      </div>

    </div>
  </div>
</template>

<style scoped>
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease-out, transform 0.15s ease-out;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

input[type=checkbox] {
    appearance: none;
    -webkit-appearance: none;
    print-color-adjust: exact;
    display: inline-block;
    vertical-align: middle;
    background-origin: border-box;
    user-select: none;
    flex-shrink: 0;
    height: 1rem;
    width: 1rem;
}
</style>
