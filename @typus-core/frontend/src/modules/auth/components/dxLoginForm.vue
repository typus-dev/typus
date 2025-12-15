<!-- src/modules/auth/components/TLoginForm.vue -->
<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useAuthForm, type AuthFormEvents } from '@/modules/auth/composables/useAuthForm'
import { useAuthStore, useAppStore } from '@/core/store'
import { initGoogleAuth, getGoogleOAuthToken } from '@/shared/utils/googleAuth'
import { useModals } from '@/shared/composables/useModals'
import { DEFAULT_2FA_METHOD, TWO_FACTOR_METHOD_OPTIONS, TwoFactorMethod } from '@/modules/auth/constants'

const authStore = useAuthStore()
const appStore = useAppStore()
const { errorModal } = useModals()

// Define emits based on the events triggered by the composable
const emit = defineEmits<{
  'login-success': [payload?: { redirectPath?: string }]
  'login-failed': [error: any]
  'register-requested': []
  'forgot-password-requested': []
  '2fa-required': [payload: { type: string }]
  '2fa-verification-failed': [error: any]
  'google-login-success': [payload?: { redirectPath?: string }]
  'google-login-failed': [error: any]
}>()

// Use the composable, passing the emit function
const {
  formData,
  showPassword,
  isSubmitting,
  requiresTwoFactor,
  twoFactorCode,
  isVerifying,
  twoFactorType,
  loadInitialData,
  togglePassword,
  handleSubmit,
  handleDigidxInputLogic,
  handleKeyDownLogic,
  handlePasteLogic,
  handleVerify2FA,
  onCreateAccount,
  onForgotPassword,
  onGoogleLoginSuccess,
  onGoogleLoginFailed
} = useAuthForm(emit)

// --- UI Specific State ---
// Refs for 2FA input focusing
const codeInputRefs = ref<HTMLInputElement[]>([])
const isGoogleLoading = ref(false)

// Handle Google login
const handleGoogleLogin = async () => {
  if (isSubmitting.value || isGoogleLoading.value) return
  
  isGoogleLoading.value = true
  try {
    // Initialize Google Auth API
    await initGoogleAuth()
    
    // Get Google OAuth token
    const token = await getGoogleOAuthToken()
    
    // Send token to backend
    const { data, error } = await authStore.googleLogin(token)
    
    if (error) {
      errorModal(typeof error === 'string' ? error : 'Google login failed')
      onGoogleLoginFailed(error)
    } else {
      if (formData.value.remember) {
        appStore.saveUserCredentials(formData.value.email, '')
      }
      onGoogleLoginSuccess({ redirectPath: '/dashboard' })
    }
  } catch (err: any) {
    logger.error('Google login error:', err)
    errorModal(err.message || 'Failed to authenticate with Google')
    onGoogleLoginFailed(err)
  } finally {
    isGoogleLoading.value = false
  }
}

// --- UI Specific Methods ---

// Call composable's logic and handle UI focus for 2FA input
const handleDigidxInput = (index: number): void => {
  const { autoSubmit } = handleDigidxInputLogic(index) // Get logic result

   // Move focus if needed
   if (twoFactorCode.value[index] && index < 5 && codeInputRefs.value[index + 1]) {
     codeInputRefs.value[index + 1].focus();
   }

  // Trigger verification if composable signaled auto-submit
  if (autoSubmit) {
    handleVerify2FA()
  }
}

// Call composable's logic and handle UI focus for 2FA backspace/arrows
const handleKeyDown = (event: KeyboardEvent, index: number): void => {
  const { moveFocus } = handleKeyDownLogic(event, index) // Get logic result

  // Handle focus movement based on composable's signal
  if (moveFocus === 'prev' && codeInputRefs.value[index - 1]) {
      codeInputRefs.value[index - 1].focus();
  } else if (moveFocus === 'next' && codeInputRefs.value[index + 1]) {
      codeInputRefs.value[index + 1].focus();
  }
}

// Call composable's logic and handle UI focus for 2FA paste
const handlePaste = (event: ClipboardEvent): void => {
    event.preventDefault()
    const pastedText = event.clipboardData?.getData('text') || '';
    const { focusIndex, autoSubmit } = handlePasteLogic(pastedText); // Get logic result

    // Move focus to the correct input after paste
    if (codeInputRefs.value[focusIndex]) {
        codeInputRefs.value[focusIndex].focus();
    }

    // Trigger verification if composable signaled auto-submit
    if (autoSubmit) {
        handleVerify2FA();
    }
}

// --- Lifecycle ---
onMounted(() => {
  loadInitialData() // Load email/remember state from store via composable
})

// Watch requiresTwoFactor to focus the first input when 2FA becomes active
watch(requiresTwoFactor, async (isNowRequired) => {
  if (isNowRequired) {
    await nextTick() // Wait for DOM update
    if (codeInputRefs.value[0]) {
      codeInputRefs.value[0].focus()
    }
  }
})

</script>

<template>
  <!-- TLoginForm.vue -->
   
  <dxCard variant="elevated" >
    <div class="text-center mb-8">
      <h2 :class="['theme-colors-text-primary', 'theme-typography-size-2xl', 'theme-typography-weight-bold', 'mb-2']">Sign in to your account</h2>
      <p :class="['theme-colors-text-secondary', 'theme-typography-size-md']">Access your dashboards and data</p>
    </div>
    <!-- Standard Login Form View -->
    <div v-if="!requiresTwoFactor">
      <!-- Google Button -->
      <div class="mb-6">
        <dxButton
          variant="outline"
          size="lg"
          customClass="social-btn w-full py-3 flex items-center justify-center rounded-lg"
          :disabled="isSubmitting || isGoogleLoading"
          :loading="isGoogleLoading"
          @click="handleGoogleLogin"
        >
          <dxIcon name="ri:google-fill" customClass="mr-2" />
          Sign in with Google
        </dxButton>
      </div>

      <!-- Separator -->
      <div class="flex items-center gap-3 mb-6">
        <div class="glow-line flex-1"></div>
        <div :class="['theme-colors-text-secondary', 'theme-typography-size-sm']">or</div>
        <div class="glow-line flex-1"></div>
      </div>

      <!-- Login Form using dxForm -->
      <dxForm :onSubmit="handleSubmit" validateOnSubmit>
        <!-- Email -->
        <div class="mb-4">
          <dxInput
            id="email"
            v-model="formData.email"
            type="email"
            label="Email"
            placeholder="your@email.com"
            size="lg"
            required
            clearable
            labelPosition="floating"
         
            :disabled="isSubmitting"
            autocomplete="email"
            name="email"
          />
        </div>

        <!-- Password -->
        <div class="mb-6">
           <div class="flex justify-between mb-2">
             <!-- Using dxInput label instead of separate label -->
             <!-- <label class="block text-gray-700 text-sm" for="password">Password</label> -->
             <span :class="['theme-colors-text-secondary', 'theme-typography-size-sm', 'block h-5']"></span> <!-- Placeholder for alignment -->
              <dxButton
                  variant="link"
                  size="sm"
                  :disabled="isSubmitting"
                  @click="onForgotPassword"
                  customClass="text-sm -mt-1 p-0 h-auto"
              >
                  Forgot password?
              </dxButton>
           </div>
          <dxInput
            id="password"
            v-model="formData.password"
            :type="showPassword ? 'text' : 'password'"
            label="Password"
            placeholder="••••••••"
            size="lg"
            required
            labelPosition="floating"
            
            :disabled="isSubmitting"
            autocomplete="no-password"
            name="password"
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

        <!-- Remember Me -->
        <label for="landing-remember" class="flex items-center mb-6 cursor-pointer">
          <dxCheckbox
              id="landing-remember"
              v-model="formData.remember"
              class="mr-2"
              :disabled="isSubmitting"
          />
          <span :class="['theme-colors-text-secondary', 'theme-typography-size-sm']">Remember me</span>
        </label>

        <!-- Submit Button -->
        <dxButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          fullWidth  
          customClass="btn-login w-full py-3 text-white font-medium rounded-lg shadow-lg text-lg flex items-center justify-center hover:-translate-y-0.5 hover:shadow-xl transition-transform duration-200"
        >
          <dxIcon name="ri:login-box-line" customClass="mr-2 text-white" />
          Sign in
        </dxButton>
      </dxForm>


        <dxFlex direction="row" customClass="mt-6 w-full">
          
            <span class="w-full flex justify-between items-center" :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
                <span>Don't have an account?</span> 
                <dxButton
                    variant="link"
                    size="sm"
                    :disabled="isSubmitting"
                    @click="onCreateAccount"
                    customClass="p-0 h-auto font-medium"
                >
                    Create account
                </dxButton>
            </span>
        </dxFlex>

    </div>

    <!-- 2FA Form View - Updated to use dxInput -->
    <div v-else>
      <dxStack spacing="4" align="center">
        <div class="text-center">
          <h4 :class="['theme-typography-size-lg', 'theme-typography-weight-semibold', 'mb-1']">Two-Factor Authentication</h4>
          <p :class="['theme-colors-text-secondary', 'theme-typography-size-sm']">
            Enter the 6-digit code from your {{ twoFactorType === TwoFactorMethod.EMAIL ? 'email' : 'authenticator app' }}.
          </p>
        </div>

        <!-- Updated to use dxInput instead of regular inputs -->
        <div class="flex justify-center gap-2 my-4" @paste="handlePaste">
          <dxInput
            v-for="index in 6"
            :key="index"
            :ref="el => { if (el) codeInputRefs[index - 1] = el.$el.querySelector('input') }"
            v-model="twoFactorCode[index - 1]"
            type="text"
            inputmode="numeric"
            :maxlength="1"
            :disabled="isVerifying"
            size="lg"
            :customClass="'w-10 h-12 sm:w-12 sm:h-14 text-center'"
            @input="handleDigidxInput(index - 1)"
            @keydown="handleKeyDown($event, index - 1)"
          />
        </div>

        <dxButton
          @click="handleVerify2FA"
          :loading="isVerifying"
          :disabled="twoFactorCode.some(digit => !digit) || isVerifying"
          customClass="w-full mt-2"
        >
          Verify Code
        </dxButton>
      </dxStack>
    </div>
  </dxCard>
</template>

<style scoped>


.glow-line {

  height: 1px;
  background: linear-gradient(90deg,
      rgba(97, 97, 97, 0),
      rgba(97, 97, 97, 0.5),
      rgba(97, 97, 97, 0));
}

</style>
