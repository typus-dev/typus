<route lang="json">
  {
    "name": "register-simple",
    "meta": {
      "layout": "public",
      "title": "Register simple",
      "subject": "auth",
      "requiresAuth": false
    }
  }
</route>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useModals } from '@/shared/composables/useModals'
import { useApi } from '@/shared/composables/useApi'
import { initGoogleAuth, getGoogleOAuthToken } from '@/shared/utils/googleAuth'
import { useAuthStore } from '@/core/store/authStore'

const props = defineProps({
  demo: {
    type: Boolean,
    default: false
  }
})


const { errorModal } = useModals()
const router = useRouter()
const authStore = useAuthStore()
const isSubmitting = ref(false)
const isGoogleLoading = ref(false)

const formData = ref({
  email: '',
  agreeToTerms: false
})

const handleEmailSubmit = async (valid: boolean): Promise<void> => {
  if (!valid) return
  if (!formData.value.agreeToTerms) {
    errorModal('You must agree to the Terms of Service')
    return
  }
  isSubmitting.value = true
  
  if (props.demo) {
    // In demo mode, just simulate API call
    setTimeout(() => {
      const redirectParams = {
        email: formData.value.email,
        type: 'registration',
        simplified: 'true',
        demo: 'true'
      }
      router.push({ path: '/demo/verify-code-form', query: redirectParams })
      isSubmitting.value = false
    }, 1000)
    return
  }
  
  try {
    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
    const { data, error } = await useApi('auth/signup').post({
      email: formData.value.email,
      password: randomPassword,
      registrationType: 'simplified'
    })
    if (error) {
      errorModal(error as string);
       isSubmitting.value = false;
      return
    }
    const redirectParams = {
      email: formData.value.email,
      type: 'registration',
      simplified: 'true'
    }
    router.push({ path: '/auth/verify-code', query: redirectParams })
  } catch (err) {
    logger.error('Registration error:', err)
    errorModal('Failed to create account')
  } finally {
    const shouldReset = !errorModal || formData.value.agreeToTerms;
    if(shouldReset){ 
      isSubmitting.value = false;
    }
  }
}

const handleGoogleSignup = async () => {
  logger.debug('🔍 GOOGLE AUTH: handleGoogleSignup called')
  
  if (isSubmitting.value || isGoogleLoading.value) {
    logger.debug('🔍 GOOGLE AUTH: Already submitting or loading, ignoring click')
    return
  }
  
  isGoogleLoading.value = true
  logger.debug('🔍 GOOGLE AUTH: Set loading state to true')
  
  if (props.demo) {
    logger.debug('🔍 GOOGLE AUTH: Running in demo mode')
    // In demo mode, just simulate API call
    setTimeout(() => {
      logger.debug('🔍 GOOGLE AUTH: Demo mode - redirecting to demo verification page')
      router.push({ 
        path: '/demo/verify-code-form', 
        query: {
          type: 'registration',
          simplified: 'true',
          demo: 'true',
          provider: 'google'
        } 
      })
      isGoogleLoading.value = false
    }, 1000)
    return
  }
  
  try {
    logger.debug('🔍 GOOGLE AUTH: Starting Google authentication process')
    
    // Initialize Google Auth API
    logger.debug('🔍 GOOGLE AUTH: Initializing Google Auth API')
    await initGoogleAuth()
    logger.debug('🔍 GOOGLE AUTH: Google Auth API initialized successfully')
    
    // Get Google OAuth token
    logger.debug('🔍 GOOGLE AUTH: Requesting Google OAuth token')
    const token = await getGoogleOAuthToken()
    logger.debug('🔍 GOOGLE AUTH: Received Google OAuth token successfully')
    
    // Send token to backend - using googleLogin which handles both login and signup
    logger.debug('🔍 GOOGLE AUTH: Sending token to backend via authStore.googleLogin')
    const { data, error } = await authStore.googleLogin(token)
    logger.debug('🔍 GOOGLE AUTH: Received response from backend:', { data: !!data, error })
    
    if (error) {
      logger.error('🔍 GOOGLE AUTH: Backend returned error:', error)
      errorModal(typeof error === 'string' ? error : 'Google signup failed')
    } else {
      logger.debug('🔍 GOOGLE AUTH: Authentication successful, redirecting to dashboard')
      // Redirect to dashboard or verification page as needed
      router.push({ path: '/dashboard' })
    }
  } catch (err: any) {
    logger.error('🔍 GOOGLE AUTH: Error during Google signup process:', err)
    logger.error('🔍 GOOGLE AUTH: Error details:', { 
      message: err.message, 
      stack: err.stack,
      name: err.name
    })
    errorModal(err.message || 'Failed to sign up with Google')
  } finally {
    logger.debug('🔍 GOOGLE AUTH: Resetting loading state')
    isGoogleLoading.value = false
  }
}

const handleLogin = () => {
  if (props.demo) {
    router.push({ path: '/demo/login-form' })
    return
  }
  router.push({ path: '/auth/login' })
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
            Demo Mode: This is a preview of the simplified registration interface. No actual account will be created.
          </p>
        </div>
      </div>
    </div>

    <dxCard variant="elevated" >
      <div class="text-center mb-8">
        <h2 :class="['theme-colors-text-primary', 'theme-typography-size-2xl', 'theme-typography-weight-bold', 'mb-2']">
          Create Account
        </h2>
        <p :class="'theme-colors-text-secondary'">
          Enter your email to get started
        </p>
      </div>

      <div class="mb-6">
        <dxButton
          variant="outline"  
          size="lg"
          fullWidth
          :disabled="isSubmitting || isGoogleLoading"
          :loading="isGoogleLoading"
          @click="handleGoogleSignup"
          :ringClass="'theme-interactions-focus'"
        >
          <dxIcon name="ri:google-fill" customClass="mr-2 theme-components-button-icon-secondary" /> 
          Sign up with Google
        </dxButton>
      </div>

      <div class="flex items-center gap-3 mb-6">
        <div class="glow-line flex-1"></div>
        <div :class="['theme-colors-text-secondary', 'theme-typography-size-sm']">or</div>
        <div class="glow-line flex-1"></div>
      </div>

      <dxForm
        :onSubmit="handleEmailSubmit"
        validateOnSubmit
      >
        <div class="mb-4">
          <dxInput
            v-model="formData.email"
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

        <label for="register-simple-terms" class="flex items-center mb-6 cursor-pointer">
          <dxCheckbox
            id="register-simple-terms"
            v-model="formData.agreeToTerms"
            required
            class="mr-2"
            :disabled="isSubmitting"
            size="md"
          />
          <span :class="['theme-colors-text-secondary', 'theme-typography-size-sm']">
            I agree to the Terms of Service
          </span>
        </label>

        <dxButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          fullWidth
          :ringClass="'theme-interactions-focus'"
          customClass="theme-components-button-spacing-lg" 
        >
          <dxIcon name="ri:user-add-line" customClass="mr-2 theme-components-button-icon-primary" />
          Create Account
        </dxButton>
      </dxForm>

      <dxFlex direction="row" customClass="mt-6 w-full">
        <span class="w-full flex justify-between items-center text-sm">
          <span :class="'theme-colors-text-secondary'">Already have an account?</span>
          <dxButton
            variant="link"
            size="sm"
            @click="handleLogin"
            customClass="p-0 h-auto font-medium"
            :disabled="isSubmitting"
            :ringClass="'theme-interactions-focus'"
          >
              Sign In
          </dxButton>
        </span>
      </dxFlex>
    </dxCard>

  </AuthContainer>
</template>

<style scoped>
.glow-line {
  height: 1px;
  background: linear-gradient(90deg, rgba(97,97,97,0), rgba(97,97,97,0.5), rgba(97,97,97,0));
}
.dark .glow-line {
  background: linear-gradient(90deg, rgba(163,163,163,0), rgba(163,163,163,0.5), rgba(163,163,163,0));
}
</style>
