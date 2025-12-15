<route lang="json">
  {
    "name": "login",
    "meta": {
      "layout": "public",
      "title": "Login",
      "subject": "auth",
      "requiresAuth": false
    }
  }
  </route>
  
  <script setup lang="ts">
  import { useRouter } from 'vue-router'
  import TLoginForm from '@/modules/auth/components/dxLoginForm.vue'
  
  import { useAppStore } from '@/core/store/appStore'

  const appStore = useAppStore()

  const props = defineProps({
    demo: {
      type: Boolean,
      default: false
    }
  })
  
  const router = useRouter()
  
  const handleLoginSuccess = (payload?: { redirectPath?: string }) => {
    if (props.demo) {
      logger.debug('Demo login successful')
      router.push('/dashboard')
      return
    }
    
    const redirectTo = payload?.redirectPath || '/dashboard'
    logger.debug(`Login successful (from page), redirecting to: ${redirectTo}`)
    router.push(redirectTo)
  }
  
  const handleRegisterRequest = () => {
    if (props.demo) {
      router.push('/demo/register-form')
      return
    }

    // Get registration type from database config with fallback to env → default
    const registrationType = appStore.getConfig('features.registration_type',
                                                 import.meta.env.VITE_REGISTRATION_TYPE || 'regular')
    const registerPath = registrationType === 'simplified'
      ? '/auth/register-simple'
      : '/auth/register'
    logger.debug(`Redirecting to registration page: ${registerPath} (type: ${registrationType})`)
    router.push(registerPath)
  }
  
  const handleForgotPasswordRequest = () => {
    if (props.demo) {
      router.push('/demo/forgot-password-form')
      return
    }
    
    const forgotPasswordPath = '/auth/forgot-password'
    logger.debug(`Redirecting to forgot password page: ${forgotPasswordPath}`)
    router.push(forgotPasswordPath)
  }
  
  // Event handlers with proper signatures
  const handleLoginFailed = (error?: any) => {
    logger.error('Login failed (handled on page):', error)
  }
  
  const handle2faFailed = (error?: any) => {
    logger.error('2FA verification failed (handled on page):', error)
  }
  
  const handle2faRequired = (payload?: { type: string }) => {
    logger.debug('2FA required:', payload)
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
              Demo Mode: This is a preview of the login interface. No actual authentication will occur.
            </p>
          </div>
        </div>
      </div>
  
      <TLoginForm
        :demo="demo"
        @login-success="handleLoginSuccess"
        @login-failed="handleLoginFailed"
        @register-requested="handleRegisterRequest"
        @forgot-password-requested="handleForgotPasswordRequest"
        @2fa-verification-failed="handle2faFailed"
        @2fa-required="handle2faRequired"
        @google-login-success="handleLoginSuccess"
        @google-login-failed="handleLoginFailed"
      />
    </AuthContainer>
  </template>
  
  <style scoped>
  </style>
