// src/modules/auth/composables/useAuthForm.ts
import { ref, onMounted, watch, nextTick } from 'vue'
import { useMessages } from '@/shared/composables/useMessages'
import { useAppStore, useAuthStore } from '@/core/store'
import { useApi } from '@/shared/composables/useApi'
import { TwoFactorMethod } from '@/modules/auth/constants'

export type AuthFormEvents = {
  'login-success': (payload?: { redirectPath?: string }) => void;
  'login-failed': (error: any) => void;
  'register-requested': () => void;
  'forgot-password-requested': () => void;
  '2fa-required': (payload: { type: string }) => void;
  '2fa-verification-failed': (error: any) => void;
  'google-login-success': (payload?: { redirectPath?: string }) => void;
  'google-login-failed': (error: any) => void;
}

export function useAuthForm(emit: <K extends keyof AuthFormEvents>(event: K, ...args: Parameters<AuthFormEvents[K]>) => void) {
  const { errorMessage, successMessage } = useMessages()
  const authStore = useAuthStore()
  const appStore = useAppStore()

  const showPassword = ref(false)
  const isSubmitting = ref(false)
  const requiresTwoFactor = ref(false)
  const tempToken = ref('')
  const twoFactorCode = ref(['', '', '', '', '', ''])
  const isVerifying = ref(false)
  // Get preferred 2FA method from user settings or use EMAIL as default
  const twoFactorType = ref(TwoFactorMethod.EMAIL)
  const formData = ref({
    email: '',
    password: '',
    remember: false
  })

  const loadInitialData = () => {
    const savedCredentials = appStore.credentials
    if (savedCredentials.remember) {
      formData.value.email = savedCredentials.email
      formData.value.password = savedCredentials.password
      formData.value.remember = true
    }
  }

  watch(() => formData.value.remember, (newValue) => {
    if (!newValue) {
      appStore.clearUserCredentials()
    }
  })

  const togglePassword = (): void => {
    showPassword.value = !showPassword.value
  }

  const handleSubmit = async (): Promise<void> => {
    if (isSubmitting.value) return
    isSubmitting.value = true

    try {
      const { data, error } = await authStore.login({
        email: formData.value.email,
        password: formData.value.password,
      })

      logger.debug('Login response:', data, error) // Debugger
      
      if (error) {
        errorMessage(typeof error === 'string' ? error : 'Login failed.')
        emit('login-failed', error)
      } else if (data.requiresEmailVerification) {
        // Handle case when email verification is required
        logger.debug('Email verification required:', data)
        const userEmail = data.email || formData.value.email
        
        // Automatically send verification email and show simple success message
        try {
          const { data: verificationData, error: verificationError } = await useApi('auth/verify/send').post({
            email: userEmail,
            type: 'registration',
            channel: 'email',
            method: 'link'
          })
          
          if (verificationError) {
            errorMessage('Failed to send verification email. Please try again later.')
          } else {
            successMessage('Verification email sent. Please check your inbox and follow the link to verify your account.')
          }
        } catch (err) {
          logger.error('Failed to send verification email:', err)
          errorMessage('Failed to send verification email. Please try again later.')
        }
        
        emit('login-failed', { error: 'Email not verified' })
      } else if (data.requiresTwoFactor) {
        requiresTwoFactor.value = true
        tempToken.value = data.tempToken

        logger.debug('2FA data:', data)
        // Use server-provided 2FA type from response, or EMAIL as fallback
        twoFactorType.value = data.twoFactorType || data.method || TwoFactorMethod.EMAIL
        emit('2fa-required', { type: twoFactorType.value })
      } else {
        if (formData.value.remember) {
          appStore.saveUserCredentials(formData.value.email, '')
        }

        emit('login-success', { redirectPath: '/dashboard' });
      }
    } catch (err: any) {
      logger.error('Unexpected login error:', err)
      errorMessage(err.message || 'An unexpected error occurred.')
      emit('login-failed', { error: err.message || 'Unexpected error' })
    } finally {
      isSubmitting.value = false
    }
  }

  const handleDigidxInputLogic = (index: number): { autoSubmit: boolean } => {
    let autoSubmit = false;
    if (!/^\d?$/.test(twoFactorCode.value[index])) {
        twoFactorCode.value[index] = '';
        return { autoSubmit };
    }
    const isComplete = twoFactorCode.value.every(digit => digit !== '');
    if (isComplete) {
        autoSubmit = true;
    }
    return { autoSubmit };
  }

  const handleKeyDownLogic = (event: KeyboardEvent, index: number): { moveFocus: 'prev' | 'next' | 'none' } => {
    if (event.key === 'Backspace') {
        if (!twoFactorCode.value[index] && index > 0) {
            return { moveFocus: 'prev' };
        }
    } else if (event.key === 'ArrowLeft' && index > 0) {
         return { moveFocus: 'prev' };
    } else if (event.key === 'ArrowRight' && index < 5) {
         return { moveFocus: 'next' };
    }
    return { moveFocus: 'none' };
  }

  const handlePasteLogic = (pastedText: string): { focusIndex: number, autoSubmit: boolean } => {
    const digits = pastedText.replace(/\D/g, '').slice(0, 6).split('');
    digits.forEach((digit, i) => {
        if (i < 6) {
            twoFactorCode.value[i] = digit;
        }
    });
    const nextEmptyIndex = twoFactorCode.value.findIndex((d, i) => i >= digits.length && !d);
    const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : Math.min(digits.length, 5);
    const autoSubmit = twoFactorCode.value.every(digit => digit !== '');
    return { focusIndex, autoSubmit };
  }

  const handleVerify2FA = async (): Promise<void> => {
    if (twoFactorCode.value.some(digit => !digit) || isVerifying.value) return
    isVerifying.value = true
    try {
      const code = twoFactorCode.value.join('')
      const { data, error } = await authStore.verify2FA(
        tempToken.value,
        code,
        twoFactorType.value
      )

      if (error) {
        errorMessage(typeof error === 'string' ? error : '2FA verification failed.')
        emit('2fa-verification-failed', { error })
      } else {
        if (formData.value.remember) {
           appStore.saveUserCredentials(formData.value.email, '')
        }
        emit('login-success', { redirectPath: '/dashboard' })
      }
    } catch (err: any) {
      logger.error('2FA verification error:', err)
      errorMessage(err.message || 'Failed to verify 2FA code.')
      emit('2fa-verification-failed', { error: err.message || 'Unexpected error' })
    } finally {
      isVerifying.value = false
    }
  }

  const onCreateAccount = () => {
    emit('register-requested')
  }

  const onForgotPassword = () => {
    emit('forgot-password-requested')
  }

  // Handle Google login success
  const onGoogleLoginSuccess = (payload?: { redirectPath?: string }) => {
    emit('login-success', payload)
  }

  // Handle Google login failure
  const onGoogleLoginFailed = (error: any) => {
    emit('login-failed', error)
  }

  return {
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
  }
}
