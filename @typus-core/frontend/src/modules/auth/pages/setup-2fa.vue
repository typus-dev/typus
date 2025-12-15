<route lang="json">
  {
    "name": "setup-2fa",
    "meta": {
      "layout": "private",
      "title": "Two-Factor Authentication",
      "subject": "auth",
      "requiresAuth": true
    }
  }
</route>
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/core/store/authStore'
import { useModals } from '@/shared/composables/useModals'
import { useApi } from '@/shared/composables/useApi'
import dxQRCode from '@/components/ui/dxQRCode.vue'
import { DEFAULT_2FA_METHOD, TWO_FACTOR_METHOD_OPTIONS, TwoFactorMethod } from '@/modules/auth/constants'

const router = useRouter()
const route = useRoute()

const props = defineProps({
  demo: {
    type: Boolean,
    default: false
  }
})

const authStore = useAuthStore()
const { successModal, errorModal, confirmModal } = useModals()
// State
const loading = ref(true)
const user = ref({
  id: null,
  email: '',
  isTwoFactorEnabled: false,
  twoFactorMethod: null
})
// Use user's preferred method if available, otherwise use default
const selectedMethod = ref(
  (authStore.user.value?.preferredTwoFactorMethod) || DEFAULT_2FA_METHOD
)
const setupStep = ref(1)
const qrCode = ref('')
const secret = ref('')
const recoveryCodes = ref([])
const verifying = ref(false)
const sendingCode = ref(false)
const codeSent = ref(false)

// Code input
const codeDigits = ref(['', '', '', '', '', ''])
const codeInputRefs = ref([])

// Options
const authMethodOptions = TWO_FACTOR_METHOD_OPTIONS

// Computed
const isCodeComplete = computed(() => {
  return codeDigits.value.every(digit => digit !== '')
})

const fullCode = computed(() => {
  return codeDigits.value.join('')
})

// Methods
const loadUserData = async () => {
  if (props.demo) {
    // In demo mode, use mock data
    loading.value = true
    
    // Set dummy user data
    user.value = {
      id: 'demo-user-id',
      email: 'demo@example.com',
      isTwoFactorEnabled: false,
      twoFactorMethod: null
    }
    
    // Set dummy recovery codes for demo
    recoveryCodes.value = [
      'ABC123DEF456',
      'GHI789JKL012',
      'MNO345PQR678',
      'STU901VWX234',
      'YZA567BCD890'
    ]
    
    loading.value = false
    return
  }
  
  try {
    loading.value = true
    
    // Get user profile
    const { data, error } = await useApi('auth/profile').get()
    
    if (error) {
      errorModal(error || 'Failed to load user data')
      return
    }
    
    // Ensure we're using data.user since that's what the API returns
    const userData = data.user || data
    
    user.value = {
      ...userData,
      isTwoFactorEnabled: !!userData.isTwoFactorEnabled,
      twoFactorMethod: userData.twoFactorMethod || TwoFactorMethod.EMAIL
    }
    
    // If 2FA is already enabled, load recovery codes
    if (user.value.isTwoFactorEnabled) {
      await loadRecoveryCodes()
    }
  } catch (err) {
    logger.error('Error loading user data:', err)
    errorModal('Failed to load user data')
  } finally {
    loading.value = false
  }
}

const loadRecoveryCodes = async () => {
  if (props.demo) {
    // In demo mode, use mock data
    recoveryCodes.value = [
      'ABC123DEF456',
      'GHI789JKL012',
      'MNO345PQR678',
      'STU901VWX234',
      'YZA567BCD890'
    ]
    return
  }
  
  try {
    const { data, error } = await useApi('auth/2fa/recovery-codes').get()
    
    if (error) {
      logger.error('Error loading recovery codes:', error)
      return
    }
    
    recoveryCodes.value = data.codes || []
  } catch (err) {
    logger.error('Error loading recovery codes:', err)
  }
}

const initiate2FASetup = async () => {
  if (props.demo) {
    // In demo mode, use mock data
    if (selectedMethod.value === TwoFactorMethod.APP) {
      qrCode.value = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
      secret.value = 'DEMO12345ABCDE'
    }
    return
  }
  
  try {
    const { data, error } = await useApi('auth/2fa/setup').post({
      type: selectedMethod.value
    })
    
    if (error) {
      errorModal(error || 'Failed to initiate 2FA setup')
      return
    }
    
    if (selectedMethod.value === TwoFactorMethod.APP) {
      // Store the otpauth URL or generate one from the secret
      if (data.otpauthUrl) {
        qrCode.value = data.otpauthUrl
        secret.value = data.secret
      } else if (data.secret) {
        secret.value = data.secret
        // Generate a generic otpauth URL with the secret
        qrCode.value = `otpauth://totp/App:${user.value.email}?secret=${data.secret}&issuer=App`
      }
    }
  } catch (err) {
    logger.error('Error initiating 2FA setup:', err)
    errorModal('Failed to initiate 2FA setup')
  }
}

const sendVerificationCode = async () => {
  if (props.demo) {
    // In demo mode, show success message without API call
    sendingCode.value = true
    setTimeout(() => {
      successModal('This is a demo. In a real environment, a verification code would be sent to your email.')
      codeSent.value = true
      sendingCode.value = false
      
      // Focus on first input
      if (codeInputRefs.value[0]) {
        codeInputRefs.value[0].focus()
      }
    }, 1000)
    return
  }
  
  try {
    sendingCode.value = true
    
    // Include either userId or email (or both) to satisfy the API requirement
    const payload: {
      type: string;
      channel: string;
      method: string;
      userId?: number | string;
      email?: string;
    } = {
      type: '2fa',
      channel: 'email',
      method: 'code'
    }
    
    // Add userId if available, otherwise use email
    if (user.value.id) {
      payload.userId = user.value.id
    } else if (user.value.email) {
      payload.email = user.value.email
    }
    
    const { data, error } = await useApi('auth/verify/send').post(payload)
    
    if (error) {
      errorModal(error || 'Failed to send verification code')
      return
    }
    
    successModal(data?.message || 'Verification code sent to your email')
    codeSent.value = true
    
    // Focus on first input
    if (codeInputRefs.value[0]) {
      codeInputRefs.value[0].focus()
    }
  } catch (err) {
    logger.error('Error sending verification code:', err)
    errorModal('Failed to send verification code')
  } finally {
    sendingCode.value = false
  }
}

const verifyAndEnable2FA = async () => {
  if (!isCodeComplete.value) return
  
  if (props.demo) {
    // In demo mode, show success message without API call
    verifying.value = true
    setTimeout(() => {
      successModal('This is a demo. In a real environment, 2FA would be enabled.')
      
      // Update user data for demo
      user.value.isTwoFactorEnabled = true
      user.value.twoFactorMethod = selectedMethod.value
      
      // Reset setup state
      setupStep.value = 1
      codeDigits.value = ['', '', '', '', '', '']
      codeSent.value = false
      verifying.value = false
    }, 1000)
    return
  }
  
  try {
    verifying.value = true
    
    const { data, error } = await useApi('auth/2fa/enable').post({
      token: fullCode.value,
      type: selectedMethod.value
    })
    
    if (error) {
      errorModal(error || 'Failed to enable 2FA')
      return
    }
    
    successModal(data?.message || 'Two-factor authentication enabled successfully')
    
    // Update user data
    user.value.isTwoFactorEnabled = true
    user.value.twoFactorMethod = selectedMethod.value
    
    // Update auth store
    authStore.updateUser({ isTwoFactorEnabled: true, twoFactorMethod: selectedMethod.value })
    
    // Load recovery codes
    await loadRecoveryCodes()
    
    // Reset setup state
    setupStep.value = 1
    codeDigits.value = ['', '', '', '', '', '']
    codeSent.value = false
    
    // Check if we should return to profile page
    if (route.query.returnToProfile === 'true') {
      // Wait a moment for the user to see the success message
      setTimeout(() => {
        router.push({ path: '/profile' })
      }, 1500)
    }
  } catch (err) {
    logger.error('Error enabling 2FA:', err)
    errorModal('Failed to enable 2FA')
  } finally {
    verifying.value = false
  }
}

const confirmDisable2FA = async () => {
  const confirmed = await confirmModal( // Confirm 2FA disable
    'Are you sure you want to disable two-factor authentication? This will make your account less secure.',
    {
      title: 'Disable Two-Factor Authentication',
      confirmText: 'Disable 2FA',
      cancelText: 'Cancel',
      type: 'danger'
    }
  )
  
  if (!confirmed) return
  
  if (props.demo) {
    // In demo mode, show success message without API call
    setTimeout(() => {
      successModal('This is a demo. In a real environment, 2FA would be disabled.')
      
      // Update user data for demo
      user.value.isTwoFactorEnabled = false
      user.value.twoFactorMethod = null
      
      // Reset recovery codes for demo
      recoveryCodes.value = []
    }, 500)
    return
  }
  
  try {
    const { data, error } = await useApi('auth/2fa/disable').post({
      type: user.value.twoFactorMethod
    })
    
    if (error) {
      errorModal(error || 'Failed to disable 2FA')
      return
    }
    
    successModal(data?.message || 'Two-factor authentication disabled successfully')
    
    // Update user data
    user.value.isTwoFactorEnabled = false
    user.value.twoFactorMethod = null
    
    // Update auth store
    authStore.updateUser({ isTwoFactorEnabled: false, twoFactorMethod: null })
    
    // Reset recovery codes
    recoveryCodes.value = []
    
    // Check if we should return to profile page
    if (route.query.returnToProfile === 'true') {
      // Wait a moment for the user to see the success message
      setTimeout(() => {
        router.push({ path: '/profile' })
      }, 1500)
    }
  } catch (err) {
    logger.error('Error disabling 2FA:', err)
    errorModal('Failed to disable 2FA')
  }
}

const downloadRecoveryCodes = () => {
  if (!recoveryCodes.value.length) return
  
  const content = recoveryCodes.value.join('\n')
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = '2fa-recovery-codes.txt'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Code input handlers
const handleDigidxInput = (index) => {
  // Move to next input after entering a digit
  if (codeDigits.value[index] && index < 5) {
    codeInputRefs.value[index + 1].focus()
  }
  
  // Auto-submit when all digits are filled
  if (index === 5 && isCodeComplete.value) {
    verifyAndEnable2FA()
  }
}

const handleKeyDown = (event, index) => {
  // Handle backspace
  if (event.key === 'Backspace') {
    if (!codeDigits.value[index] && index > 0) {
      codeDigits.value[index - 1] = ''
      codeInputRefs.value[index - 1].focus()
    }
  }
}

const handlePaste = (event) => {
  event.preventDefault()
  const pastedText = event.clipboardData.getData('text') // Get pasted text
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

// Watch for method change
const handleMethodChange = () => {
  // Reset setup when method changes
  setupStep.value = 1
  codeDigits.value = ['', '', '', '', '', '']
  codeSent.value = false
  
  // Initialize setup for the selected method
  initiate2FASetup()
}

// Lifecycle hooks
onMounted(async () => {
  await loadUserData()
  
  // If 2FA is not enabled, initialize setup
  if (!user.value.isTwoFactorEnabled) {
    await initiate2FASetup()
  }
})

// Watch for method changes
watch(selectedMethod, handleMethodChange)
</script>


<template>
  <div class="max-w-3xl mx-auto p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-semibold">Two-Factor Authentication</h2>
      <dxButton 
        v-if="route.query.returnToProfile === 'true'"
        variant="outline" 
        size="sm"
        @click="router.push({ path: '/profile' })"
      >
        <dxIcon name="arrow-left" size="sm" class="mr-1" />
        Return to Profile
      </dxButton>
    </div>
    
    <!-- Demo notice -->
    <div v-if="demo" class="border-l-4 p-4 mb-6" :class="['theme-colors-background-info', 'border-theme-colors-border-info']">
                <div class="flex">
        <div class="flex-shrink-0">
          <dxIcon name="info-circle" :class="'theme-colors-text-info'" />
        </div>
        <div class="ml-3">
          <p class="text-sm" :class="'theme-colors-text-secondary'">
            Demo Mode: This is a preview of the 2FA setup interface. No actual changes will be made to your account.
          </p>
        </div>
      </div>
    </div>
    
    <!-- Loading state -->
    <div v-if="loading" class="text-center py-8">
      <dxSpinner size="lg" customClass="mb-4" />
      <p :class="'theme-colors-text-secondary'">Loading...</p>
    </div>
    
    <!-- 2FA disabled state -->
    <div v-else-if="!user.isTwoFactorEnabled">
      <dxCard>
        <template #header>
          <div class="flex items-center">
            <dxIcon name="shield" size="md" :class="['mr-2', 'theme-colors-text-accent']" />
            <h3 class="text-xl font-medium" :class="'theme-colors-text-primary'">Enable Two-Factor Authentication</h3>
          </div>
        </template>
        
        <p class="mb-4" :class="'theme-colors-text-secondary'">
          Two-factor authentication adds an extra layer of security to your account. 
          When enabled, you'll need to provide a verification code in addition to your password when signing in.
        </p>
        
        <div class="mb-6">
          <dxRadioGroup
            v-model="selectedMethod"
            label="Authentication Method"
            :options="authMethodOptions"
            customClass="mb-4"
          />
        </div>
        
        <!-- App-based setup -->
        <div v-if="selectedMethod === TwoFactorMethod.APP && setupStep === 1">
          <h4 class="font-medium mb-2" :class="'theme-colors-text-primary'">Step 1: Scan QR Code</h4>
          <p class="mb-4" :class="'theme-colors-text-secondary'">
            Scan this QR code with your authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator).
          </p>
          
          <div v-if="qrCode" class="flex justify-center mb-6">
            <dxQRCode :data="qrCode" :size="200" class="border p-4 rounded" />
          </div>
          
          <div v-if="secret" class="mb-6">
            <p class="text-sm mb-2" :class="'theme-colors-text-secondary'">Or enter this code manually in your app:</p>
            <div :class="['p-3 rounded font-mono text-center', 'theme-colors-background-tertiary']">
              {{ secret }}
            </div>
          </div>
          
          <dxButton @click="setupStep = 2" fullWidth variant="primary" size="lg">
            Next
          </dxButton>
        </div>
        
        <!-- Email-based setup -->
        <div v-if="selectedMethod === TwoFactorMethod.EMAIL && setupStep === 1">
          <h4 class="font-medium mb-2" :class="'theme-colors-text-primary'">Email Authentication</h4>
          <p class="mb-4" :class="'theme-colors-text-secondary'">
            When you sign in, we'll send a verification code to your email address: 
            <span class="font-medium">{{ user.email }}</span>
          </p>
          
          <dxButton @click="setupStep = 2" fullWidth variant="primary" size="lg">
            Next
          </dxButton>
        </div>
        
        <!-- Verification step -->
        <div v-if="setupStep === 2">

      
          <h4 class="font-medium mb-2" :class="'theme-colors-text-primary'">
            Step 2: Verify {{ selectedMethod === TwoFactorMethod.APP ? 'Authenticator App' : 'Email' }}
          </h4>
          <p class="mb-4" :class="'theme-colors-text-secondary'">
            {{ selectedMethod === TwoFactorMethod.APP 
              ? 'Enter the 6-digit code from your authenticator app to verify setup.' 
              : 'We\'ve sent a verification code to your email. Enter it below to enable 2FA.' }}
          </p>
          
          <div v-if="selectedMethod === TwoFactorMethod.EMAIL && !codeSent" class="mb-4">
            <dxButton 
              @click="sendVerificationCode" 
              :loading="sendingCode" 
              fullWidth 
              variant="primary" 
              size="lg"
            >
              Send Verification Code
            </dxButton>
          </div>
          
          <div v-else class="mb-6">
            <!-- Code input -->
            <div class="flex gap-2 justify-center my-4">
              <dxInput
                v-for="(digit, index) in codeDigits"
                :key="index"
                v-model="codeDigits[index]"
                type="text"
                inputmode="numeric"
                :maxlength=1
                :customClass="'w-14 h-14 text-center text-xl'"
                :ref="el => { if (el) codeInputRefs[index] = el }"
                @input="handleDigidxInput(index)"
                @keydown="handleKeyDown($event, index)"
                @paste="handlePaste"
                size="lg"
                :disabled="verifying"
              />
            </div>
            
            <dxButton 
              @click="verifyAndEnable2FA" 
              :loading="verifying" 
              :disabled="!isCodeComplete"
              customClass="mt-4"
              fullWidth
              variant="primary"
              size="lg"
            >
              Enable Two-Factor Authentication
            </dxButton>
          </div>
          
          <dxButton 
            variant="outline" 
            @click="setupStep = 1" 
            customClass="mt-4"
            fullWidth
            size="lg"
          >
            Back
          </dxButton>
        </div>
      </dxCard>
    </div>
    
    <!-- 2FA enabled state -->
    <div v-else>
      <dxCard>
        <template #header>
          <div class="flex items-center">
            <dxIcon name="shield-check" size="md" :class="['mr-2', 'theme-colors-text-success']" />
            <h3 class="text-xl font-medium" :class="'theme-colors-text-primary'">Two-Factor Authentication Enabled</h3>
          </div>
        </template>
        
        <p class="mb-4" :class="'theme-colors-text-secondary'">
          Your account is protected with two-factor authentication using 
          <span class="font-medium">{{ user.twoFactorMethod === TwoFactorMethod.APP ? 'an authenticator app' : 'email verification' }}</span>.
        </p>
        
        <div class="mb-6">
          <h4 class="font-medium mb-2" :class="'theme-colors-text-primary'">Recovery Options</h4>
          <p class="text-sm mb-4" :class="'theme-colors-text-secondary'">
            If you lose access to your {{ user.twoFactorMethod === TwoFactorMethod.APP ? 'authenticator app' : 'email' }}, 
            you can use one of these recovery codes to sign in. Each code can only be used once.
          </p>
          
          <div v-if="recoveryCodes.length" :class="['p-3 rounded font-mono text-sm mb-4', 'theme-colors-background-tertiary']">
            <div v-for="(code, index) in recoveryCodes" :key="index" class="mb-1">
              {{ code }}
            </div>
          </div>
          
          <dxButton 
            variant="outline" 
            size="sm" 
            customClass="mb-4"
            @click="downloadRecoveryCodes"
          >
            <dxIcon name="download" size="sm" class="mr-1" />
            Download Recovery Codes
          </dxButton>
        </div>
        
        <dxButton 
          variant="danger" 
          @click="confirmDisable2FA"
          fullWidth
          size="lg"
        >
          Disable Two-Factor Authentication
        </dxButton>
      </dxCard>
    </div>
  </div>
</template>
