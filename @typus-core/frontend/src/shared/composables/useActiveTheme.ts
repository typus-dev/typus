import { ref, onMounted, onUnmounted } from 'vue'

const getCurrentTheme = () => {
  if (typeof document === 'undefined') {
    return ''
  }
  return document.documentElement.getAttribute('data-theme') || ''
}

export const useActiveTheme = () => {
  const activeTheme = ref(getCurrentTheme())
  let observer: MutationObserver | null = null

  const startObserver = () => {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
      return
    }

    observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          const nextTheme = getCurrentTheme()
          if (nextTheme !== activeTheme.value) {
            activeTheme.value = nextTheme
          }
        }
      }
    })

    observer.observe(document.documentElement, { attributes: true })
  }

  if (typeof window !== 'undefined') {
    startObserver()
  }

  onMounted(() => {
    activeTheme.value = getCurrentTheme()
    if (!observer) {
      startObserver()
    }
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  return activeTheme
}
