// src/shared/composables/useAsync.ts
import { useLoading } from './useLoading'

export function useAsync<T>(asyncFn: (...args: any[]) => Promise<T>) {
  const { isLoading, startLoading, stopLoading } = useLoading()
  const error = ref<Error | null>(null)

  const execute = async (...args: any[]): Promise<T | null> => {
    startLoading()
    error.value = null
    
    try {
      const result = await asyncFn(...args)
      return result
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      stopLoading()
    }
  }

  return {
    execute,
    isLoading,
    error
  }
}