import { inject, injectable } from 'tsyringe';
import { BaseService } from '../../../core/base/BaseService.js';
import { AuthMethodService } from './AuthMethodService';
import { TokenService } from './TokenService';
import { AuthHelperService } from './AuthHelperService';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../../core/base/BaseError.js';
import { Request } from 'express';
import { TWO_FACTOR_METHODS } from '../constants';
/**
 * Service for handling user authentication
 */
@injectable()
export class AuthenticationService extends BaseService {
    private jwtSecret: string;

    constructor(
        @inject(AuthMethodService) private authMethodService: AuthMethodService,
        @inject(TokenService) private tokenService: TokenService,
        @inject(AuthHelperService) private authHelperService: AuthHelperService
    ) {
        super();
        this.jwtSecret = global.env.JWT_SECRET;
        this.logger.info('[AuthenticationService] Initialized');
    }

    /**
     * User login
     */
    async login(email: string, password: string, req: Request) {
        this.logger.debug('[AuthenticationService] User login attempt', { email });

        try {
            // Use AuthMethodService to handle password authentication
            const authResult = await this.authMethodService.initiate({
                email,
                password
            });
            
            // If 2FA is required, return the result directly
            if (authResult.requiresTwoFactor) {
                // Log successful auth attempt (2FA required) using helper
                this.logger.debug('[AuthenticationService] Logging successful authentication attempt (2FA required)', { email });
                await this.authHelperService.logAuthAttempt(req, {
                    email,
                    user_id: authResult.user?.id,
                    user_name: authResult.user?.userName,
                    google_id: authResult.user?.googleId,
                    result: 'success', // 2FA required
                    token: authResult.tempToken
                });
                
                return authResult;
            }
            
            // If email verification is required, return the result directly
            if (authResult.requiresEmailVerification) {
                // Log auth attempt with email verification required
                await this.authHelperService.logAuthAttempt(req, {
                    email,
                    user_id: authResult.user?.id,
                    user_name: authResult.user?.userName,
                    result: 'failed' // Using 'failed' as the result since login is not successful
                });
                
                return authResult;
            }
            
            // If authentication was successful, generate tokens
            const user = authResult.user;
            if (!user) {
                throw new BadRequestError('Authentication failed: No user returned');
            }
            
            // Generate tokens using TokenService
            this.logger.debug('[AuthenticationService] Generating authentication tokens via TokenService', { userId: user.id });
            const { accessToken, refreshToken } = await this.tokenService.generateTokens({
                id: user.id,
                email: user.email,
                roles: user.role ? [user.role] : []
            });
            
            // Update last login
            this.logger.debug('[AuthenticationService] Updating last login timestamp', { userId: user.id });
            await this.prisma.authUser.update({
                where: { id: user.id },
                data: { lastLogin: new Date() }
            });
            
            // Log successful auth attempt using helper
            this.logger.debug('[AuthenticationService] Logging successful authentication attempt', { userId: user.id });
            await this.authHelperService.logAuthAttempt(req, {
                email,
                user_id: user.id,
                user_name: user.userName,
                google_id: user.googleId,
                result: 'success',
                token: accessToken
            });
            
            // Get ability rules
            this.logger.debug('[AuthenticationService] Fetching ability rules for user role', { userId: user.id, role: user.role });
            let abilityRules = null;
            if (user.role) {
                const roleData = await this.prisma.authRole.findFirst({
                    where: { name: user.role },
                    select: { abilityRules: true }
                });
                abilityRules = roleData?.abilityRules ?? null;
                
                this.logger.info('[AuthenticationService] Raw abilityRules from DB', { abilityRules });
                
                if (typeof abilityRules === 'string') {
                    try {
                        abilityRules = JSON.parse(abilityRules);
                    } catch (e) {
                        this.logger.warn('[AuthenticationService] Failed to parse abilityRules JSON', { error: e.message });
                        abilityRules = [];
                    }
                } else if (abilityRules === true || abilityRules === null) {
                    abilityRules = [];
                }
            }
            
            this.logger.debug('[AuthenticationService] Ability rules after normalization', { userId: user.id, abilityRules });
            
            // Sanitize user data
            const sanitizedUser = await this.authHelperService.sanitizeUser(user);
            
            // Return response
            const response = {
                requiresTwoFactor: false,
                user: sanitizedUser,
                abilityRules,
                accessToken,
                refreshToken
            };
            
            this.logger.info('[AuthenticationService] Login completed successfully', { userId: user.id });
            return response;
        } catch (error) {
            // Log failed auth attempt
            this.logger.error('[AuthenticationService] Login failed', { email, error: error.message });
            await this.authHelperService.logAuthAttempt(req, {
                email,
                result: 'failed'
            });
            
            // Log the error separately
            this.logger.error('[AuthenticationService] Authentication error details', { 
                email, 
                errorMessage: error.message,
                errorStack: error.stack
            });
            
            throw error;
        }
    }
    
    /**
     * Verify 2FA code during login
     */
    async verify2FA(tempToken: string, token: string, type: string = TWO_FACTOR_METHODS.EMAIL) {
        this.logger.debug('[AuthenticationService] Verifying 2FA code');
        
        try {
            // Use AuthMethodService to verify 2FA
            const authResult = await this.authMethodService.verify({
                tempToken,
                token,
                type
            });
            
            return authResult;
        } catch (error) {
            this.logger.error('[AuthenticationService] 2FA verification failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Setup 2FA for user
     */
    async setup2FA(userId: number, type: string = TWO_FACTOR_METHODS.EMAIL) {
        this.logger.debug('[AuthenticationService] Setting up 2FA', { userId, type });
        
        try {
            // Use AuthMethodService to setup 2FA
            return await this.authMethodService.setup(userId, type);
        } catch (error) {
            this.logger.error('[AuthenticationService] 2FA setup failed', { userId, error: error.message });
            throw error;
        }
    }
    
    /**
     * Enable 2FA for user
     */
    async enable2FA(userId: number, token: string, type: string = TWO_FACTOR_METHODS.EMAIL) {
        this.logger.debug('[AuthenticationService] Enabling 2FA', { userId, type });
        
        try {
            // Use AuthMethodService to enable 2FA
            return await this.authMethodService.enable(userId, token, type);
        } catch (error) {
            this.logger.error('[AuthenticationService] 2FA enable failed', { userId, error: error.message });
            throw error;
        }
    }
    
    /**
     * Disable 2FA for user
     */
    async disable2FA(userId: number, type: string = TWO_FACTOR_METHODS.EMAIL) {
        this.logger.debug('[AuthenticationService] Disabling 2FA', { userId, type });
        
        try {
            // Use AuthMethodService to disable 2FA
            return await this.authMethodService.disable(userId, type);
        } catch (error) {
            this.logger.error('[AuthenticationService] 2FA disable failed', { userId, error: error.message });
            throw error;
        }
    }
}
