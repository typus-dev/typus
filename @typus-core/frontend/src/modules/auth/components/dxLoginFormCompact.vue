<!-- src/modules/auth/components/TLoginForm.vue -->
<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useAuthForm, type AuthFormEvents } from '@/modules/auth/composables/useAuthForm'
import { DEFAULT_2FA_METHOD, TWO_FACTOR_METHOD_OPTIONS, TwoFactorMethod } from '@/modules/auth/constants'


// Define emits based on the events triggered by the composable
const emit = defineEmits<AuthFormEvents>()

// Use the composable, passing the emit function
const { // Use Auth Form composable
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
  onForgotPassword
} = useAuthForm(emit as any) // Cast emit to any to resolve type incompatibility

// --- UI Specific State (Refs for 2FA focusing) ---
const codeInputRefs = ref<HTMLInputElement[]>([])

// --- UI Specific Methods for 2FA ---

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
    const pastedText = event.clipboardData.getData('text'); // Get pasted text
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
  <div> <!-- Root element -->
    <!-- Standard Login Form View (using standard dxInput, dxButton appearances) -->
    <dxForm v-if="!requiresTwoFactor" :onSubmit="handleSubmit" validateOnSubmit actionsAlign="center">
      <dxInput
        v-model="formData.email"
        label="Email"
        type="email"
        required
        clearable
        labelPosition="floating"
        placeholder="Enter your email"
        autocomplete="email"
        name="email"
        :disabled="isSubmitting"
      />

      <dxInput
        v-model="formData.password"
        label="Password"
        :type="showPassword ? 'text' : 'password'"
        required
        labelPosition="floating"
        placeholder="Enter your password"
        autocomplete="no-password"
        name="password"
        :disabled="isSubmitting"
      >
        <template #suffix>
          <dxIcon
            size="sm"
            :name="showPassword ? 'ri:eye-off-line' : 'ri:eye-line'"
            class="cursor-pointer text-gray-500 hover:text-gray-700"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="togglePassword"
          />
        </template>
      </dxInput>

       <dxFlex direction="row" justify="between" align="center" customClass="mb-4 -mt-2">
            <dxCheckbox
              v-model="formData.remember"
              label="Remember me"
              size="sm"
              customClass="text-xs"
              :disabled="isSubmitting"
            />
            <dxButton
                variant="link"
                size="sm"
                :disabled="isSubmitting"
                @click="onForgotPassword"
            >
               Forgot password?
            </dxButton>
        </dxFlex>


      <dxStack customClass="mt-6 w-full" spacing="3">
        <dxButton type="submit" customClass="w-full" :loading="isSubmitting" :disabled="isSubmitting">
            Sign In
        </dxButton>
        <!-- Optional: Standard Google Button Appearance -->
        <!--
        <dxButton variant="outline" customClass="w-full" :disabled="isSubmitting">
          <dxIcon name="ri:google-fill" customClass="mr-2" />
          Continue with Google
        </dxButton>
        -->
      </dxStack>

       <dxFlex direction="row" justify="center" customClass="mt-6">
            <span class="text-sm text-gray-600">
                Don't have an account?
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

    </dxForm>

    <!-- 2FA Form View (Identical logic, potentially different styling if needed via props/theme) -->
    <div v-else>
      <dxStack spacing="4" align="center">
        <div class="text-center">
          <h4 class="text-xl font-semibold mb-1">Two-Factor Authentication</h4>
          <p class="text-gray-600 text-sm">
            Enter the 6-digit code from your {{ twoFactorType === TwoFactorMethod.EMAIL ? 'email' : 'authenticator app' }}.
          </p>
        </div>

        <div class="flex justify-center gap-2 my-4" @paste="handlePaste">
          <input
            v-for="index in 6"
            :key="index"
            :ref="el => { if (el) codeInputRefs[index - 1] = el as HTMLInputElement }"
            v-model="twoFactorCode[index - 1]"
            type="text"
            inputmode="numeric"
            maxlength="1"
            :disabled="isVerifying"
            class="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl border border-gray-300 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition duration-150 ease-in-out disabled:opacity-50 disabled:bg-gray-100"
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
  </div>
</template>

<style scoped>
/* No specific styles needed here usually, relies on theme and component defaults */
input[type="text"][inputmode="numeric"] {
  text-align: center;
}
</style>
