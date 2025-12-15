# Auth Module with Integrated 2FA

This module provides authentication functionality with integrated two-factor authentication (2FA) support. The implementation follows a modular approach with internal decomposition to maintain clean separation of concerns while providing a unified API.

## Architecture

The auth module uses a combination of design patterns:

1. **Facade Pattern**: `AuthService` acts as a facade, delegating to specialized services
2. **Strategy Pattern**: Different authentication methods implement the `IAuthMethod` interface
3. **Factory Pattern**: `AuthMethodFactory` creates and returns appropriate auth method instances

## Directory Structure

```
/auth
  /controllers
    AuthController.ts
  /services
    AuthService.ts
    AuthenticationService.ts
    TokenService.ts
    RegistrationService.ts
    PasswordManagementService.ts
    ProfileManagementService.ts
    AuthHelperService.ts
    AuthMethodService.ts
    /methods
      IAuthMethod.ts
      PasswordAuth.ts
      TwoFactorAuth.ts
      AuthMethodFactory.ts
```

## Authentication Methods

The module supports multiple authentication methods through a common interface:

- **PasswordAuth**: Basic email/password authentication
- **TwoFactorAuth**: Two-factor authentication with multiple strategies:
  - APP: Time-based one-time passwords (TOTP) using authenticator apps
  - EMAIL: One-time codes sent via email

## How 2FA Works

1. **Setup**: User generates a secret key and configures their authenticator app
2. **Enable**: User verifies a code from their authenticator to confirm setup
3. **Login Flow**:
   - User logs in with email/password
   - If 2FA is enabled, a temporary token is issued
   - User provides 2FA code along with the temporary token
   - Upon successful verification, full authentication tokens are issued

## API Endpoints

### Authentication

- `POST /auth/login`: Log in with email/password
- `POST /auth/logout`: Log out (requires authentication)
- `POST /auth/refresh-token`: Refresh access token

### Two-Factor Authentication

- `POST /auth/2fa/setup`: Generate 2FA secret (requires authentication)
- `POST /auth/2fa/enable`: Enable 2FA (requires authentication)
- `POST /auth/2fa/disable`: Disable 2FA (requires authentication)
- `POST /auth/2fa/verify`: Verify 2FA code during login

## Usage Examples

### Setting up 2FA

```typescript
// Generate secret
const setupResult = await authService.setup2FA(userId, 'APP');
// setupResult contains secret and otpauthUrl for QR code generation

// Enable 2FA with verification code
const enableResult = await authService.enable2FA(userId, verificationCode, 'APP');
```

### Login with 2FA

```typescript
// Step 1: Initial login
const loginResult = await authService.login(email, password, req);

// If 2FA is required
if (loginResult.requiresTwoFactor) {
  // Step 2: Verify 2FA code
  const verifyResult = await authService.verify2FA(
    loginResult.tempToken,
    twoFactorCode,
    loginResult.method
  );
  
  // verifyResult contains accessToken, refreshToken, and user data
}
```

## Adding New Authentication Methods

To add a new authentication method:

1. Create a new class that implements the `IAuthMethod` interface
2. Register the new class in the `AuthModule` constructor
3. Update the `AuthMethodFactory` to return the new method when appropriate

Example for adding biometric authentication:

```typescript
// 1. Create BiometricAuth.ts implementing IAuthMethod
@injectable()
export class BiometricAuth extends BaseService implements IAuthMethod {
  // Implement required methods
}

// 2. Register in AuthModule
container.register(BiometricAuth, { useClass: BiometricAuth });

// 3. Update AuthMethodFactory
getMethodByType(type: string): IAuthMethod {
  switch (type.toLowerCase()) {
    // ...existing cases
    case 'biometric':
      return this.biometricAuth;
    default:
      return this.passwordAuth;
  }
}
```

## Migration from Separate 2FA Module

This implementation integrates the functionality previously provided by the separate `/modules/2fa` module directly into the auth module with internal decomposition. The integration maintains all existing functionality while providing a cleaner architecture and unified API.
