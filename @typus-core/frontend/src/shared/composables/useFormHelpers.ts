// useCustomFormHelpers.ts
import { computed, ref } from 'vue'

export function useFormHelpers(formData: Record<string, any>, customFieldTypes: Record<string, string[]> = {}) {
  const errors = ref<Record<string, string>>({})

  const generateLabel = (key: string): string => {
    return key.split(/(?=[A-Z])/).map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const defaultFieldTypes = {
    password: ['password'],
    email: ['email'],
    tel: ['phone'],
    textarea: ['notes', 'description', 'abilityRules'],
    date: ['birthday', 'date'],
    switch: ['approved', 'deleted', 'isActive', 'isAdmin', 'agreeToTerms', 'isTwoFactorEnabled'],
  }
  
  const fieldTypes = { ...defaultFieldTypes, ...customFieldTypes }
  
  const generateType = (key: string, value: any): string => {
    if (typeof value === 'object' || 
        (typeof value === 'string' && (value.startsWith('{') || value.startsWith('[')))) {
      return 'textarea'
    }
  
    for (const [type, fields] of Object.entries(fieldTypes)) {
      if (fields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        return type
      }
    }
  
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'switch'
    
    return 'text'
  }

  const generateRules = (key: string, value: any): ((v: any) => boolean | string)[] => {
    const rules: ((v: any) => boolean | string)[] = []
    if (key === 'email') rules.push((v: any) => /.[^\n\r@\u2028\u2029]*@.+\..+/.test(v) || 'E-mail must be valid')

    //if (key === 'password') rules.push(v => v?.length >= 8 || 'Password must be at least 8 characters')
    //if (value === null) rules.push(v => !!v || `${generateLabel(key)} is required`)
    
    return rules
  }

  const validateField = (key: string, value: any): void => {
    const rules = generateRules(key, value)
    const fieldErrors = rules.map(rule => rule(value)).filter(result => typeof result === 'string')
    if (fieldErrors.length) {
      errors.value[key] = fieldErrors[0]
    } else {
      delete errors.value[key]
    }
  }

  const validateForm = () => {
    Object.entries(formData).forEach(([key, value]) => validateField(key, value))
    
    return Object.keys(errors.value).length === 0
  }

  const isValid = computed(() => Object.keys(errors.value).length === 0)

  return {
    generateLabel,
    generateType,
    generateRules,
    validateField,
    validateForm,
    errors,
    isValid,
  }
}
