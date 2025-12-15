<route lang="json">
  {
    "name": "verify-code",
    "meta": {
      "layout": "public",
      "title": "Verify Code"
    }
  }
  </route>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useModals } from '@/shared/composables/useModals'
import { useApi } from '@/shared/composables/useApi'
import { useAuthStore } from '@/core/store/authStore'

const props = defineProps({
  demo: {
    type: Boolean,
    default: false
  }
})

const route = useRoute()
const router = useRouter()
const { successModal, errorModal } = useModals()

// State
const loading = ref(true)
const isSubmitting = ref(false)
const isResending = ref(false)
const codeDigits = ref(['', '', '', '', '', ''])
const codeInputRefs = ref<HTMLInputElement[]>([])
const resendCountdown = ref(60)
const canResend = ref(false)
let countdownInterval: number | null = null

// Computed properties
const verificationType = computed(() => route.query.type as string || 'registration')
const verificationEmail = computed(() => route.query.email as string || (props.demo ? 'demo@example.com' : ''))
const verificationUserId = computed(() => Number(route.query.userId) || (props.demo ? 1234 : null))
const tempToken = computed(() => route.query.tempToken as string || (props.demo ? 'demo-token' : ''))

const pageTitle = computed(() => {
  switch (verificationType.value) {
    case 'registration':
      return 'Verify Your Email'
    case 'password-reset':
      return 'Reset Your Password'
    case '2fa':
      return 'Two-Factor Authentication'
    case 'email-change':
      return 'Verify Email Change'
    default:
      return 'Verification Required'
  }
})

const pageDescription = computed(() => {
  switch (verificationType.value) {
    case 'registration':
      return `We've sent a 6-digit code to ${verificationEmail.value}. Enter it below to verify your account.`
    case 'password-reset':
      return `Enter the 6-digit code sent to ${verificationEmail.value} to reset your password.`
    case '2fa':
      return 'Enter the 6-digit code from your authenticator app or email to complete login.'
    case 'email-change':
      return `We've sent a 6-digit code to ${verificationEmail.value}. Enter it below to verify your new email.`
    default:
      return 'Enter the 6-digit verification code to continue.'
  }
})

const isCodeComplete = computed(() => {
  return codeDigits.value.every(digit => digit !== '')
})

const fullCode = computed(() => {
  return codeDigits.value.join('')
})

// Methods
const startResendCountdown = () => {
  canResend.value = false
  resendCountdown.value = 60
  
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
  
  countdownInterval = setInterval(() => {
    if (resendCountdown.value <= 1) {
      clearInterval(countdownInterval)
      canResend.value = true
    } else {
      resendCountdown.value -= 1 
    }
  }, 1000)
}

const handleDigidxInput = (index: number) => {
  // Move to next input after entering a digit
  if (codeDigits.value[index] && index < 5) {
    codeInputRefs.value[index + 1].focus()
  }
  
  // Auto-submit when all digits are filled
  if (index === 5 && isCodeComplete.value) {
    handleSubmit(true)
  }
}

const handleKeyDown = (event: KeyboardEvent, index: number) => {
  // Handle backspace
  if (event.key === 'Backspace') {
    if (!codeDigits.value[index] && index > 0) {
      codeDigits.value[index - 1] = ''
      codeInputRefs.value[index - 1].focus()
    }
  }
}

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const pastedText = event.clipboardData?.getData('text') || ''
  const digits = pastedText.replace(/\D/g, '').slice(0, 6).split('')
  
  digits.forEach((digit, index) => {
    if (index < 6) {
      codeDigits.value[index] = digit
    }
  })
  
  // Focus on the next empty input or the last one
  const nextEmptyIndex = codeDigits.value.findIndex(digit => !digit)
  if (nextEmptyIndex !== -1) {
    codeInputRefs.value[nextEmptyIndex].focus()
  } else if (codeInputRefs.value[5]) {
    codeInputRefs.value[5].focus()
  }
}

const handleSubmit = async (valid: boolean) => {
  if (!valid || !isCodeComplete.value) return
  
  isSubmitting.value = true
  
  if (props.demo) {
    // In demo mode, simulate API call
    setTimeout(() => {
      successModal('This is a demo. In a real environment, your verification would be processed.')
      isSubmitting.value = false
      
      // Simulate redirect
      if (verificationType.value === 'registration' && route.query.simplified === 'true') {
        const authStore = useAuthStore()
        
        // Set mock auth data
        authStore.setAuthData({
          accessToken: 'demo-access-token',
          refreshToken: 'demo-refresh-token',
          user: {
            id: 1234,
            email: verificationEmail.value
          }
        })
        
        // Show message
        successModal('Demo: Registration and login completed successfully!')
        
        // Redirect
        setTimeout(() => {
          router.push({ path: '/demo/cards' })
        }, 1500)
      }
    }, 1000)
    return
  }
  
  try {
    const payload: any = {
      code: fullCode.value,
      type: verificationType.value
    }
    
    // Add corresponding parameters
    if (verificationEmail.value) {
      payload.email = verificationEmail.value
    }
    
    if (verificationUserId.value) {
      payload.userId = verificationUserId.value
    }
    
    if (tempToken.value) {
      payload.tempToken = tempToken.value
    }
    
    // For simplified registration add directAuth parameter
    let endpoint = 'auth/verify/confirm'
    if (verificationType.value === 'registration' && route.query.simplified === 'true') {
      endpoint += '?directAuth=true'
    }
    
    const { data, error } = await useApi(endpoint).post(payload)
    
    if (error) {
      errorModal(error || 'Verification failed. Please try again.')
      return
    }
    
    // Show success message only for non-simplified registration
    if (!(verificationType.value === 'registration' && route.query.simplified === 'true')) {
      successModal('Verification successful!')
    }
    
    // Handle redirection depending on verification type
    handleSuccessRedirect(data)
  } catch (err) {
    logger.error('Verification error:', err)
    errorModal('Verification failed. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}

const handleSuccessRedirect = async (payload: any) => {

  logger.debug('[handleSuccessRedirect] payload', payload)
  const isSimplified = route.query.simplified === 'true'
  const authStore = useAuthStore()
  
  switch (verificationType.value) {
    case 'registration':
      if (isSimplified) {
        // For simplified registration check if authorization data was returned
        if (payload && payload.accessToken) {
          const data = payload
          
          // Set authorization data
          authStore.setAuthData(data)
          
          // Show message about successful registration and login
          successModal('Registration and login completed successfully!')
          
          // Redirect to dashboard
          router.push({ path: '/demo/cards' })
        } else {
          // Show notification about temporary password
          successModal('We have sent you an email with a temporary password. Please change it after logging into the system.')
          
          // Redirect to login page after showing notification
          setTimeout(() => {
            router.push({ path: '/auth/login' })
          }, 2000) // Give user time to read the message
        }
      } else {
        // For regular registration redirect to login
        router.push({ path: '/auth/login' })
      }
      break;
    case 'password-reset':
      router.push({ 
        path: '/auth/set-password',
        query: { token: payload?.resetToken || '' }
      })
      break;
    case '2fa':
      router.push({ path: '/' })
      break;
    case 'email-change':
      router.push({ path: '/profile' })
      break;
    default:
      router.push({ path: '/' })
  }
}

const resendCode = async () => {
  if (!canResend.value || isResending.value) return
  
  isResending.value = true
  
  if (props.demo) {
    // In demo mode, simulate API call
    setTimeout(() => {
      successModal('This is a demo. In a real environment, a new verification code would be sent.')
      isResending.value = false
      startResendCountdown()
    }, 1000)
    return
  }
  
  try {
    const payload: any = {
      type: verificationType.value,
      channel: 'email',
      method: 'code'
    }
    
    // Add appropriate parameters
    if (verificationEmail.value) {
      payload.email = verificationEmail.value
    }
    
    if (verificationUserId.value) {
      payload.userId = verificationUserId.value
    }
    
    const { data, error } = await useApi('auth/verify/send').post(payload)
    
    if (error) {
      errorModal(error || 'Failed to resend code. Please try again.')
      return
    }
    
    successModal(data?.message || 'Verification code resent successfully.')
    startResendCountdown()
  } catch (err) {
    logger.error('Resend code error:', err)
    errorModal('Failed to resend verification code')
  } finally {
    isResending.value = false
  }
}

const goBack = () => {
  const isSimplified = route.query.simplified === 'true'
  
  let destination = '/'
  
  switch (verificationType.value) {
    case 'registration':
      destination = isSimplified ? '/auth/register-simple' : '/auth/register'
      break
    case 'password-reset':
      destination = '/auth/forgot-password'
      break
    case '2fa':
      destination = '/auth/login'
      break
    case 'email-change':
      destination = '/profile'
      break
  }
  
  // Use path directly instead of name
  router.push({ path: destination })
}

// Lifecycle hooks
onMounted(() => {
  loading.value = true
  
  // Clear any auth_redirect flags that might be set
  localStorage.removeItem('auth_redirect')
  localStorage.removeItem('auth_redirect_path')
  
  if (props.demo) {
    // In demo mode, skip validation
    // Focus on first input
    if (codeInputRefs.value[0]) {
      codeInputRefs.value[0].focus()
    }
    
    startResendCountdown()
    loading.value = false
    return
  }
  
  // Validate required parameters
  if (!verificationType.value || (!verificationEmail.value && !verificationUserId.value)) {
    errorModal('Missing required verification parameters')
    goBack()
    return
  }
  
  // Focus on first input
  if (codeInputRefs.value[0]) {
    codeInputRefs.value[0].focus()
  }

  startResendCountdown()
  loading.value = false
})

onBeforeUnmount(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})

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
            Demo Mode: This is a preview of the verification code interface. No actual verification will be processed.
          </p>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="text-center">
      <div class="flex flex-col items-center justify-center py-8">
        <dxSpinner size="lg" customClass="mb-4" />
        <p :class="'theme-colors-text-secondary'">Processing...</p>
      </div>
    </div>

    <!-- Verification form -->
    <div v-else>
      <dxCard variant="elevated">
        <dxStack spacing="6">
        <div>
          <h2 class="text-2xl font-semibold mb-1" :class="'theme-colors-text-primary'">{{ pageTitle }}</h2>
          <p :class="'theme-colors-text-secondary'">{{ pageDescription }}</p>
        </div>

        <dxForm
          :onSubmit="handleSubmit"
          validateOnSubmit
          actionsAlign="center"
          class="w-full max-w-sm mx-auto flex flex-col items-center px-4 py-6"
        >
          <div class="flex flex-col items-center">
            <!-- Code input -->
            <div class="flex flex-wrap gap-2 my-4">
              <dxInput
                v-for="(digit, index) in codeDigits"
                :key="index"
                v-model="codeDigits[index]"
                type="text"
                inputmode="numeric"
                :maxlength=1
                :customClass="'w-12 h-12 md:w-12 md:h-14 text-center text-xl'"
                :ref="el => { if (el) codeInputRefs[index] = el }"
                @input="handleDigidxInput(index)"
                @keydown="handleKeyDown($event, index)"
                @paste="handlePaste"
                size="lg"
                :disabled="isSubmitting"
              />
            </div>

            <dxButton 
              type="submit" 
              :loading="isSubmitting" 
              :disabled="!isCodeComplete || isSubmitting"
              fullWidth  
              variant="primary"
              size="lg"
              customClass="mt-4"
            >
              Verify
            </dxButton>
          </div>
        </dxForm>

        <!-- Resend code -->
        <dxFlex customClass="justify-center">
          <span :class="['text-sm', 'theme-colors-text-secondary', 'mr-1']">Didn't receive the code?</span>
          <dxButton 
            variant="link" 
            size="sm" 
            :loading="isResending"
            :disabled="isResending || !canResend"
            @click="resendCode"
          >
            {{ canResend ? 'Resend' : `Resend in ${resendCountdown}s` }}
          </dxButton>
        </dxFlex>

        <!-- Back button -->
        <dxButton 
          variant="outline" 
          size="lg"
          customClass="w-full"
          @click="goBack"
        >
          Back
        </dxButton>
      </dxStack>
      </dxCard>
    </div>
  </AuthContainer>
</template>
