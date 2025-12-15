/**
 * Authentication constants
 */

// 2FA methods
export const TWO_FACTOR_METHODS = {
  APP: 'app',
  EMAIL: 'email'
};

// 2FA messages
export const TWO_FACTOR_MESSAGES = {
  APP: 'Please enter verification code from your authenticator app',
  EMAIL: 'Verification code sent to your email'
};

// JWT token expiration times
export const TOKEN_EXPIRATION = {
  ACCESS_TOKEN: process.env.JWT_EXPIRE || '1h',
  REFRESH_TOKEN: '7d',
  TEMP_TOKEN: '5m'
};

// Authentication error messages
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  EMAIL_NOT_VERIFIED: 'Please verify your email before logging in',
  TWO_FACTOR_REQUIRED: 'Two-factor authentication is required',
  INVALID_TOKEN: 'Invalid or expired token',
  USER_NOT_FOUND: 'User not found',
  INVALID_VERIFICATION_CODE: 'Invalid verification code',
  VERIFICATION_CODE_EXPIRED: 'Verification code has expired',
  NO_PENDING_VERIFICATION: 'No pending verification code',
  EMAIL_SEND_FAILED: 'Failed to send verification code email. Please try again or contact support.'
};

// Authentication success messages
export const AUTH_SUCCESS = {
  LOGIN_SUCCESS: 'Authentication successful',
  TWO_FACTOR_VERIFIED: '2FA verification successful',
  TWO_FACTOR_DISABLED: '2FA disabled successfully',
  TWO_FACTOR_ENABLED: '2FA enabled successfully',
  EMAIL_VERIFICATION_SUCCESS: 'Email verification successful'
};
