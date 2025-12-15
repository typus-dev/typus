# Auth Module Changelog

## [1.0.3] - 2025-04-27
### Fixed
- Fixed profile dropdown issue when logging in with 2FA enabled
- Standardized API response format in AuthController.verify2FA to always return user data in the 'user' field instead of 'userData'
- Ensured consistent response structure between regular login and 2FA verification

## [1.0.2] - 2025-04-26
### Fixed
- Fixed issue with email 2FA where verification codes were not being sent during login
- Modified PasswordAuth to automatically trigger email code generation for email 2FA
- Added public method in TwoFactorAuth to generate email verification codes
- Removed test email sending method from AuthController
- Fixed case sensitivity issue with 2FA method names
- Added constants for 2FA methods and messages
- Fixed issue with 2FA verification using wrong strategy when frontend sends incorrect type


## [1.0.1] - 2025-04-26
### Changed
- Updated AuthController to use the integrated AuthService for 2FA operations
- Updated VerificationService to use the integrated AuthService for 2FA operations
- Removed all remaining references to the external 2FA module

## [1.0.0] - 2025-04-26
### Added
- Integrated 2FA functionality directly into Auth module
- Implemented Strategy pattern for authentication methods
- Added PasswordAuth strategy for basic authentication
- Added TwoFactorAuth strategy with APP and EMAIL methods
- Created AuthMethodFactory for dynamic authentication method selection
- Added AuthMethodService as facade for authentication methods
- Created comprehensive documentation in README.md
- Added migration guide and script for transitioning from separate 2FA module

### Changed
- Refactored AuthenticationService to use AuthMethodService
- Updated AuthService to delegate 2FA operations to AuthMethodService
- Modified AuthModule to register new authentication services
- Improved error handling and logging in authentication flow

### Removed
- Dependency on external 2FA module
- Direct usage of TwoFactorAuthService from external module

## [Planned] - Future Releases
### SMS and Telegram 2FA
- SMS-based two-factor authentication
- Telegram bot integration for two-factor authentication
- User profile updates for managing phone numbers and Telegram IDs
- Admin panel for managing 2FA methods

### Security Enhancements
- Rate limiting for verification attempts
- Enhanced logging for security events
- Improved error messages and user feedback
