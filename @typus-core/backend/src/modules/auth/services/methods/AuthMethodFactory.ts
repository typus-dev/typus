import { injectable, inject, container } from 'tsyringe';
import { IAuthMethod, AuthRequest } from './IAuthMethod.js';
import { PasswordAuth } from './PasswordAuth.js';
import { TwoFactorAuth } from './TwoFactorAuth.js';
import { BaseService } from '../../../../core/base/BaseService.js';

/**
 * Factory for authentication methods
 * Selects appropriate auth method based on request
 */
@injectable()
export class AuthMethodFactory extends BaseService {
  constructor(
    @inject(PasswordAuth) private passwordAuth: PasswordAuth,
    @inject(TwoFactorAuth) private twoFactorAuth: TwoFactorAuth
  ) {
    super();
  }

  /**
   * Get appropriate auth method for request
   */
  async getMethod(request: AuthRequest): Promise<IAuthMethod> {
    this.logger.debug('[AuthMethodFactory] getMethod called with request:', { 
      hasEmail: !!request.email,
      hasPassword: !!request.password,
      hasTempToken: !!request.tempToken,
      hasToken: !!request.token,
      hasUserId: !!request.userId,
      hasType: !!request.type,
      type: request.type
    });
    
    // Check if request can be handled by 2FA
    const twoFactorCanHandle = await Promise.resolve(this.twoFactorAuth.canHandle(request));
    this.logger.debug(`[AuthMethodFactory] TwoFactorAuth.canHandle returned: ${twoFactorCanHandle}`);
    
    if (twoFactorCanHandle) {
      this.logger.debug('[AuthMethodFactory] Returning TwoFactorAuth method');
      return this.twoFactorAuth;
    }
    
    // Default to password auth
    const passwordCanHandle = await Promise.resolve(this.passwordAuth.canHandle(request));
    this.logger.debug(`[AuthMethodFactory] PasswordAuth.canHandle returned: ${passwordCanHandle}`);
    
    if (passwordCanHandle) {
      this.logger.debug('[AuthMethodFactory] Returning PasswordAuth method');
      return this.passwordAuth;
    }
    
    // If no method can handle the request, default to password auth
    this.logger.debug('[AuthMethodFactory] No method can handle the request, defaulting to PasswordAuth');
    return this.passwordAuth;
  }

  /**
   * Get specific auth method by type
   */
  async getMethodByType(type: string): Promise<IAuthMethod> {
    this.logger.debug(`[AuthMethodFactory] getMethodByType called with type: ${type}`);
    
    const lowerType = type.toLowerCase();
    this.logger.debug(`[AuthMethodFactory] Lowercase type: ${lowerType}`);
    
    let method: IAuthMethod;
    
    switch (lowerType) {
      case 'password':
        this.logger.debug('[AuthMethodFactory] Returning passwordAuth for type: password');
        method = this.passwordAuth;
        break;
      case '2fa':
      case 'twofactor':
      case 'app':
      case 'email':
        this.logger.debug(`[AuthMethodFactory] Returning twoFactorAuth for type: ${lowerType}`);
        method = this.twoFactorAuth;
        break;
      default:
        this.logger.debug(`[AuthMethodFactory] No match for type: ${lowerType}, defaulting to passwordAuth`);
        method = this.passwordAuth;
    }
    
    // Ensure method is not a Promise
    if (method instanceof Promise) {
      this.logger.debug('[AuthMethodFactory] Method is a Promise, resolving it');
      method = await method;
    }
    
    this.logger.debug(`[AuthMethodFactory] Returned method: ${method.constructor.name}`);
    
    return method;
  }
}
