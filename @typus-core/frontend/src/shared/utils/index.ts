// src/shared/utils/index.ts
export const debounce = (fn: Function, ms = 300) => {
    let timeoutId: ReturnType<typeof setTimeout>
    return function (this: any, ...args: any[]) {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn.apply(this, args), ms)
    }
  }
  
  export const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('default', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  }
  
  export const storage = {
    get: (key: string) => {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    },
    set: (key: string, value: any) => {
      localStorage.setItem(key, JSON.stringify(value))
    },
    remove: (key: string) => {
      localStorage.removeItem(key)
    }
  }