<route lang="json">
{
  "name": "forgot-password",
  "meta": {
    "layout": "public",
    "title": "Forgot Password",
     "subject": "auth",
    "requiresAuth": false
  }
}
</route>

<script setup lang="ts">
import { ref, onBeforeUnmount, defineProps } from 'vue' 
import { useRouter } from 'vue-router'
import { useModals } from '@/shared/composables/useModals'
import { useApi } from '@/shared/composables/useApi'

// Define props
const props = defineProps({
  demo: {
    type: Boolean,
    default: false
  }
})

const router = useRouter()
const { successModal, errorModal } = useModals()

const email = ref(props.demo ? 'demo@example.com' : '') 
const emailSent = ref(false)
const isSubmitting = ref(false)
const isResending = ref(false)
const resetMethod = ref('link')
const resetMethodOptions = [
  { label: 'Email Link', value: 'link' },
  { label: 'Verification Code', value: 'code' }
]


const resendCountdown = ref(60)
const canResend = ref(false)
let countdownInterval: number | null = null

const startResendCountdown = () => {
  canResend.value = false
  resendCountdown.value = 60 // Reset timer

  if (countdownInterval) {
    clearInterval(countdownInterval)
  }

  countdownInterval = setInterval(() => {
    if (resendCountdown.value <= 1) {
      if (countdownInterval) clearInterval(countdownInterval);
      canResend.value = true
    } else {
      resendCountdown.value--
    }
  }, 1000)
}

const handleSubmit = async (valid: boolean) => {
  if (!valid) return
  isSubmitting.value = true
  try { 
    if (props.demo) {
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      emailSent.value = true
      successModal('Demo: Reset instructions "sent" successfully!')
    } else {
      
      const { data, error } = await useApi('auth/password/reset-request').post({
        email: email.value,
        method: resetMethod.value 
      })

      if (error) {
        errorModal(error || 'Failed to send reset instructions. Please try again.')
        return 
      }

      emailSent.value = true 
      startResendCountdown() 
    }
  } catch (err) { 
    logger.error('Password reset request error:', err)
    errorModal('An unexpected error occurred. Please try again.')
  } finally { 
    isSubmitting.value = false
  }
}

const resendResetInstructions = async () => {
  if (isResending.value) return
  if (!props.demo && !canResend.value) return 

  isResending.value = true
  try { 
    if (props.demo) {
      
      await new Promise(resolve => setTimeout(resolve, 800))
      successModal('Demo: Reset instructions "resent" successfully!')
    } else {
      
      const { data, error } = await useApi('auth/password/reset-request').post({
        email: email.value,
        method: resetMethod.value
      })

      if (error) {
        errorModal(error || 'Failed to resend reset instructions. Please try again.')
        return 
      }

      successModal(data?.message || 'Password reset instructions resent!')
      startResendCountdown()
    }
  } catch (err) {
    logger.error('Resend reset instructions error:', err)
    errorModal('Failed to resend reset instructions')
  } finally { 
    isResending.value = false
  }
}

const redirectToLogin = () => {
  router.push('/auth/login')
}

const redirectToVerifyCode = () => {
  
  router.push({
    path: '/auth/verify-code', 
    query: {
      email: email.value,
      type: 'password-reset' 
    }
  })
}


onBeforeUnmount(() => {
  if (!props.demo && countdownInterval) {
    clearInterval(countdownInterval)
  }
})
</script>

<template>
  <AuthContainer maxWidth="md">
    <!-- Demo Mode Banner -->
   <div v-if="demo" :class="['border-l-4 p-4 mb-6', 'theme-colors-background-info', {'border-' : 'theme-colors-border-info'}]">
      <div class="flex">
        <div class="flex-shrink-0">
        
        </div>
        <div class="ml-3">
          <p class="text-sm text-neutral-300"> Demo Mode: This is a preview of the password reset interface. No actual changes will be made to your account. </p>
        </div>
      </div>
    </div>
    <!-- End Demo Mode Banner -->
    <dxCard variant="elevated">
      <!-- Initial Form View -->
      <div v-if="!emailSent" class="flex flex-col">
        <div class="text-center mb-8">
          <h2
            :class="[
              'theme-colors-text-primary',
              'theme-typography-size-2xl',
              'theme-typography-weight-bold',
              'mb-2'
            ]"
          >
            Reset Your Password
          </h2>
          <p :class="['theme-colors-text-secondary', 'theme-typography-size-md']">
            Enter your email address and we'll send you instructions to reset your password.
          </p>
        </div>

        <dxForm :onSubmit="handleSubmit" validateOnSubmit class="w-full">
          <div class="mb-4">
            <dxInput
              v-model="email"
              label="Email"
              type="email"
              required
              clearable
              labelPosition="floating"
              placeholder=" "
              size="lg"
              :disabled="isSubmitting"
              autocomplete="email"
              name="email"
            />
          </div>
          <div class="mb-6">
            <dxRadioGroup
              v-model="resetMethod"
              label="Reset Method"
              :options="resetMethodOptions"
              customClass="mb-4"
              :disabled="isSubmitting"
            />
            
          </div>

          <dxButton
            type="submit"
            variant="primary"
            size="lg"
            :loading="isSubmitting"
            :disabled="isSubmitting"
            fullWidth
            :customClass="'hover:-translate-y-0.5 hover:shadow-xl transition-transform duration-200'"
          >
            <dxIcon name="ri:mail-send-line" customClass="mr-2 theme-components-button-icon-primary" />
            Send Reset Instructions
          </dxButton>
        </dxForm>

        <div class="pt-6 w-full">
          <dxButton
            variant="outline"
            size="lg"
            fullWidth
            @click="redirectToLogin"
            :disabled="isSubmitting"
          >
            Back to Login
          </dxButton>
        </div>
      </div>

      <!-- Confirmation View (after email is sent) -->
      <div v-else class="flex flex-col text-center">
        <div class="mb-8">
          <h2
            :class="[
              'theme-colors-text-primary',
              'theme-typography-size-xl',
              'theme-typography-weight-bold',
              'mb-2'
            ]"
          >
            Check Your Email
          </h2>
          <p :class="['theme-colors-text-secondary', 'theme-typography-size-md']">
            We've sent password reset instructions to <span class="font-medium">{{ email }}</span>.
            {{
              resetMethod === 'link'
                ? 'Please follow the link in the email to reset your password.'
                : 'Please enter the verification code sent to your email.'
            }}
          </p>
        </div>

        <dxButton
          v-if="resetMethod === 'code'"
          variant="primary"
          size="lg"
          fullWidth
          @click="redirectToVerifyCode"
          :customClass="'hover:-translate-y-0.5 hover:shadow-xl transition-transform duration-200'"
        >
          <dxIcon name="ri:edit-box-line" customClass="mr-2 theme-components-button-icon-primary" />
          Enter Verification Code
        </dxButton>

        <dxFlex customClass="justify-center mt-6">
          <span :class="['theme-typography-size-sm', 'theme-colors-text-secondary', 'mr-1 mt-2']">
            Didn't receive the email?
          </span>
          <dxButton
            variant="link"
            size="sm"
            :loading="isResending"
            :disabled="isResending || (!props.demo && !canResend)"
            @click="resendResetInstructions"
            customClass="p-0 h-auto font-medium mt-2"
          >
            {{ props.demo ? 'Resend' : (canResend ? 'Resend' : `Resend in ${resendCountdown}s`) }}
          </dxButton>
        </dxFlex>

        <div class="pt-6 w-full mt-auto">
          <dxButton variant="outline" size="lg" fullWidth @click="redirectToLogin">
            Back to Login
          </dxButton>
        </div>
      </div>
    </dxCard>
  </AuthContainer>
</template>