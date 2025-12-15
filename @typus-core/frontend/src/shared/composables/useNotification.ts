// src/shared/composables/useNotification.ts
export function useNotification() {
    return {
      success: (message: string) => {
        // Integrate with UI library for success notifications
      },
      error: (message: string) => {
        // Display error message in a user-friendly way
      }
    }
  }