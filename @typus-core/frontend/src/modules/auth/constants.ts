// 2FA authentication methods
export enum TwoFactorMethod {
  APP = 'app',
  EMAIL = 'email'
}

// Default 2FA method
export const DEFAULT_2FA_METHOD = TwoFactorMethod.EMAIL

// 2FA method options for UI
export const TWO_FACTOR_METHOD_OPTIONS = [
  { 
    label: 'Authenticator App', 
    value: TwoFactorMethod.APP, 
    description: 'Use an app like Google Authenticator or Authy' 
  },
  { 
    label: 'Email', 
    value: TwoFactorMethod.EMAIL, 
    description: 'Receive codes via email' 
  }
]
