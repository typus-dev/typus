<route lang="json">
  {
    "name": "register",
    "meta": {
      "layout": "public",
      "title": "Register",
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
import { useAuthStore } from '@/core/store'
import { initGoogleAuth, getGoogleOAuthToken } from '@/shared/utils/googleAuth'

const props = defineProps({
  demo: {
    type: Boolean,
    default: false
  }
})

const { errorModal, successModal } = useModals()
const router = useRouter()
const authStore = useAuthStore()
const showPassword = ref(false)
const isSubmitting = ref(false)
const isGoogleLoading = ref(false)
  
const formData = ref({
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeToTerms: false
})
  
const togglePassword = () => {
  showPassword.value = !showPassword.value
}
  
const handleSubmit = async (valid: boolean): Promise<void> => {
  if (!valid) return

  if (formData.value.password !== formData.value.confirmPassword) {
    errorModal('Passwords do not match')
    return
  }

  if (!formData.value.agreeToTerms) {
    errorModal('You must agree to the Terms of Service')
    return
  }

  isSubmitting.value = true

  if (props.demo) {
    // In demo mode, just simulate API call
    setTimeout(() => {
      successModal('Demo Registration successful! This is just a simulation.')
      router.push({ path: '/demo/login-form' })
      isSubmitting.value = false
    }, 1000)
    return
  }

  try {
    const { data, error } = await useApi('auth/signup').post({
      fullName: formData.value.fullName,
      email: formData.value.email,
      password: formData.value.password,
      registrationType: 'regular'
    })

    if (error) {
      errorModal(error)
      isSubmitting.value = false
      return
    }

    logger.debug('Registration successful:', data)
    successModal(
      data.message || 'Registration successful! Please check your email to verify your account.'
    )
    router.push({ name: 'login' })

  } catch (err) {
    logger.error('Registration submit error:', err)
    errorModal('An unexpected error occurred during registration.')
  } finally {
    isSubmitting.value = false
  }
}
  
const handleGoogleSignUp = async () => {
  if (isSubmitting.value || isGoogleLoading.value || props.demo) return
  
  isGoogleLoading.value = true
  try {
    // Initialize Google Auth API
    await initGoogleAuth()
    
    // Get Google OAuth token
    const token = await getGoogleOAuthToken()
    
    // Send token to backend
    const { data, error } = await authStore.googleLogin(token)
    
    if (error) {
      errorModal(typeof error === 'string' ? error : 'Google sign-up failed')
    } else {
      successModal('Successfully signed up with Google')
      router.push('/dashboard')
    }
  } catch (err: any) {
    logger.error('Google sign-up error:', err)
    errorModal(err.message || 'Failed to authenticate with Google')
  } finally {
    isGoogleLoading.value = false
  }
}

const handleLogin = () => {
  if (props.demo) {
    router.push({ path: '/demo/login-form' })
    return
  }
  router.push({ name: 'login' })
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
            Demo Mode: This is a preview of the registration interface. No actual account will be created.
          </p>
        </div>
      </div>
    </div>

    <dxCard variant="elevated">
      <div class="text-center mb-8">
        <h2 :class="['theme-colors-text-primary', 'theme-typography-size-2xl', 'theme-typography-weight-bold', 'mb-2']">Create Account</h2>
        <p :class="['theme-colors-text-secondary', 'theme-typography-size-md']">Enter your details to get started</p>
      </div>

      <div class="mb-6">
        <dxButton
          variant="outline"
          size="lg"
          fullWidth  
          customClass="social-btn w-full py-3 flex items-center justify-center rounded-lg"
          :disabled="isSubmitting || isGoogleLoading || demo"
          :loading="isGoogleLoading"
          @click="handleGoogleSignUp"
          :ringClass="'theme-interactions-focus'"
        >
          <dxIcon name="ri:google-fill" customClass="mr-2 theme-components-button-icon-secondary" />
          Sign up with Google
        </dxButton>
      </div>
  
      <!-- Separator -->
      <div class="flex items-center gap-3 mb-6">
        <div class="glow-line flex-1"></div>
        <div :class="['theme-colors-text-secondary', 'theme-typography-size-sm']">or</div>
        <div class="glow-line flex-1"></div>
      </div>
  
      <!-- Registration Form -->
      <dxForm :onSubmit="handleSubmit" validateOnSubmit>
        <!-- Full Name -->
        <div class="mb-4">
          <dxInput
            v-model="formData.fullName"
            label="Full Name"
            type="text"
            required
            clearable
            labelPosition="floating"
            placeholder=" "
            size="lg"
            :disabled="isSubmitting"
            autocomplete="name"
            name="fullName"
          />
        </div>
  
        <!-- Email -->
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
  
        <!-- Password -->
        <div class="mb-4">
          <dxInput
            v-model="formData.password"
            label="Password"
            :type="showPassword ? 'text' : 'password'"
            required
            labelPosition="floating"
            placeholder=" "
            autocomplete="new-password"
            name="password"
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
  
        <!-- Confirm Password -->
        <div class="mb-6">
          <dxInput
            v-model="formData.confirmPassword"
            label="Confirm Password"
            :type="showPassword ? 'text' : 'password'"
            required
            labelPosition="floating"
            placeholder=" "
            autocomplete="none-password"
            name="confirmPassword"
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
  
        <!-- Terms Agreement -->
        <label for="register-terms" class="flex items-center mb-6 cursor-pointer">
          <dxCheckbox
            id="register-terms"
            v-model="formData.agreeToTerms"
            required
            class="mr-2"
            :disabled="isSubmitting"
            size="md"
          />
          <span :class="['theme-colors-text-secondary', 'theme-typography-size-sm']">I agree to the Terms of Service</span>
        </label>
  
        <!-- Submit Button -->
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
  
      <!-- Bottom Link -->
      <dxFlex direction="row" customClass="mt-6 w-full">
        <span class="w-full flex justify-between items-center" :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
          <span>Already have an account?</span>
          <dxButton
            variant="link"
            size="sm"
            :disabled="isSubmitting"
            @click="handleLogin"
            customClass="p-0 h-auto font-medium"
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
  background: linear-gradient(90deg,
      rgba(97, 97, 97, 0),
      rgba(97, 97, 97, 0.5),
      rgba(97, 97, 97, 0));
}

.dark .glow-line {
  background: linear-gradient(90deg, rgba(163,163,163,0), rgba(163,163,163,0.5), rgba(163,163,163,0));
}
</style>
