// src/core/store/authStore.ts
import { defineStore } from 'pinia'
import { usePersistStore } from './persistStore'
import { useApi } from '@/shared/composables/useApi'
import { useAbilityStore } from './abilityStore'
import { useTheme } from '@/core/theme/composables/useTheme'
import { TwoFactorMethod } from '@/modules/auth/constants'

interface LoginCredentials {
  email: string
  password: string
}

interface User {
  id: number
  email: string
  // name: string // Removed 'name'
  firstName?: string // Added 'firstName'
  lastName?: string // Added 'lastName'
  avatarUrl?: string
  abilityRules?: any[]
  isTwoFactorEnabled?: boolean // 2FA enabled status
  twoFactorMethod?: TwoFactorMethod | null // 2FA method
}


interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
  requiresTwoFactor?: boolean
  requiresEmailVerification?: boolean
  tempToken?: string
  abilityRules?: any[]
  message?: string
  email?: string
}

export const useAuthStore = defineStore('auth', () => {
  const store = usePersistStore()
  const abilityStore = useAbilityStore()

  function updateUser(newUserData: Partial<User>) {
    const currentUser = user.get();
    if (currentUser) {
      user.set({ ...currentUser, ...newUserData });
      logger.debug('🔑 AUTH STORE: User data updated:', user.get());
      if (newUserData.abilityRules) {
        logger.debug('🔑 AUTH STORE: Updating ability rules from profile update');
        abilityStore.setRules(newUserData.abilityRules);
      }
    } else {
      logger.warn('🔑 AUTH STORE: Attempted to update user data, but no user is currently logged in.');
    }
  }

  const accessToken = {
    get: () => store.get('access_token', ''),
    set: (val: string) => store.set('access_token', val)
  }
  const refreshToken = {
    get: () => store.get('refresh_token', ''),
    set: (val: string) => store.set('refresh_token', val)
  }

  const user = {
    get: () => store.get('user', null),
    set: (val: User | null) => store.set('user', val)
  }

  const isAuthenticated = () => !!accessToken.get()

  function setAuthData(responseData: AuthResponse): void {
    logger.debug('🔑 AUTH STORE: Setting auth data:', responseData)
    const hasToken = typeof responseData.accessToken === 'string' && responseData.accessToken.length > 0;
    const hasRefresh = typeof responseData.refreshToken === 'string' && responseData.refreshToken.length > 0;

    if (hasToken) {
      accessToken.set(responseData.accessToken)
    }
    if (hasRefresh) {
      refreshToken.set(responseData.refreshToken)
    }
    if (responseData.user) {
      user.set(responseData.user)
    }

    // Support abilityRules at root or inside user
    const abilityRules =
      responseData.abilityRules ??
      responseData.user?.abilityRules ??
      []

    if (abilityRules && Array.isArray(abilityRules) && abilityRules.length > 0) {
      logger.debug('🔑 AUTH STORE: Setting ability rules:', JSON.stringify(abilityRules, null, 2))
      abilityStore.setRules(abilityRules)
    } else {
      logger.warn('🔑 AUTH STORE: No ability rules found in response')
    }

    logger.debug('🔑 AUTH STORE: Stored access token:', accessToken.get())
    logger.debug('🔑 AUTH STORE: Stored refresh token:', refreshToken.get())
    logger.debug('🔑 AUTH STORE: Stored user:', user.get())
  }

  async function login(credentials: LoginCredentials) {
    logger.debug('🔑 AUTH STORE: Login called with credentials:', credentials)

    const { data, error } = await useApi('auth/login').post(credentials)
    logger.debug('🔑 AUTH STORE: Login response:', data, error)

    logger.debug('🔑 AUTH STORE: Raw API response:', data);
    
    // Log verification status
    if (data) {
      logger.debug('🔑 AUTH STORE: Email verification status:', {
        requiresEmailVerification: data.requiresEmailVerification || false,
        requiresTwoFactor: data.requiresTwoFactor || false
      });
    }
    
    if (!error && data && !data.requiresTwoFactor && !data.requiresEmailVerification) {
      logger.debug('🔑 AUTH STORE: User authenticated successfully, setting auth data');
      setAuthData(data)

      // Fetch full user profile after login
      try {
        const { data: profileData, error: profileError } = await useApi('auth/profile').get();
        if (!profileError && profileData) {
          updateUser(profileData);
          logger.debug('🔑 AUTH STORE: User profile updated after login');
        } else {
          logger.warn('🔑 AUTH STORE: Failed to fetch profile after login', profileError);
        }
      } catch (profileErr) {
        logger.error('🔑 AUTH STORE: Error fetching profile after login', profileErr);
      }
    }

    return { data, error }
  }

  async function verify2FA(tempToken: string, code: string, type: string = TwoFactorMethod.EMAIL) {
    logger.debug('Verifying 2FA with code:', code)

    const { data, error } = await useApi('auth/2fa/verify').post({
      tempToken,
      token: code,
      type
    })

    logger.debug('2FA verification response:', data, error)

    if (!error) {
      setAuthData(data)
      
      // Fetch full user profile after 2FA verification
      try {
        logger.debug('🔑 AUTH STORE: Fetching full user profile after 2FA verification')
        const { data: profileData, error: profileError } = await useApi('auth/profile').get()
        
        if (profileError) {
          logger.warn('🔑 AUTH STORE: Failed to fetch profile after 2FA verification', profileError)
        } else if (!profileData) {
          logger.warn('🔑 AUTH STORE: Profile API returned no data after 2FA verification')
        } else {
          logger.debug('🔑 AUTH STORE: Profile data received after 2FA verification, updating user')
          
          // Ensure we have the user object
          if (profileData.user) {
            // Update with the full user object
            updateUser(profileData.user)
          } else {
            // If the API returns a different structure, use the whole response
            updateUser(profileData)
          }
          
          logger.debug('🔑 AUTH STORE: User profile updated after 2FA verification')
        }
      } catch (profileErr) {
        logger.error('🔑 AUTH STORE: Error fetching profile after 2FA verification', profileErr)
      }
    }

    return { data, error }
  }

  async function logout() {
    const { data, error } = await useApi('auth/logout').post()
    if (!error) clear()
    return { data, error }
  }

  function clear() {
    accessToken.set('')
    refreshToken.set('')
    user.set(null)

    abilityStore.clearRules()

    // Reset theme to default on logout
    const { setTheme } = useTheme()
    setTheme('light-theme')
  }

  async function googleLogin(token: string) {
    logger.debug('🔍 AUTH STORE: Google login called with token', token ? 'Token provided' : 'No token')

    try {
      logger.debug('🔍 AUTH STORE: Sending token to backend API')
      const { data, error } = await useApi('auth/google/login').post({ token })
      logger.debug('🔍 AUTH STORE: Google login response received:', { 
        hasData: !!data, 
        hasError: !!error,
        errorMessage: error ? (typeof error === 'string' ? error : JSON.stringify(error)) : null
      })

      if (error) {
        logger.error('🔍 AUTH STORE: Google login error from API:', error)
        return { data, error }
      }

      if (!data) {
        logger.error('🔍 AUTH STORE: Google login returned no data')
        return { data: null, error: 'No data returned from server' }
      }

      logger.debug('🔍 AUTH STORE: User authenticated with Google successfully, setting auth data')
      logger.debug('🔍 AUTH STORE: Auth data structure:', {
        hasAccessToken: !!data.accessToken,
        hasRefreshToken: !!data.refreshToken,
        hasUser: !!data.user,
        hasAbilityRules: !!(data.abilityRules || data.user?.abilityRules)
      })
      
      // Set auth data first
      setAuthData(data)
      
      // Force a small delay to ensure the UI updates
      await new Promise(resolve => setTimeout(resolve, 50));

      // Fetch full user profile after login
      try {
        logger.debug('🔍 AUTH STORE: Fetching full user profile after Google login')
        const { data: profileData, error: profileError } = await useApi('auth/profile').get()
        
        if (profileError) {
          logger.warn('🔍 AUTH STORE: Failed to fetch profile after Google login', profileError)
        } else if (!profileData) {
          logger.warn('🔍 AUTH STORE: Profile API returned no data')
        } else {
          logger.debug('🔍 AUTH STORE: Profile data received, updating user')
          
          // Ensure we have the user object
          if (profileData.user) {
            // Update with the full user object
            updateUser(profileData.user)
          } else {
            // If the API returns a different structure, use the whole response
            updateUser(profileData)
          }
          
          logger.debug('🔍 AUTH STORE: User profile updated after Google login')
          
          // Force another small delay to ensure the UI updates
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (profileErr: any) {
        logger.error('🔍 AUTH STORE: Error fetching profile after Google login', profileErr)
        logger.error('🔍 AUTH STORE: Error details:', { 
          message: profileErr.message, 
          stack: profileErr.stack,
          name: profileErr.name
        })
      }

      return { data, error: null }
    } catch (err: any) {
      logger.error('🔍 AUTH STORE: Unexpected error during Google login:', err)
      logger.error('🔍 AUTH STORE: Error details:', { 
        message: err.message, 
        stack: err.stack,
        name: err.name
      })
      return { data: null, error: err.message || 'Unexpected error during Google login' }
    }
  }

  return {
    accessToken: {
      get value() { return accessToken.get() }
    },
    refreshToken: {
      get value() { return refreshToken.get() }
    },
    user: {
      get value() { return user.get() }
    },

    isAuthenticated: {
      get value() { return isAuthenticated() }
    },
    login,
    googleLogin,
    logout,
    clear,
    setAuthData,
    verify2FA,
    // Add function to update user data
    updateUser(newUserData: Partial<User>) {
      const currentUser = user.get();
      if (currentUser) {
        user.set({ ...currentUser, ...newUserData });
        logger.debug('🔑 AUTH STORE: User data updated:', user.get());
        // Optionally update ability rules if they change with profile update
        if (newUserData.abilityRules) {
          logger.debug('🔑 AUTH STORE: Updating ability rules from profile update');
          abilityStore.setRules(newUserData.abilityRules);
        }
      } else {
        logger.warn('🔑 AUTH STORE: Attempted to update user data, but no user is currently logged in.');
      }
    }
  }
})
