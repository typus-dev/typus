export function useMessages() {
    const { successModal, errorModal, confirmModal } = useModals()
    const { successToast, errorToast } = useToasts() 
    const appConfig = useAppConfig()
   
    const successMessage = (message: string) => {
      if (appConfig.systemMessages.type === 'modals') {
        successModal(message)
      } else {
        successToast(message)
      }
    }
   
    const errorMessage = (message: string) => {
      if (appConfig.systemMessages.type === 'modals') {
        errorModal(message) 
      } else {
        errorToast(message)
      }
    }
   
    const confirmMessage = confirmModal
   
    return {
      successMessage,
      errorMessage, 
      confirmMessage
    }
   }