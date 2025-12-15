# Auth Module Frontend Changelog

## [1.0.0] - 2025-04-26
### Added
- Created constants.ts file with TwoFactorMethod enum, DEFAULT_2FA_METHOD constant, and TWO_FACTOR_METHOD_OPTIONS array
- Centralized all 2FA method constants in one place for better maintainability

### Changed
- Changed default 2FA method from APP to EMAIL for better user experience
- Made 2FA method determined dynamically from user settings when available
- Refactored setup-2fa.vue to use constants instead of hardcoded values
- Updated useAuthForm.ts to use TwoFactorMethod enum instead of hardcoded values
- Updated all string literal comparisons to use TwoFactorMethod enum
- Improved code maintainability by removing hardcoded 2FA method values

## [Planned] - Future Releases
### UI Improvements
- Enhanced mobile responsiveness for 2FA setup flow
- Improved error handling and user feedback
- Accessibility improvements for 2FA setup process

### New Features
- Support for additional 2FA methods (SMS, Telegram)
- User preferences for default 2FA method
- Recovery options management
