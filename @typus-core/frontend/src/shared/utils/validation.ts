// src/shared/utils/validation.ts

// Check if string is valid JSON
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}


export const validators = {
  required: (value: any): boolean => {
    return value !== null && value !== undefined && value !== ''
  },

  email: (value: string): boolean => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return pattern.test(value)
  },

  minLength: (value: string, min: number): boolean => {
    return value.length >= min
  },

  maxLength: (value: string, max: number): boolean => {
    return value.length <= max
  },

  numeric: (value: string): boolean => {
    return /^\d+$/.test(value)
  }
}

export const useValidation = (rules: Record<string, (value: any) => boolean>) => {
  const errors = ref<Record<string, string>>({})
  
  const validate = (data: Record<string, any>): boolean => {
    errors.value = {}
    let isValid = true

    Object.entries(rules).forEach(([field, validator]) => {
      if (!validator(data[field])) {
        errors.value[field] = `Field ${field} is invalid`
        isValid = false
      }
    })

    return isValid
  }

  return {
    errors,
    validate
  }
}
