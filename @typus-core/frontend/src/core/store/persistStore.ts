import { defineStore } from 'pinia'
import { customRef } from 'vue'

interface StoreData {
  [key: string]: any
}

const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

const setNestedValue = (obj: any, path: string, value: any) => {
  const keys = path.split('.')
  let current = obj
  
  // Create nested objects for all but the last key
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }
  
  // Set the value at the last key
  current[keys[keys.length - 1]] = value
  return obj
}

export const usePersistStore = defineStore('persist', {
  state: () => ({
    data: {} as StoreData
  }),

  actions: {
    set(keyOrValue: string | any, value?: any) {
      if (arguments.length === 2) {
        const key = keyOrValue as string
        const rootKey = key.split('.')[0]
        
        // Load existing root object from storage if it exists
        if (!this.data[rootKey]) {

          logger.debug('rootKey', rootKey)
          const stored = localStorage.getItem(rootKey)

          logger.debug('stored', stored)
          if (stored && typeof stored === 'string') {
            try {
              this.data[rootKey] = JSON.parse(stored);
            } catch (e) {
              this.data[rootKey] = {};
            }
          } else {
            this.data[rootKey] = {};
          }
        }
        
        setNestedValue(this.data, key, value)
        localStorage.setItem(rootKey, JSON.stringify(this.data[rootKey]))
        return
      }

      if (typeof keyOrValue === 'object') {
        Object.entries(keyOrValue).forEach(([key, val]) => {
          const rootKey = key.split('.')[0]
          if (!this.data[rootKey]) {
            const stored = localStorage.getItem(rootKey)
            this.data[rootKey] = stored ? JSON.parse(stored) : {}
          }
          setNestedValue(this.data, key, val)
          localStorage.setItem(rootKey, JSON.stringify(this.data[rootKey]))
        })
      }
    },

    get(path: string, defaultValue: any = null) {
      const rootKey = path.split('.')[0]

      if (!this.data[rootKey]) {
        const fromLocal = localStorage.getItem(rootKey)
        const fromSession = sessionStorage.getItem(rootKey)

        const isValid = (val: string | null) =>
          val !== null && val !== undefined && val !== 'undefined';

        this.data[rootKey] = isValid(fromLocal) ? JSON.parse(fromLocal as string) :
                            isValid(fromSession) ? JSON.parse(fromSession as string) :
                            defaultValue;
      }

      return getNestedValue(this.data, path) ?? defaultValue
    },

    remove(path: string) {
      const keys = path.split('.')
      const rootKey = keys[0]

      if (keys.length === 1) {
        delete this.data[rootKey]
        localStorage.removeItem(rootKey)
        sessionStorage.removeItem(rootKey)
      } else {
        const parentPath = keys.slice(0, -1).join('.')
        const lastKey = keys[keys.length - 1]
        const parent = getNestedValue(this.data, parentPath)
        if (parent) {
          delete parent[lastKey]
          localStorage.setItem(rootKey, JSON.stringify(this.data[rootKey]))
        }
      }
    },

    clear() {
      this.data = {}
      localStorage.clear()
      sessionStorage.clear()
    }
  }
})
