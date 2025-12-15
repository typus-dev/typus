import { usePersistStore } from '@/core/store/persistStore'

export const useStore = () => {
  const store = usePersistStore()
  return {
    get: store.get,
    set: store.set,
    remove: store.remove,
    clear: store.clear
  }
}

// Example usage:
// const store = useStore()
// store.set('user', userData, true) 
// store.set('remember_me', true, true)
// const user = store.get('user')
// const remember = store.get('remember_me', false)