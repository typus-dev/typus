# Auth Module TODO List

## SMS and Telegram 2FA Implementation

### SMS 2FA
- [ ] Add `phoneNumber` field to User model in database schema
- [ ] Create SMS strategy in TwoFactorAuth class
- [ ] Integrate with SMS gateway service (Twilio, Nexmo, etc.)
- [ ] Implement phone number validation and formatting
- [ ] Add UI components for phone number input and verification
- [ ] Update user profile to allow adding/changing phone number
- [ ] Add unit tests for SMS strategy

### Telegram 2FA
- [ ] Add `telegramId` field to User model in database schema
- [ ] Create Telegram strategy in TwoFactorAuth class
- [ ] Create Telegram bot for sending verification codes
- [ ] Implement mechanism to link user accounts with Telegram IDs
- [ ] Add UI components for Telegram verification
- [ ] Add unit tests for Telegram strategy

### General 2FA Improvements
- [ ] Update TwoFactorAuth.canHandle method to support new strategies
- [ ] Add strategy registration in TwoFactorAuth constructor
- [ ] Create admin panel for managing 2FA methods
- [ ] Implement rate limiting for verification attempts
- [ ] Add logging for all 2FA operations
- [ ] Update documentation with new 2FA methods

## Database Changes
```sql
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
ALTER TABLE users ADD COLUMN telegram_id VARCHAR(50);
```

## Prisma Schema Updates
```prisma
model User {
  // Existing fields
  phoneNumber String?
  telegramId  String?
}
```

## Integration Requirements

### SMS Gateway
- Select SMS provider based on:
  - Cost per message
  - API reliability
  - Global coverage
  - Message delivery speed
- Required environment variables:
  - SMS_PROVIDER_API_KEY
  - SMS_PROVIDER_SECRET
  - SMS_FROM_NUMBER

### Telegram Bot
- Create bot via BotFather
- Required environment variables:
  - TELEGRAM_BOT_TOKEN
  - TELEGRAM_BOT_USERNAME
- Implement commands:
  - /start - Initial greeting and instructions
  - /link - Link Telegram account to user account
  - /unlink - Remove link between accounts
