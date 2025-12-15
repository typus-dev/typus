<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8 p-8">
      <div class="text-center">
        <div class="mx-auto h-12 w-12 theme-colors-text-success">
          <svg fill="none" stroke="currentColor" viewBox="0 0 48 48" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
          {{ status === 'success' ? 'Account Connected!' : 'Connection Failed' }}
        </h2>
        
        <div v-if="status === 'success'" class="mt-4">
          <p class="text-sm text-gray-600">
            Your Twitter account has been successfully connected.
          </p>
          <p class="text-xs text-gray-500 mt-2">
            This window will close automatically...
          </p>
        </div>
        
        <div v-else class="mt-4">
          <p class="text-sm theme-colors-text-error">
            {{ errorMessage || 'Failed to connect your Twitter account.' }}
          </p>
          <p class="text-xs text-gray-500 mt-2">
            Please try again or contact support if the problem persists.
          </p>
        </div>

        <div class="mt-6">
          <button 
            @click="closeWindow" 
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white theme-colors-background-accent hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

// Meta configuration for this route
defineOptions({
  meta: {
    layout: 'public',  // Use public layout (no auth required)
    requiresAuth: false,
    middleware: []  // Skip auth middleware
  }
})

const route = useRoute()
const status = ref('loading')
const errorMessage = ref('')

onMounted(() => {
  // Parse URL parameters
  const query = route.query
  
  console.log('Callback page query params:', query)
  
  // Check for success parameter (different possible values)
  if (query.success === 'twitter_connected' || query.success === '1' || query.success === 'true') {
    status.value = 'success'
    handleSuccess()
  } 
  // Check for OAuth authorization code (Twitter redirect)
  else if (query.code && query.state) {
    // This means we're receiving the Twitter OAuth callback
    // The backend should handle this, but if we get here, show loading
    status.value = 'success'
    errorMessage.value = 'Processing authorization...'
    handleSuccess()
  }
  // Check for error parameter
  else if (query.error) {
    status.value = 'error'
    errorMessage.value = getErrorMessage(query.error as string)
    handleError(query.error as string)
  } 
  // No specific parameters - might be a direct callback from Twitter
  else {
    console.log('No clear success/error params, checking if this is Twitter callback...')
    // If we have code and state, this is likely the Twitter callback
    // Wait a moment for potential redirect
    setTimeout(() => {
      if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
        status.value = 'success'
        handleSuccess()
      } else {
        status.value = 'error'
        errorMessage.value = 'Invalid callback parameters'
        handleError('invalid_params')
      }
    }, 1000)
  }
})

function getErrorMessage(error: string): string {
  const errorMessages: Record<string, string> = {
    'oauth_denied': 'You denied access to your Twitter account.',
    'oauth_failed': 'OAuth authorization failed. Please try again.',
    'invalid_params': 'Invalid callback parameters received.',
    'server_error': 'Server error occurred during authorization.'
  }
  
  return errorMessages[error] || 'An unknown error occurred.'
}

function handleSuccess() {
  // Send success message to parent window
  if (window.opener) {
    window.opener.postMessage({
      type: 'twitter-oauth-success',
      timestamp: Date.now()
    }, window.location.origin)
  }
  
  // Auto-close after 2 seconds
  setTimeout(() => {
    closeWindow()
  }, 2000)
}

function handleError(error: string) {
  // Send error message to parent window
  if (window.opener) {
    window.opener.postMessage({
      type: 'twitter-oauth-error',
      error: errorMessage.value,
      errorCode: error,
      timestamp: Date.now()
    }, window.location.origin)
  }
  
  // Auto-close after 5 seconds on error
  setTimeout(() => {
    closeWindow()
  }, 5000)
}

function closeWindow() {
  // Try to close the window
  if (window.opener) {
    window.close()
  } else {
    // If not in popup, redirect to social media page
    window.location.href = '/social-media/planner'
  }
}
</script>

<style scoped>
/* Additional custom styles if needed */
</style>
