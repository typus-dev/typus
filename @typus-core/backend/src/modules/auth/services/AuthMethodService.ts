import { inject, injectable } from 'tsyringe';
import { BaseService } from '../../../core/base/BaseService.js';
import { AuthMethodFactory } from './methods/AuthMethodFactory.js';
import { AuthRequest, AuthResponse } from './methods/IAuthMethod.js';
import { BadRequestError } from '../../../core/base/BaseError.js';

/**
 * Service for handling authentication methods
 * Acts as a facade for different auth methods
 */
@injectable()
export class AuthMethodService extends BaseService {
  constructor(
    @inject(AuthMethodFactory) private authMethodFactory: AuthMethodFactory
  ) {
    super();
    this.logger.info('[AuthMethodService] Initialized');
  }

  /**
   * Initiate authentication process
   */
  async initiate(request: AuthRequest): Promise<AuthResponse> {
    this.logger.debug('[AuthMethodService] Initiating authentication', { 
      email: request.email,
      hasPassword: !!request.password,
      hasTempToken: !!request.tempToken,
      hasToken: !!request.token,
      hasUserId: !!request.userId,
      hasType: !!request.type,
      type: request.type
    });
    
    const method = await this.authMethodFactory.getMethod(request);
    this.logger.debug('[AuthMethodService] Selected authentication method:', { 
      methodName: method.constructor.name
    });
    
    return await method.initiate(request);
  }

  /**
   * Verify authentication
   */
  async verify(request: AuthRequest): Promise<AuthResponse> {
    this.logger.debug('[AuthMethodService] Verifying authentication', {
      hasTempToken: !!request.tempToken,
      hasToken: !!request.token,
      type: request.type
    });
    
    const method = await this.authMethodFactory.getMethod(request);
    return await method.verify(request);
  }

  /**
   * Setup authentication method
   */
  async setup(userId: number, type: string, options?: any): Promise<AuthResponse> {
    this.logger.debug('[AuthMethodService] Setting up authentication method', {
      userId,
      type,
      options
    });
    
    // For 2FA setup, we need to pass the type as an option
    const setupOptions = { ...options, type };
    
    try {
      // Get the appropriate method based on type and await it
      const method = await this.authMethodFactory.getMethodByType(type);
      
      // Log the method type
      this.logger.debug(`[AuthMethodService] Got method: ${method.constructor.name} for type: ${type}`);
      
      // Check if method has setup function
      if (typeof method.setup !== 'function') {
        this.logger.error(`[AuthMethodService] Method ${method.constructor.name} does not have a setup function`);
        throw new Error(`Method ${method.constructor.name} does not have a setup function`);
      }
      
      // Call the setup method
      const result = await method.setup(userId, setupOptions);
      this.logger.debug('[AuthMethodService] Setup completed successfully', { result });
      return result;
    } catch (error) {
      this.logger.error(`[AuthMethodService] Error in setup: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Enable authentication method
   */
  async enable(userId: number, token: string, type: string): Promise<AuthResponse> {
    this.logger.debug('[AuthMethodService] Enabling authentication method', {
      userId,
      type
    });
    
    try {
      // Get the appropriate method based on type
      const method = await this.authMethodFactory.getMethodByType(type);
      
      // Log the method type
      this.logger.debug(`[AuthMethodService] Got method: ${method.constructor.name} for type: ${type}`);
      
      // Check if method has enable function
      if (typeof method.enable !== 'function') {
        this.logger.error(`[AuthMethodService] Method ${method.constructor.name} does not have an enable function`);
        throw new BadRequestError(`Cannot enable authentication method: ${type}`);
      }
      
      // Call the enable method
      const result = await method.enable(userId, token, type);
      this.logger.debug('[AuthMethodService] Enable completed successfully', { result });
      return result;
    } catch (error) {
      this.logger.error(`[AuthMethodService] Error in enable: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Disable authentication method
   */
  async disable(userId: number, password?: string): Promise<AuthResponse> {
    this.logger.debug('[AuthMethodService] Disabling authentication method', {
      userId,
      hasPassword: !!password
    });

    try {
      // Get user to determine their 2FA method
      const user = await global.prisma.authUser.findUnique({
        where: { id: userId },
        select: { twoFactorMethod: true }
      });

      if (!user || !user.twoFactorMethod) {
        throw new Error('User not found or 2FA not enabled');
      }

      // Get the appropriate method based on user's configured type
      const method = await this.authMethodFactory.getMethodByType(user.twoFactorMethod);

      // Log the method type
      this.logger.debug(`[AuthMethodService] Got method: ${method.constructor.name} for type: ${user.twoFactorMethod}`);

      // Check if method has disable function
      if (typeof method.disable !== 'function') {
        this.logger.error(`[AuthMethodService] Method ${method.constructor.name} does not have a disable function`);
        throw new Error(`Method ${method.constructor.name} does not have a disable function`);
      }

      // Call the disable method with password
      const result = await method.disable(userId, password);
      this.logger.debug('[AuthMethodService] Disable completed successfully', { result });
      return result;
    } catch (error) {
      this.logger.error(`[AuthMethodService] Error in disable: ${error.message}`, { error });
      throw error;
    }
  }
}
