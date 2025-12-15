// src/shared/composables/useLoading.ts


export function useLoading(initialState = false) {
  const isLoading = ref(initialState)

  const startLoading = () => isLoading.value = true
  const stopLoading = () => isLoading.value = false

  return {
    isLoading,
    startLoading,
    stopLoading
  }
}
