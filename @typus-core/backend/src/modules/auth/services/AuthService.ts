import { inject, injectable } from 'tsyringe';
import { BaseService } from '../../../core/base/BaseService.js';
import { Request } from 'express';
import { TokenService } from './TokenService.js';
import { RegistrationService } from './RegistrationService.js';
import { AuthenticationService } from './AuthenticationService.js';
import { PasswordManagementService } from './PasswordManagementService.js';
import { ProfileManagementService } from './ProfileManagementService.js';
import { AuthHelperService } from './AuthHelperService.js';
import { AuthMethodService } from './AuthMethodService.js';
import { TWO_FACTOR_METHODS } from '../constants.js'; // Import TWO_FACTOR_METHODS

@injectable()
export class AuthService extends BaseService {
    // This service acts as a facade

    constructor(
        @inject(TokenService) private tokenService: TokenService,
        @inject(RegistrationService) private registrationService: RegistrationService,
        @inject(AuthenticationService) private authenticationService: AuthenticationService,
        @inject(PasswordManagementService) private passwordManagementService: PasswordManagementService,
        @inject(ProfileManagementService) private profileManagementService: ProfileManagementService,
        @inject(AuthHelperService) private authHelperService: AuthHelperService,
        @inject(AuthMethodService) private authMethodService: AuthMethodService // Add AuthMethodService
    ) {
        super();
        this.logger.info('[AuthService] Initialized');
    }

    /**
     * Register a new user (Delegated to RegistrationService)
     */
    async signUp(userData: any) {
        this.logger.debug('[AuthService] Delegating user registration to RegistrationService');
        return this.registrationService.signUp(userData);
    }

    /**
     * Send a registration verification code (Delegated to RegistrationService)
     */
    async signUpSendCode(email: string) {
        this.logger.debug('[AuthService] Delegating verification code sending to RegistrationService');
        return this.registrationService.signUpSendCode(email);
    }

    /**
     * Verify a registration code (Delegated to RegistrationService)
     */
    async signUpVerifyCode(email: string, code: string) {
        this.logger.debug('[AuthService] Delegating verification code validation to RegistrationService');
        return this.registrationService.signUpVerifyCode(email, code);
    }

    /**
     * User login (Delegated to AuthenticationService)
     */
    async login(email: string, password: string, req: Request) {
        this.logger.debug('[AuthService] Delegating login to AuthenticationService');
        const result = await this.authenticationService.login(email, password, req);
        this.logger.info('[AuthService] AuthenticationService.login() returned', result);
        return result;
    }

    /**
     * User logout (Delegated to TokenService for token invalidation)
     */
    async logout(userId: number) {
        this.logger.debug('[AuthService] Delegating logout (token invalidation) to TokenService');
        await this.tokenService.invalidateRefreshTokens(userId);
        this.logger.info('[AuthService] User logged out successfully', { userId });
        return { message: 'Logged out successfully' };
    }

    /**
     * Request a password reset (Delegated to PasswordManagementService)
     */
    async forgotPassword(email: string) {
        this.logger.debug('[AuthService] Delegating password reset request to PasswordManagementService');
        return this.passwordManagementService.forgotPassword(email);
    }

    /**
     * Update user password (Delegated to PasswordManagementService)
     */
    async updatePassword(userId: number, currentPassword: string, newPassword: string) {
        this.logger.debug('[AuthService] Delegating password update to PasswordManagementService');
        return this.passwordManagementService.updatePassword(userId, currentPassword, newPassword);
    }

    /**
     * Verify JWT token (Delegated to TokenService)
     */
    async verifyToken(token: string): Promise<{ valid: boolean; decoded?: any }> {
        this.logger.debug('[AuthService] Delegating token verification to TokenService');
        return this.tokenService.verifyToken(token);
    }

    /**
     * Verify email using verification code (Delegated to RegistrationService)
     */
    async verifyEmailCode(email: string, code: string) {
        this.logger.debug('[AuthService] Delegating email verification by code to RegistrationService');
        return this.registrationService.verifyEmailCode(email, code);
    }

    /**
     * Verify email using verification token (Delegated to RegistrationService)
     */
    async verifyEmailToken(token: string) {
        this.logger.debug('[AuthService] Delegating email verification by token to RegistrationService');
        return this.registrationService.verifyEmailToken(token);
    }

    /**
     * Send a verification email (Delegated to RegistrationService)
     */
    async sendVerificationEmail(email: string) {
        this.logger.debug('[AuthService] Delegating verification email sending to RegistrationService');
        return this.registrationService.sendVerificationEmail(email);
    }

    /**
     * Refresh access token using refresh token (Delegated to TokenService)
     */
    async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        this.logger.debug('[AuthService] Delegating token refresh to TokenService');
        return this.tokenService.refreshToken(refreshToken);
    }

    /**
     * Get user profile (Delegated to ProfileManagementService)
     */
    async getProfile(userId: number) {
        this.logger.debug('[AuthService] Delegating profile retrieval to ProfileManagementService');
        return this.profileManagementService.getProfile(userId);
    }

    /**
     * Update user profile (Delegated to ProfileManagementService)
     */
    async updateProfile(userId: number, profileData: any) {
        this.logger.debug('[AuthService] Delegating profile update to ProfileManagementService');
        return this.profileManagementService.updateProfile(userId, profileData);
    }

    /**
     * Google OAuth login (Delegated to ProfileManagementService)
     */
    async googleLogin(token: string) {
        this.logger.debug('[AuthService] Delegating Google login to ProfileManagementService');
        return this.profileManagementService.googleLogin(token);
    }

  /**
   * Setup 2FA for user (Delegated to AuthMethodService)
   */
  async setup2FA(userId: number, type: string = TWO_FACTOR_METHODS.EMAIL) {
    this.logger.debug('[AuthService] Delegating 2FA setup to AuthMethodService', { userId, type });
    // Use '2fa' as the method type and pass the actual type (APP/EMAIL) as an option
    return this.authMethodService.setup(userId, '2fa', { subType: type });
  }

    /**
     * Enable 2FA for user (Delegated to AuthMethodService)
     */
    async enable2FA(userId: number, token: string, type: string = TWO_FACTOR_METHODS.EMAIL) {
        this.logger.debug('[AuthService] Delegating 2FA enable to AuthMethodService');
        return this.authMethodService.enable(userId, token, type);
    }

    /**
     * Disable 2FA for user (Delegated to AuthMethodService)
     */
    async disable2FA(userId: number, password?: string) {
        this.logger.debug('[AuthService] Delegating 2FA disable to AuthMethodService', { userId, hasPassword: !!password });
        return this.authMethodService.disable(userId, password);
    }

    /**
     * Verify 2FA code during login (Delegated to AuthMethodService)
     */
    async verify2FA(tempToken: string, token: string, type: string = TWO_FACTOR_METHODS.EMAIL) {
        this.logger.debug('[AuthService] Delegating 2FA verification to AuthMethodService');
        return this.authMethodService.verify({
            tempToken,
            token,
            type
        });
    }

    /**
     * Get login history
     */
    async getLoginHistory(limit: number = 50) {
        this.logger.debug('[AuthService] Getting login history', { limit });

        try {
            const history = await this.prisma.authHistory.findMany({
                take: limit,
                orderBy: {
                    attemptTime: 'desc'
                }
            });

            // Transform data to include all available fields
            const transformedHistory = history.map(record => {
                let ip = 'Unknown';
                let location = 'Unknown';
                let device = 'Unknown';
                let userAgent = 'Unknown';
                let referer = 'Unknown';

                // Extract IP and location from ispData if available
                if (record.ispData && typeof record.ispData === 'object') {
                    const ispData = record.ispData as any;
                    ip = ispData.clientIp || ispData.ip || ip;
                    location = ispData.location || ispData.city || location;
                }

                // Extract device info from deviceData if available
                if (record.deviceData && typeof record.deviceData === 'object') {
                    const deviceData = record.deviceData as any;
                    userAgent = deviceData.user_agent || deviceData.userAgent || userAgent;
                    device = deviceData.device || this.extractDeviceFromUserAgent(userAgent);
                    referer = deviceData.referer || referer;
                    ip = deviceData.ip || ip; // IP might also be in deviceData
                }

                return {
                    // Basic fields
                    id: record.id,
                    timestamp: record.attemptTime?.toISOString() || new Date().toISOString(),
                    ip,
                    device,
                    location,
                    status: record.result === 'success' ? 'Success' : 'Failed',
                    method: 'Password', // Default method, could be enhanced later
                    
                    // Additional fields from database
                    email: record.email || 'Unknown',
                    login: record.login || 'Unknown',
                    userId: record.userId,
                    userName: record.userName || 'Unknown',
                    result: record.result,
                    userAgent,
                    referer,
                    
                    // Raw data for debugging
                    deviceData: record.deviceData,
                    ispData: record.ispData,
                    
                    // Timestamps
                    createdAt: record.createdAt?.toISOString(),
                    updatedAt: record.updatedAt?.toISOString(),
                    attemptTime: record.attemptTime?.toISOString()
                };
            });

            this.logger.info('[AuthService] Login history retrieved successfully', { 
                count: transformedHistory.length 
            });

            return transformedHistory;
        } catch (error) {
            this.logger.error('[AuthService] Failed to get login history', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Extract device type from user agent string
     */
    private extractDeviceFromUserAgent(userAgent: string): string {
        if (userAgent === 'Unknown') return 'Unknown';
        
        const ua = userAgent.toLowerCase();
        
        if (ua.includes('mobile') || ua.includes('android')) return 'Mobile';
        if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS Device';
        if (ua.includes('tablet')) return 'Tablet';
        if (ua.includes('windows')) return 'Windows PC';
        if (ua.includes('macintosh') || ua.includes('mac os')) return 'Mac';
        if (ua.includes('linux')) return 'Linux';
        if (ua.includes('chrome')) return 'Chrome Browser';
        if (ua.includes('firefox')) return 'Firefox Browser';
        if (ua.includes('safari')) return 'Safari Browser';
        
        return 'Desktop';
    }
}
