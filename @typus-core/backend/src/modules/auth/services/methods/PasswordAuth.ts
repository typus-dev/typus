import { injectable, inject } from 'tsyringe';
import { IAuthMethod, AuthRequest, AuthResponse } from './IAuthMethod.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../../../core/base/BaseError.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { BaseService } from '../../../../core/base/BaseService.js';
import { TwoFactorAuth } from './TwoFactorAuth.js';
import { TWO_FACTOR_METHODS, TWO_FACTOR_MESSAGES, TOKEN_EXPIRATION, AUTH_ERRORS, AUTH_SUCCESS } from '../../constants.js';

/**
 * Password-based authentication method
 */
@injectable()
export class PasswordAuth extends BaseService implements IAuthMethod {
  private jwtSecret: string;

  constructor(
    @inject(TwoFactorAuth) private twoFactorAuth: TwoFactorAuth
  ) {
    super();
    this.jwtSecret = global.env.JWT_SECRET ;
  }

  /**
   * Check if method can handle the request
   */
  canHandle(request: AuthRequest): boolean {
    this.logger.debug('[PasswordAuth] canHandle called with request:', { 
      hasEmail: !!request.email,
      hasPassword: !!request.password,
      hasTempToken: !!request.tempToken,
      hasToken: !!request.token,
      hasUserId: !!request.userId,
      hasType: !!request.type,
      type: request.type
    });
    
    const result = !!(request && request.email && request.password);
    this.logger.debug(`[PasswordAuth] canHandle returning ${result}`);
    return result;
  }

  /**
   * Initiate authentication process with password
   */
  async initiate(request: AuthRequest): Promise<AuthResponse> {
    const { email, password } = request;
    
    // Find user
    this.logger.debug('[PasswordAuth] Looking up user in database', { email });
    const user = await this.prisma.authUser.findUnique({
      where: { email }
    });

    if (!user) {
      this.logger.error('[PasswordAuth] User not found', { email });
      throw new UnauthorizedError('Invalid credentials');
    }

    this.logger.debug('[PasswordAuth] User found', { userId: user.id });

    // Verify password
    this.logger.debug('[PasswordAuth] Verifying password', { userId: user.id });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.error('[PasswordAuth] Invalid password', { email });
      throw new UnauthorizedError('Invalid credentials');
    }

    this.logger.debug('[PasswordAuth] Password verified', { email });
    
    // Check if user is approved
    if (!user.isApproved) {
      this.logger.debug('[PasswordAuth] User not approved', { userId: user.id });
      throw new UnauthorizedError(AUTH_ERRORS.USER_NOT_APPROVED);
    }
    
    // Check if email is verified
    if (!user.isEmailVerified) {
      this.logger.debug('[PasswordAuth] User email not verified', { userId: user.id });
      
      return {
        requiresEmailVerification: true,
        message: 'Please verify your email before logging in',
        email: user.email
      };
    }

    // Check if 2FA is enabled
    if (user.isTwoFactorEnabled) {
      this.logger.debug('[PasswordAuth] 2FA is enabled, generating temporary token', { userId: user.id });
      const tempToken = jwt.sign(
        { id: user.id },
        this.jwtSecret,
        { expiresIn: '5m' } // Short-lived token for 2FA
      );

      // If email 2FA is enabled, generate and send verification code
      if (user.twoFactorMethod.toLowerCase() === TWO_FACTOR_METHODS.EMAIL) {
        try {
          this.logger.info('[PasswordAuth] Email 2FA detected, generating verification code', { userId: user.id });
          
          // Call the public method to generate and send verification code
          const emailStrategyResult = await this.twoFactorAuth.generateEmailCode(user.id);
          
          this.logger.info('[PasswordAuth] Email verification code generation result:', { 
            userId: user.id,
            result: emailStrategyResult
          });
        } catch (error) {
          this.logger.error('[PasswordAuth] Failed to generate and send email verification code', { 
            userId: user.id, 
            error: error.message,
            stack: error.stack
          });
          
          // Continue with login flow, the user will see an error when trying to verify
          // We don't throw here to maintain backward compatibility with existing flow
        }
      }

      return {
        requiresTwoFactor: true,
        user: null,
        accessToken: null,
        refreshToken: null,
        method: user.twoFactorMethod,
        tempToken,
        message: user.twoFactorMethod.toLowerCase() === TWO_FACTOR_METHODS.EMAIL 
          ? TWO_FACTOR_MESSAGES.EMAIL
          : TWO_FACTOR_MESSAGES.APP,
        twoFactorType: user.twoFactorMethod // Add this to ensure the frontend knows the 2FA type
      };
    }

    // Return successful authentication
    return {
      requiresTwoFactor: false,
      user,
      message: 'Authentication successful'
    };
  }

  /**
   * Verify authentication - not applicable for password auth
   */
  async verify(request: AuthRequest): Promise<AuthResponse> {
    throw new BadRequestError('Verification not applicable for password authentication');
  }

  /**
   * Setup authentication method - not applicable for password auth
   */
  async setup(userId: number, options?: any): Promise<AuthResponse> {
    throw new BadRequestError('Setup not applicable for password authentication');
  }

  /**
   * Disable authentication method - not applicable for password auth
   */
  async disable(userId: number): Promise<AuthResponse> {
    throw new BadRequestError('Disable not applicable for password authentication');
  }
}
