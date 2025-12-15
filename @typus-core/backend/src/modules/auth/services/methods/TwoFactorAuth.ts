import { injectable, inject } from 'tsyringe';
import { IAuthMethod, AuthRequest, AuthResponse } from './IAuthMethod.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../../../core/base/BaseError.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { BaseService } from '../../../../core/base/BaseService.js';
import * as speakeasy from 'speakeasy';
import * as crypto from 'crypto';
import { EmailService } from '../../../email/services/EmailService.js';
import { TokenService } from '../TokenService.js';
import { TWO_FACTOR_METHODS, TWO_FACTOR_MESSAGES, TOKEN_EXPIRATION, AUTH_ERRORS, AUTH_SUCCESS } from '../../constants.js';

/**
 * Two-factor authentication method
 * Implements APP and EMAIL strategies
 */
@injectable()
export class TwoFactorAuth extends BaseService implements IAuthMethod {
  private jwtSecret: string;
  private strategies: Map<string, any>;

  constructor(
    @inject(EmailService) private emailService: EmailService,
    @inject(TokenService) private tokenService: TokenService
  ) {
    super();
    this.jwtSecret = global.env.JWT_SECRET ;

    // Initialize strategies
    this.strategies = new Map();
    this.strategies.set(TWO_FACTOR_METHODS.APP.toUpperCase(), this.appStrategy.bind(this));
    this.strategies.set(TWO_FACTOR_METHODS.EMAIL.toUpperCase(), this.emailStrategy.bind(this));
  }

  /**
   * Check if method can handle the request
   */
  canHandle(request: AuthRequest): boolean {
    this.logger.debug('[TwoFactorAuth] canHandle called with request:', { 
      hasTempToken: !!request.tempToken,
      hasToken: !!request.token,
      hasUserId: !!request.userId,
      hasType: !!request.type,
      type: request.type,
      hasEmail: !!request.email,
      hasPassword: !!request.password
    });
    
    // Can handle requests with tempToken and token (2FA verification)
    if (request.tempToken && request.token) {
      this.logger.debug('[TwoFactorAuth] canHandle returning true: has tempToken and token');
      return true;
    }
    
    // Can handle setup requests with userId and type
    if (request.userId && request.type && [TWO_FACTOR_METHODS.APP, TWO_FACTOR_METHODS.EMAIL].includes(request.type as TWO_FACTOR_METHODS)) {
      this.logger.debug('[TwoFactorAuth] canHandle returning true: has userId and valid type');
      return true;
    }
    
    this.logger.debug('[TwoFactorAuth] canHandle returning false: request does not match criteria');
    return false;
  }

  /**
   * Initiate authentication process - not applicable for 2FA directly
   * 2FA is initiated through password auth
   */
  async initiate(request: AuthRequest): Promise<AuthResponse> {
    throw new BadRequestError('2FA cannot be initiated directly, use password authentication first');
  }

  /**
   * Verify 2FA code during login
   */
  async verify(request: AuthRequest): Promise<AuthResponse> {
    const { tempToken, token, type = TWO_FACTOR_METHODS.EMAIL } = request;
    
    if (!tempToken || !token) {
      throw new BadRequestError('Temporary token and verification code are required');
    }
    
    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, this.jwtSecret) as { id: number };
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
    
    const userId = decoded.id;
    
    // Get user
    const user = await this.prisma.authUser.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Always use the user's configured method, ignoring the type parameter
    const methodType = user.twoFactorMethod || TWO_FACTOR_METHODS.EMAIL;
    
    this.logger.info('[TwoFactorAuth] Using user\'s configured 2FA method:', { 
      userId: user.id, 
      method: methodType,
      requestedType: type
    });
    
    // Get the appropriate strategy
    const strategy = this.strategies.get(methodType.toUpperCase());
    if (!strategy) {
      throw new BadRequestError(`Unsupported 2FA strategy: ${methodType}`);
    }
    
    // Verify with strategy
    const verifyResult = await strategy(userId, token, { isSetup: false });
    
    // Get user for response
    const userWithRole = await this.prisma.authUser.findUnique({
      where: { id: user.id }
    });
    
    if (!userWithRole) {
      throw new NotFoundError('User not found');
    }
    
    // Get role data separately if user has a role
    let roleData = null;
    let abilityRules = [];
    if (userWithRole.role) {
      roleData = await this.prisma.authRole.findUnique({
        where: { name: userWithRole.role }
      });
      
      // Extract abilityRules from roleData if it exists
      if (roleData && roleData.abilityRules) {
        abilityRules = roleData.abilityRules;
        
        // Parse if stored as string
        if (typeof abilityRules === 'string') {
          try {
            abilityRules = JSON.parse(abilityRules);
          } catch (e) {
            this.logger.warn('[TwoFactorAuth] Failed to parse abilityRules JSON', { error: e.message });
            abilityRules = [];
          }
        }
      }
    }
    
    // Remove password from user data
    const { password, ...userData } = userWithRole;
    
    // Add role data to user data
    const userDataWithRole = {
      ...userData,
      roleData
    };
    
    // Generate tokens for successful login using TokenService
    const { accessToken, refreshToken } = await this.tokenService.generateTokens(userWithRole);
    
    return {
      requiresTwoFactor: false,
      message: '2FA verification successful',
      userData: userDataWithRole,
      accessToken,
      refreshToken,
      abilityRules
    };
  }

  /**
   * Setup 2FA for user
   */
  async setup(userId: number, options?: any): Promise<AuthResponse> {
    this.logger.debug('[TwoFactorAuth] Setup called with options:', { userId, options });

    // Get the 2FA type from options (subType has priority over type)
    const type = options?.subType || options?.type || 'APP';
    this.logger.debug(`[TwoFactorAuth] Using 2FA type: ${type}`);

    // Get user
    const user = await this.prisma.authUser.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get the appropriate strategy
    const strategy = this.strategies.get(type.toUpperCase());
    if (!strategy) {
      throw new BadRequestError(`Unsupported 2FA strategy: ${type}`);
    }

    this.logger.debug(`[TwoFactorAuth] Using strategy for type: ${type}`);

    // For APP method, generate QR code immediately
    // For EMAIL method, don't send code - user will click "Send Code" button
    const shouldGenerate = type.toUpperCase() === TWO_FACTOR_METHODS.APP;

    this.logger.debug(`[TwoFactorAuth] Should generate code/QR: ${shouldGenerate} (type: ${type})`);

    // Generate secret with strategy
    return await strategy(userId, null, { isSetup: true, generate: shouldGenerate });
  }

  /**
   * Enable 2FA for user
   */
  async enable(userId: number, token: string, type: string = TWO_FACTOR_METHODS.EMAIL): Promise<AuthResponse> {
    // Get user
    const user = await this.prisma.authUser.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Get the appropriate strategy
    const strategy = this.strategies.get(type.toUpperCase());
    if (!strategy) {
      throw new BadRequestError(`Unsupported 2FA strategy: ${type}`);
    }
    
    // Verify and enable with strategy
    return await strategy(userId, token, { isSetup: true });
  }

  /**
   * Disable 2FA for user
   */
  async disable(userId: number, password?: string): Promise<AuthResponse> {
    this.logger.debug('[TwoFactorAuth] Disabling 2FA', { userId, hasPassword: !!password });

    // Get user
    const user = await this.prisma.authUser.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.isTwoFactorEnabled) {
      throw new BadRequestError('2FA is not enabled for this user');
    }

    // Verify password if provided
    if (password) {
      this.logger.debug('[TwoFactorAuth] Password provided, verifying...', { userId });

      if (!user.password) {
        this.logger.warn('[TwoFactorAuth] User has no password set (social login?)', { userId });
        throw new BadRequestError('Account has no password set. Please contact support.');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        this.logger.warn('[TwoFactorAuth] Invalid password provided', { userId });
        throw new UnauthorizedError('Incorrect password');
      }

      this.logger.debug('[TwoFactorAuth] Password verified successfully', { userId });
    } else {
      this.logger.debug('[TwoFactorAuth] No password provided, skipping verification', { userId });
    }

    // Disable 2FA
    await this.prisma.authUser.update({
      where: { id: userId },
      data: {
        twoFactorSecret: null,
        twoFactorMethod: null,
        isTwoFactorEnabled: false
      }
    });

    this.logger.info('[TwoFactorAuth] 2FA disabled successfully', { userId });

    return {
      message: '2FA disabled successfully',
      disabled: true
    };
  }

  /**
   * Generate verification code for email 2FA
   * Public method to be used during login
   */
  async generateEmailCode(userId: number): Promise<AuthResponse> {
    this.logger.info('[TwoFactorAuth] Generating email verification code', { userId });
    return await this.emailStrategy(userId, null, { generate: true });
  }

  /**
   * APP strategy implementation
   */
  private async appStrategy(userId: number, token?: string, options?: any): Promise<any> {
    const isSetup = options?.isSetup === true;
    const generate = options?.generate === true;
    
    // Get user
    const user = await this.prisma.authUser.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Generate new secret for setup
    if (generate && isSetup) {
      // Check if 2FA is already enabled
      if (user.isTwoFactorEnabled && user.twoFactorSecret) {
        throw new BadRequestError('2FA is already enabled');
      }
      
      // Generate new secret
      const appName = global.env.APP_NAME;
      const secret = speakeasy.generateSecret({
        name: `${appName}:${user.email}`,
        length: 20
      });
      
      // Save temporary secret to user record
      await this.prisma.authUser.update({
        where: { id: userId },
        data: {
          twoFactorTempSecret: secret.base32,
          twoFactorTempMethod: TWO_FACTOR_METHODS.APP
        }
      });
      
      // Return secret and otpauth URL for QR code generation
      return {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url,
        method: TWO_FACTOR_METHODS.APP
      };
    }
    
    // Verify token
    if (token) {
      // Check temporary secret for initial setup or permanent secret for login
      const secret = isSetup 
        ? user.twoFactorTempSecret 
        : user.twoFactorSecret;
        
      if (!secret) {
        const errorMsg = isSetup 
          ? 'No temporary 2FA secret found. Please generate a secret first.' 
          : '2FA is not enabled for this user';
          
        throw new BadRequestError(errorMsg);
      }
      
      // Verify the token
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1 // Allow 1 step before/after for clock skew
      });
      
      if (!verified) {
        throw new BadRequestError('Invalid verification code');
      }
      
      // If this is setup, enable 2FA by moving temp secret to permanent secret
      if (isSetup) {
        await this.prisma.authUser.update({
          where: { id: userId },
          data: {
            twoFactorSecret: user.twoFactorTempSecret,
            twoFactorMethod: TWO_FACTOR_METHODS.APP,
            twoFactorTempSecret: null,
            twoFactorTempMethod: null,
            isTwoFactorEnabled: true
          }
        });
        
        return {
          message: '2FA enabled successfully',
          method: TWO_FACTOR_METHODS.APP,
          enabled: true
        };
      }
      
      // For login verification, just return success
      return {
        message: 'Verification successful',
        method: TWO_FACTOR_METHODS.APP,
        verified: true
      };
    }
    
    throw new BadRequestError('Invalid operation for APP strategy');
  }

  /**
   * EMAIL strategy implementation
   */
  private async emailStrategy(userId: number, token?: string, options?: any): Promise<any> {
    const isSetup = options?.isSetup === true;
    const generate = options?.generate === true;

    // Get user
    const user = await this.prisma.authUser.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.email) {
      throw new BadRequestError('User has no email address');
    }

    // Setup flow without immediate code generation
    if (isSetup && !generate && !token) {
      this.logger.debug('[TwoFactorAuth] EMAIL setup initiated without code generation', { userId });
      return {
        message: 'Email 2FA setup initiated. Click "Send Code" to receive verification code.',
        method: TWO_FACTOR_METHODS.EMAIL,
        email: this.maskEmail(user.email)
      };
    }

    // Generate new code when explicitly requested
    if (generate) {
      this.logger.debug('[TwoFactorAuth] Generating and sending email code', { userId });
      // Generate a random 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Hash the code before storing
      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
      
      // Store the code with expiration (5 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);
      
      // Update user with temporary code
      await this.prisma.authUser.update({
        where: { id: userId },
        data: {
          twoFactorTempSecret: hashedCode,
          twoFactorTempMethod: TWO_FACTOR_METHODS.EMAIL,
          twoFactorTempExpiry: expiresAt
        }
      });
      
      // Send email with code
      try {
        const emailSent = await this.emailService.sendVerificationCodeEmail(
          user.email,
          code,
          user.userName || user.email.split('@')[0]
        );
        
        if (!emailSent) {
          this.logger.error('[TwoFactorAuth] Email service returned false when sending verification code', { userId });
          throw new Error('Failed to send verification code email');
        }
        
        this.logger.info('[TwoFactorAuth] Verification code email sent successfully', { userId });
      } catch (error) {
        this.logger.error('[TwoFactorAuth] Failed to send verification code email', { 
          userId, 
          error: error.message 
        });
        
        // Clean up the temporary code since email failed
        await this.prisma.authUser.update({
          where: { id: userId },
          data: {
            twoFactorTempSecret: null,
            twoFactorTempMethod: null,
            twoFactorTempExpiry: null
          }
        });
        
        // Throw error to notify the user
        throw new BadRequestError('Failed to send verification code email. Please try again or contact support.');
      }
      
      return {
        message: 'Verification code sent to email',
        email: this.maskEmail(user.email),
        expiresAt,
        method: TWO_FACTOR_METHODS.EMAIL
      };
    }
    
    // Verify token
    if (token) {
      if (isSetup) {
        // Setup flow - validate temporary secret
        if (!user.twoFactorTempSecret || user.twoFactorTempMethod.toLowerCase() !== TWO_FACTOR_METHODS.EMAIL) {
          throw new BadRequestError('No pending email verification');
        }
        
        // Check if code has expired
        if (!user.twoFactorTempExpiry || new Date() > user.twoFactorTempExpiry) {
          throw new BadRequestError('Verification code has expired');
        }
        
        // Hash and compare the token
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        if (hashedToken !== user.twoFactorTempSecret) {
          throw new BadRequestError('Invalid verification code');
        }
        
        // Enable 2FA for the user
        await this.prisma.authUser.update({
          where: { id: userId },
          data: {
            twoFactorSecret: crypto.randomBytes(32).toString('hex'), // Random secret for email 2FA
            twoFactorMethod: TWO_FACTOR_METHODS.EMAIL,
            twoFactorTempSecret: null,
            twoFactorTempMethod: null,
            twoFactorTempExpiry: null,
            isTwoFactorEnabled: true
          }
        });
        
        return {
          message: 'Email 2FA enabled successfully',
          enabled: true,
          method: TWO_FACTOR_METHODS.EMAIL
        };
      } else {
        // Login flow - validate against temporary secret saved during login
        if (!user.twoFactorTempSecret || !user.twoFactorTempExpiry) {
          throw new BadRequestError('No pending verification code');
        }
        
        // Check if code has expired
        if (new Date() > user.twoFactorTempExpiry) {
          throw new BadRequestError('Verification code has expired');
        }
        
        // Hash and compare the token
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        if (hashedToken !== user.twoFactorTempSecret) {
          throw new BadRequestError('Invalid verification code');
        }
        
        // Clear temporary verification data
        await this.prisma.authUser.update({
          where: { id: userId },
          data: {
            twoFactorTempSecret: null,
            twoFactorTempExpiry: null
          }
        });
        
        return {
          message: 'Email verification successful',
          verified: true,
          method: TWO_FACTOR_METHODS.EMAIL
        };
      }
    }
    
    throw new BadRequestError('Invalid operation for EMAIL strategy');
  }

  /**
   * Mask email address for privacy
   */
  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    
    let maskedLocalPart = localPart;
    if (localPart.length > 2) {
      maskedLocalPart = localPart[0] + '****' + localPart[localPart.length - 1];
    }
    
    return `${maskedLocalPart}@${domain}`;
  }
}
