<route lang="json">
  {
    "name": "set-password-form",
    "meta": {
      "layout": "public",
      "title": "Set password",
      "subject": "auth",
      "requiresAuth": false
    }
  }
  </route>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useModals } from '@/shared/composables/useModals'
  import { useApi } from '@/shared/composables/useApi'
  
  
  const props = defineProps({
    demo: {
      type: Boolean,
      default: false
    }
  })
  
  const route = useRoute()
  const router = useRouter()
  const { successModal, errorModal } = useModals()
  
  const loading = ref(true)
  const tokenValid = ref(false)
  const isSubmitting = ref(false)
  const showPassword = ref(false)
  const userEmail = ref('')
  
  const formData = ref({
    password: '',
    confirmPassword: ''
  })
  
  const token = ref(route.query.token as string || 'demo-token')
  
  const togglePassword = () => {
    showPassword.value = !showPassword.value
  }
  
  const verifyToken = async () => {
    if (props.demo) {
      // In demo mode, skip verification and show the form
      loading.value = false
      tokenValid.value = true
      return
    }
  
    if (!token.value) {
      tokenValid.value = false
      loading.value = false
      return
    }
  
    loading.value = true
  
    try {
      const { data, error } = await useApi('auth/verify/token').post({
        token: token.value,
        type: 'password-reset'
      })
  
      if (error) {
        logger.error('Token verification error:', error)
        tokenValid.value = false
      } else {
        tokenValid.value = true
        if (data?.user?.email) {
          userEmail.value = data.user.email
        }
      }
    } catch (err) {
      logger.error('Token verification request error:', err)
      tokenValid.value = false
    } finally {
      loading.value = false
    }
  }
  
  const handleSubmit = async (valid: boolean) => {
    if (!valid) return
  
    if (props.demo) {
      // In demo mode, just show a success message without API call
      successModal('This is a demo. In a real environment, your password would be reset.')
      return
    }
  
    if (formData.value.password !== formData.value.confirmPassword) {
      errorModal('Passwords do not match')
      return
    }
  
    if (formData.value.password.length < 8) {
       errorModal('Password must be at least 8 characters long.')
       return
    }
  
    isSubmitting.value = true
  
    try {
      const { data, error } = await useApi('auth/password/reset').post({
        token: token.value,
        newPassword: formData.value.password
      })
  
      if (error) {
        errorModal(error || 'Failed to reset password. Please try again.')
        return
      }
  
      successModal(data?.message || 'Password reset successfully!')
  
      setTimeout(() => {
        router.push({
          path: '/auth/login',
          query: userEmail.value ? { email: userEmail.value } : undefined
        })
      }, 1500)
  
    } catch (err) {
      logger.error('Password reset submission error:', err)
      errorModal('An unexpected error occurred. Please try again.')
    } finally {
      isSubmitting.value = false
    }
  }
  
  const redirectToForgotPassword = () => {
    router.push('/auth/forgot-password')
  }
  
  onMounted(() => {
    verifyToken()
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
              Demo Mode: This is a preview of the password reset interface. No actual changes will be made to your account.
            </p>
          </div>
        </div>
      </div>
  
      <dxCard variant="elevated">
        <!-- Loading state -->
        <div v-if="loading" class="text-center py-8">
          <div class="flex flex-col items-center justify-center">
            <dxSpinner size="lg" customClass="mb-4" />
            <p :class="'theme-colors-text-secondary'">Verifying your request...</p>
          </div>
        </div>
  
        <!-- Password reset form (now showing in both valid token and demo mode) -->
        <div v-else-if="tokenValid || demo">
          <div class="text-center mb-8">
            <h2 :class="['theme-colors-text-primary', 'text-2xl font-bold mb-2']">
              Set New Password
            </h2>
            <p :class="'theme-colors-text-secondary'">Create a new password for your account</p>
          </div>
  
          <dxForm :onSubmit="handleSubmit" validateOnSubmit>
            <div class="mb-4">
              <dxInput
                v-model="formData.password"
                label="New Password"
                :type="showPassword ? 'text' : 'password'"
                required
                labelPosition="floating"
                placeholder=" "
                autocomplete="new-password"
                size="lg"
                :disabled="isSubmitting"
              >
                <template #suffix>
                  <dxIcon
                    size="sm"
                    :name="showPassword ? 'ri:eye-off-line' : 'ri:eye-line'"
                    :class="['cursor-pointer', 'theme-colors-text-secondary', 'hover:theme-colors-text-primary']"
                    :aria-label="showPassword ? 'Hide password' : 'Show password'"
                    @click="togglePassword"
                  />
                </template>
              </dxInput>
            </div>
  
            <div class="mb-6">
              <dxInput
                v-model="formData.confirmPassword"
                label="Confirm Password"
                :type="showPassword ? 'text' : 'password'"
                required
                labelPosition="floating"
                placeholder=" "
                autocomplete="new-password"
                size="lg"
                :disabled="isSubmitting"
              >
                <template #suffix>
                  <dxIcon
                    size="sm"
                    :name="showPassword ? 'ri:eye-off-line' : 'ri:eye-line'"
                    :class="['cursor-pointer', 'theme-colors-text-secondary', 'hover:theme-colors-text-primary']"
                    :aria-label="showPassword ? 'Hide password' : 'Show password'"
                    @click="togglePassword"
                  />
                </template>
              </dxInput>
            </div>
  
            <dxButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth 
              :loading="isSubmitting"
              :disabled="isSubmitting"
              :customClass="'hover:-translate-y-0.5 hover:shadow-xl transition-transform duration-200'" 
            >
              <dxIcon
                name="ri:lock-password-line"
                customClass="mr-2 theme-components-button-icon-primary"
              />
              Reset Password
            </dxButton>
          </dxForm>
        </div>
  
        <!-- Token invalid state (only shown in non-demo mode) -->
        <div v-else>
          <dxStack spacing="6" align="center">
            <div class="text-center">
              <h2 :class="['theme-colors-text-primary', 'text-2xl font-bold mb-2']">
                Invalid or Expired Link
              </h2>
              <p :class="'theme-colors-text-secondary'">
                The password reset link appears to be invalid or has expired. Please request a new
                password reset link.
              </p>
            </div>
  
            <dxButton
              size="lg"
              variant="primary"
              fullWidth
              @click="redirectToForgotPassword"
              :customClass="'hover:-translate-y-0.5 hover:shadow-xl transition-transform duration-200'" 
            >
              Request New Link
            </dxButton>
          </dxStack>
        </div>
      </dxCard>
    </AuthContainer>
  </template>