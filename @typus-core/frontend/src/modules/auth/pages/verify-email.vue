<route lang="json">
  {
    "name": "verify-email",
    "meta": {
      "layout": "public",
      "title": "Verify Email"
    }
  }
  </route>
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useModals } from '@/shared/composables/useModals'
import { useAuthStore } from '@/core/store/authStore'
import { useApi } from '@/shared/composables/useApi'

const props = defineProps({
  demo: {
    type: Boolean,
    default: false
  }
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { successModal, errorModal } = useModals()

const loading = ref(true)
const isResending = ref(false)
const demoState = ref('success') // Can be 'success', 'failed', or 'sent'

const formData = ref({
  email: null as string | null,
  success: false as boolean,
  token: null as string | null
})

// Method to switch between demo states
const switchDemoState = () => {
  if (props.demo) {
    if (demoState.value === 'success') {
      demoState.value = 'failed'
    } else if (demoState.value === 'failed') {
      demoState.value = 'sent'
    } else {
      demoState.value = 'success'
    }
    
    // Update formData based on the selected demo state
    if (demoState.value === 'success') {
      formData.value = {
        email: 'demo@example.com',
        success: true,
        token: 'demo-token'
      }
    } else if (demoState.value === 'failed') {
      formData.value = {
        email: 'demo@example.com',
        success: false,
        token: 'invalid-token'
      }
    } else { // sent
      formData.value = {
        email: 'demo@example.com',
        success: false,
        token: null
      }
    }
  }
}

onMounted(async () => {
  if (props.demo) {
    // In demo mode, show success state by default
    formData.value = {
      email: 'demo@example.com',
      success: true,
      token: 'demo-token'
    }
    loading.value = false
    return
  }

  // Get token from URL query parameter
  formData.value.token = route.query.token as string
  
  // If no token, redirect to home
  if (!formData.value.token) {
    router.push('/')
    return
  }

  // If token is present, verify it
  if (formData.value.token) {
    try {
      const { data, error } = await useApi('auth/verify/token').post({
        token: formData.value.token,
        type: 'registration'
      })

      if (error) {
        logger.error('Email verification error:', error)
        formData.value.success = false

        if (error === 'Token expired' || error === 'Token invalid') {
          errorModal('Invalid or expired token. Please try again.')
        } else {
          errorModal(error || 'Verification failed. Please try again.')
        }
      } else {
        formData.value.success = true
        successModal('Email verified successfully! Your account is now active.')
      }
    } catch (err) {
      logger.error('Verification error:', err)
      formData.value.success = false
      errorModal('Verification failed. Please try again.')
    }
  }

  loading.value = false
})

const redirectHome = () => {
  if (props.demo) {
    switchDemoState()
    return
  }
  
  router.push('/')
}

const redirectToLogin = () => {
  if (props.demo) {
    switchDemoState()
    return
  }
  
  // Redirect to login page as user is not authenticated yet
  router.push('/auth/login')
}

const sendVerificatonEmail = async () => {
  if (props.demo) {
    isResending.value = true
    
    // Simulate API call in demo mode
    setTimeout(() => {
      successModal('This is a demo. In a real environment, a verification email would be sent.')
      isResending.value = false
    }, 1000)
    
    return
  }
  
  try {
    isResending.value = true
    
    const { data, error } = await useApi('auth/verify/send').post({
      email: formData.value.email,
      type: 'registration',
      channel: 'email',
      method: 'link'
    })

    if (error) {
      errorModal(error || 'Failed to send verification email. Please try again later.')
    } else {
      successModal(data?.message || 'Verification email sent successfully.')
    }
  } catch (err) {
    logger.error('Send verification error:', err)
    errorModal('Failed to send verification email')
  } finally {
    isResending.value = false
  }
}

</script>

<template>
  <AuthContainer maxWidth="md">
    <!-- Demo notice -->
    <div v-if="demo" :class="['border-l-4 p-4 mb-6', 'theme-colors-background-info', {'border-' : 'theme-colors-border-info'}]">
      <div class="flex">
        <div class="flex-shrink-0">
          <dxIcon name="info-circle" :class="'theme-colors-text-info'" />
        </div>
        <div class="ml-3">
          <p class="text-sm" :class="'theme-colors-text-secondary'">
            Demo Mode: This is a preview of the email verification interface. Click the buttons to cycle through different states.
          </p>
        </div>
      </div>
    </div>

    <!-- Failed verification state -->
    <div v-if="formData.token && !formData.success && !loading">
      <dxCard variant="elevated">
      <dxStack spacing="6">
        <div>
          <h4 class="text-2xl font-semibold mb-1" :class="'theme-colors-text-primary'">Verification Failed</h4>
          <p :class="'theme-colors-text-secondary'">The verification link appears to be invalid or expired. Please try again.</p>
        </div>
        
        <dxButton 
          fullWidth 
          variant="primary" 
          size="lg"
          @click="redirectHome"
        >
          {{ demo ? 'Next State' : 'Return to Home' }}
        </dxButton>
      </dxStack>
      </dxCard>
    </div>

    <!-- Success verification state -->
    <div v-if="formData.success && !loading">
      <dxCard variant="elevated">
      <dxStack spacing="6">
        <div>
          <h4 class="text-2xl font-semibold mb-1" :class="'theme-colors-text-primary'">Email Verified Successfully</h4>
          <p :class="'theme-colors-text-secondary'">
            Your email has been verified and your account is now active.
          </p>
        </div>
        
        <dxButton 
          fullWidth 
          variant="primary" 
          size="lg"
          @click="redirectToLogin"
        >
          {{ demo ? 'Next State' : 'Sign In' }}
        </dxButton>
      </dxStack>
      </dxCard>
    </div>

    <!-- Email sent state -->
    <div v-if="formData.email && !formData.token && !loading">
      <dxCard variant="elevated">
      <dxStack spacing="6">
        <div>
          <h4 class="text-2xl font-semibold mb-1" :class="'theme-colors-text-primary'">Verify your email ✉️</h4>
          <p :class="'theme-colors-text-secondary'">
            Account activation link sent to your email address: 
            <span class="font-medium">{{ formData.email }}</span>. 
            Please follow the link inside to continue.
          </p>
        </div>

        <dxButton 
          fullWidth 
          variant="primary" 
          size="lg"
          @click="redirectHome"
        >
          {{ demo ? 'Next State' : 'Return to Home' }}
        </dxButton>

        <dxFlex customClass="justify-center">
          <span :class="['text-sm', 'theme-colors-text-secondary', 'mr-1']">Didn't get the mail?</span>
          <dxButton 
            variant="link" 
            size="sm" 
            :loading="isResending"
            :disabled="isResending"
            @click="sendVerificatonEmail"
          >
            Resend
          </dxButton>
        </dxFlex>
      </dxStack>
      </dxCard>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="text-center">
      <div class="flex flex-col items-center justify-center py-8">
        <dxSpinner size="lg" customClass="mb-4" />
        <p :class="'theme-colors-text-secondary'">Verifying your email...</p>
      </div>
    </div>
  </AuthContainer>
</template>