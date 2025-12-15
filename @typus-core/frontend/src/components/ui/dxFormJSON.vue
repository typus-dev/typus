

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useFormHelpers } from '@/shared/composables/useFormHelpers'

interface FormField {
  name: string;
  type?: string;
  label?: string;
  required?: boolean;
  rules?: any[];
  options?: any[];
  span?: number | string;
  disabled?: boolean;
  description?: string;
  helperText?: string;
  size?: string;
  rows?: number;
  placeholder?: string;
}

const props = defineProps({
  jsonData: {
    type: Object,
    required: false
  },
  modelValue: {
    type: Object,
    default: undefined
  },
  columns: {
    type: Number,
    default: 1,
    validator: (value: number) => [1, 2, 3, 4, 6].includes(value)
  },
  formTitle: {
    type: String,
    default: 'Dynamic Form'
  },
  fields: {
    type: Array as PropType<(string | FormField)[]>,
    required: true
  },
  hideFields: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  hideActions: {
    type: Boolean,
    default: false
  },
  actions: {
    type: Object as PropType<{
      submit?: { label?: string; handler?: ((payload: Record<string, any>) => Promise<void> | void) | null };
      cancel?: { label?: string; handler?: (() => void) | null };
    }>,
    default: () => ({
      submit: { label: 'Save', handler: null },
      cancel: { label: 'Cancel', handler: null }
    })
  }
})


const emit = defineEmits(['validation-error', 'update:modelValue'])

const form = ref(null)


const sourceData = computed(() => props.modelValue || props.jsonData || {})

const formData = reactive<Record<string, any>>(
  Object.entries(sourceData.value).reduce((acc: Record<string, any>, [key, value]) => {
    acc[key] = typeof value === 'object' && value !== null && !Array.isArray(value) 
      ? JSON.stringify(value, null, 2) 
      : value
    return acc
  }, {})
)

let isUpdatingFromProps = false

watch(formData, (newData) => {
  if (isUpdatingFromProps) return // prevent recursion
  
  if (props.modelValue !== undefined) {
    const processedData = Object.entries(newData).reduce((acc, [key, value]) => {
      try {
        if (typeof value === 'string' && value.trim().startsWith('{')) {
          try {
            acc[key] = JSON.parse(value)
          } catch (e) {
            acc[key] = value
          }
        } else {
          acc[key] = value
        }
      } catch (e) {
        acc[key] = value
      }
      return acc
    }, {})
    
    emit('update:modelValue', processedData)
  }
}, { deep: true })

watch(sourceData, (newValue) => {
  if (newValue) {
    isUpdatingFromProps = true
    Object.entries(newValue).forEach(([key, value]) => {
      formData[key] = typeof value === 'object' && value !== null && !Array.isArray(value)
        ? JSON.stringify(value, null, 2)
        : value
    })
    nextTick(() => {
      isUpdatingFromProps = false
    })
  }
}, { deep: true })

const fieldErrors = reactive<Record<string, string | boolean>>({})
const isSubmitting = ref(false)
const formFields = ref([])

const { generateLabel, generateType, generateRules } = useFormHelpers(formData)

const normalizedFields = computed(() => {
  return props.fields
    .filter(field => !props.hideFields.includes(getFieldName(field)))
    .map(field => {
      if (typeof field === 'string') {
        return {
          name: field,
          type: generateType(field, formData[field]),
          label: generateLabel(field),
          required: true,
          rules: generateRules(field, formData[field])
        } as FormField
      }
      return {
        ...field,
        type: field.type || generateType(field.name, formData[field.name]),
        label: field.label || generateLabel(field.name),
        required: field.required ?? true,
        rules: field.rules || generateRules(field.name, formData[field.name])
      } as FormField
    })
})


const getFieldSpan = (field: string | FormField): number | string | undefined => {
  return typeof field === 'object' ? field.span : undefined
}

const getFieldName = (field: string | FormField): string => 
  typeof field === 'string' ? field : field.name

const getFieldType = (field: string | FormField): string =>
  typeof field === 'string' ? generateType(field, formData[field]) : field.type || 'text'

const getFieldLabel = (field: string | FormField): string =>
  typeof field === 'string' ? generateLabel(field) : field.label || generateLabel(field.name)

const getFieldError = (field: string | FormField): string | boolean => {
  const fieldName = getFieldName(field)
  return fieldErrors[fieldName] || false
}

const getFieldRules = (field: string | FormField): any[] => {
  const rules = []
  const fieldName = getFieldName(field)

  if (typeof field === 'string') {
    rules.push(v => !!v || `${getFieldLabel(field)} is required`)
    return rules.concat(generateRules(field, formData[field]))
  }

  if (field.required) {
    rules.push(
      v => !!v || `${field.label || getFieldLabel(field.name)} is required`
    )
  }

  if (field.rules) {
    rules.push(...field.rules)
  }

  return rules.concat(generateRules(fieldName, formData[fieldName]))
}

const getFieldOptions = (field: string | FormField): any[] => {
  if (typeof field === 'string') return []
  return field.options || []
}

const formatDxSelectOptions = (options: any[]) => {
  if (!options || !options.length) return []
  
  const firstOption = options[0]
  
  if (typeof firstOption === 'object' && 'label' in firstOption && 'value' in firstOption) {
    return options
  }
  
  if (typeof firstOption === 'string' || typeof firstOption === 'number') {
    return options.map(opt => ({ label: String(opt), value: opt }))
  }
  
  return options
}

const formElements = ref<any[]>([])
provide('registerFormElement', (element: any) => {
  formElements.value.push(element)
})

const validateField = (field: FormField) => {
  const fieldName = getFieldName(field)
  const value = formData[fieldName]
  const rules = getFieldRules(field)
  
  for (const rule of rules) {
    const result = rule(value)
    if (result !== true) {
      fieldErrors[fieldName] = result
      return false
    }
  }
  
  fieldErrors[fieldName] = false
  return true
}

const validateForm = async () => {
  let isValid = true
  
  for (const field of normalizedFields.value) {
    const fieldIsValid = validateField(field)
    isValid = isValid && fieldIsValid
  }
  
  return isValid
}

const handleSubmit = async () => {
  const isValid = await validateForm()
  
  if (!isValid) {
    emit('validation-error', fieldErrors)
    return
  }

  if (props.actions.submit?.handler) {
    try {
      isSubmitting.value = true
      
      const payloadData = Object.entries(formData).reduce((acc, [key, value]) => {
        try {
          if (typeof value === 'string' && value.trim().startsWith('{')) {
            try {
              acc[key] = JSON.parse(value)
            } catch (e) {
              acc[key] = value
            }
          } else {
            acc[key] = value
          }
        } catch (e) {
          acc[key] = value
        }
        return acc
      }, {})


      await props.actions.submit.handler(payloadData)
    } finally {
      isSubmitting.value = false
    }
  }
}

const handleCancel = () => {
  if (isSubmitting.value) return

  if (props.actions.cancel?.handler) {
    props.actions.cancel.handler()
  } else {
    Object.keys(formData).forEach(key => {
      const initialValue = sourceData.value[key]
      formData[key] = typeof initialValue === 'object' && initialValue !== null && !Array.isArray(initialValue)
        ? JSON.stringify(initialValue, null, 2)
        : initialValue
    })
    
    Object.keys(fieldErrors).forEach(key => {
      fieldErrors[key] = false
    })
  }
}
</script>

<template>

  <form ref="form" @submit.prevent="handleSubmit">
    <dxGrid :cols="1" :sm="2" :md="2" :lg="columns" :xl="columns" :gap="4">
      <dxCol
        :span="getFieldSpan(field)"
        :sm="getFieldType(field) === 'textarea' ? 2 : undefined"
        :md="getFieldType(field) === 'textarea' ? 2 : undefined"
        :lg="getFieldType(field) === 'textarea' ? columns : undefined"
        :xl="getFieldType(field) === 'textarea' ? columns : undefined"
        v-for="(field, index) in normalizedFields"
        :key="getFieldName(field)"
      >
        
        <dxSwitch
          v-if="getFieldType(field) === 'switch'"
          v-model="formData[getFieldName(field)]"
          :label="getFieldLabel(field)"
          :disabled="field.disabled"
          :description="field.description"
        />
        
        <dxSelect
          v-else-if="getFieldType(field) === 'select'"
          v-model="formData[getFieldName(field)]"
          :label="getFieldLabel(field)"
          :options="formatDxSelectOptions(getFieldOptions(field))"
          :required="!!field.required"
          :error="getFieldError(field)"
          :size="field.size || 'lg'"
          :disabled="field.disabled"
          :helper-text="field.helperText"
          label-position="floating"
        />
        
        <dxInput
          v-else-if="getFieldType(field) === 'textarea'"
          v-model="formData[getFieldName(field)]"
          :label="getFieldLabel(field)"
          :required="!!field.required"
          :error="getFieldError(field)"
          :disabled="field.disabled"
          :helper-text="field.helperText"
          :size="field.size || 'lg'"
          multiline
          :rows="field.rows || 5"
          label-position="floating"
        />
        
        <dxInput
          v-else
          v-model="formData[getFieldName(field)]"
          :label="getFieldLabel(field)"
          :type="getFieldType(field)"
          :required="!!field.required"
          :error="getFieldError(field)"
          :size="field.size || 'lg'"
          :disabled="field.disabled"
          :helper-text="field.helperText"
          :placeholder="field.placeholder"
          label-position="floating"
        />
      </dxCol>
    </dxGrid>

    <div v-if="$slots['form-content']" class="mt-6">
      <dxCard variant="outlined" class="overflow-hidden w-full h-full">
        <div class="slot-content">
          <slot name="form-content" />
        </div>
      </dxCard>
    </div>

    <dxFlex v-if="!hideActions" justify="end" gap="4" class="mt-6">
      <dxButton
        v-if="actions.cancel"
        variant="secondary"
        @click="handleCancel"
        :disabled="isSubmitting"
      >
        {{ actions.cancel.label || 'Cancel' }}
      </dxButton>
      <dxButton
        v-if="actions.submit"
        type="submit"
        variant="primary"
        :loading="isSubmitting"
      >
        {{ actions.submit.label || 'Save' }}
      </dxButton>
    </dxFlex>
  </form>
</template>
<style scoped>
.slot-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow-y: auto;
}
</style>