import { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import { AuthService } from '../services/AuthService';
import { inject, injectable } from 'tsyringe';
import { VerificationService } from '../services/VerificationService';
import { SessionManagementService } from '../services/SessionManagementService';
import { Controller } from '../../../core/decorators/component.js';
import crypto from 'crypto';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../../core/base/BaseError.js';
import { FileSystemService, UploadedFile } from '../../storage/services/FileSystemService.js';
import { StorageController } from '../../storage/controllers/StorageController.js';
import { StorageService } from '../../storage/services/StorageService.js';
import { TWO_FACTOR_METHODS } from '../constants';
import { AuthResponse } from '../services/methods/IAuthMethod';
import { TokenService } from '../services/TokenService.js';


@Controller({ path: 'auth' })
@injectable()
export class AuthController extends BaseController {
    constructor(
        @inject(AuthService) private authService: AuthService,
        @inject(VerificationService) private verificationService: VerificationService,
        @inject(StorageController) private StorageController: StorageController,
        @inject(SessionManagementService) private sessionManagementService: SessionManagementService,
        @inject(StorageService) private storageService: StorageService,
        @inject(TokenService) private tokenService: TokenService
    ) {
        super();
    }

    /**
     * Register new user
     */
    async signUp(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing sign up request');
        
        try {
            const userData = this.getValidatedData(req as any); // Ensure cast is applied here too
            this.logger.debug('[AuthController] User data validated successfully');
            
            const result = await this.authService.signUp(userData);
            this.logger.info('[AuthController] User signup completed successfully', { email: userData.email });
            
            return result;
        } catch (error) {
            this.logger.error('[AuthController] Sign up request failed', { 
                error: error.message, 
                stack: error.stack 
            });
            throw error;
        }
    }

    /**
     * User login
     */
    async login(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing login request');
        
        try {
            const { email, password } = this.getValidatedData(req as any); // Cast req to any
            this.logger.debug('[AuthController] Login data validated', { email });
            
            const result: AuthResponse = await this.authService.login(email, password, req as any); // Cast req to any
            this.logger.info('[AuthController] Login process completed', {
                email,
                requiresTwoFactor: result.requiresTwoFactor 
            });
            this.logger.info('[AuthController] AuthService.login() returned', result);

            // Always return abilityRules if present
            // Standardize response format
            return {
                requiresTwoFactor: result.requiresTwoFactor ?? false,
                requiresEmailVerification: result.requiresEmailVerification ?? false,
                user: result.user ?? null,
                abilityRules: result.abilityRules ?? [],
                accessToken: result.accessToken ?? null,
                refreshToken: result.refreshToken ?? null,
                tempToken: result.tempToken ?? null,
                method: result.method ?? null,
                message: result.message ?? null,
                email: result.email ?? null,
                twoFactorType: result.twoFactorType ?? null
            };
        } catch (error) {
            this.logger.error('[AuthController] Login request failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * User logout
     */
    async logout(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing logout request', { userId: req.user?.id });

        try {
            const result = await this.authService.logout(req.user.id);
            this.logger.info('[AuthController] User logged out successfully', { userId: req.user.id });

            return result;
        } catch (error) {
            this.logger.error('[AuthController] Logout request failed', {
                userId: req.user?.id,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Get user profile
     */
    async getProfile(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing get profile request', { userId: req.user?.id });

        try {
            const result = await this.authService.getProfile(req.user.id);
            this.logger.info('[AuthController] Profile retrieved successfully', result);

            // Return user and abilityRules in unified format
            return {
                user: result.user,
                abilityRules: result.abilityRules
            };

        } catch (error) {
            this.logger.error('[AuthController] Get profile request failed', {
                userId: req.user?.id,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing profile update request', { userId: req.user?.id });

        try {
            const profileData = this.getValidatedData(req as any); // Cast req to any
            this.logger.debug('[AuthController] Profile update data validated', { profileData: profileData });

            const result = await this.authService.updateProfile(req.user.id, profileData);
            this.logger.info('[AuthController] Profile updated successfully', { userId: req.user.id });

            // Use res.json directly to prevent further processing by RouterHelper
            return result;
        } catch (error) {
            this.logger.error('[AuthController] Profile update request failed', {
                userId: req.user?.id,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Refresh JWT token
     */
    async refreshToken(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing token refresh request');

        try {
            const { refreshToken } = this.getValidatedData(req as any); // Cast req to any
            this.logger.debug('[AuthController] Token refresh data validated');

            const result = await this.authService.refreshToken(refreshToken);
            this.logger.info('[AuthController] Token refresh completed successfully');

            return result;
        } catch (error) {
            this.logger.error('[AuthController] Token refresh request failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Google OAuth login
     */
    async googleLogin(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing Google OAuth login request');

        try {
            const { token } = this.getValidatedData(req as any); // Cast req to any
            this.logger.debug('[AuthController] Google OAuth login data validated');

            const result = await this.authService.googleLogin(token);
            this.logger.info('[AuthController] Google OAuth login completed successfully', {
                userId: result.user?.id,
                email: result.user?.email
            });

            return result;
        } catch (error) {
            this.logger.error('[AuthController] Google OAuth login request failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Send verification code or link
     */
    async sendVerification(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing send verification request');

        try {
            const {
                email,
                userId,
                type,
                channel = 'email',
                method = 'code'
            } = this.getValidatedData(req as any); // Cast req to any

            this.logger.debug('[AuthController] Verification data validated', {
                email,
                userId,
                type,
                channel,
                method
            });

            const result = await this.verificationService.generateVerification({
                email,
                userId,
                type,
                channel,
                method
            });

            this.logger.info('[AuthController] Verification sent successfully', {
                email,
                userId,
                type
            });

            this.logger.debug('[AuthController] Verification result', { result });

            return result;

        } catch (error) {
            this.logger.error('[AuthController] Send verification request failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Confirm verification code
     */

    async confirmVerification(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing code verification request');

        try {
            const { email, userId, code, type, tempToken } = this.getValidatedData(req as any);

            this.logger.debug('[AuthController] Code verification data validated', {
                email, userId, type
            });

            try {
                this.logger.debug('[AuthController] Verifying code', { email, userId, code, type, tempToken });
                let result = await this.verificationService.verifyCode({
                    email, userId, code, type, tempToken
                });

                this.logger.debug('[AuthController] Code verification result', { result });

                if (result && result?.success === true) {
                    this.logger.info('[AuthController] Code verification completed successfully', {
                        email, userId, type
                    });


                    if (type === 'password-reset') {
                        // Generate one-time token for password reset
                        const resetToken = await this.generateOneTimeResetToken(result.user.id);
                        result = { ...result, resetToken } as any;
                    }

                    // Registration with direct auth
                    if (type === 'registration' && req.query.directAuth === 'true') {
                        try {
                            const authResult = await this.verificationService.handleTempLogin(email, req as any);
                            this.logger.info('[AuthController] Temp-login during verification completed successfully');

                            if (authResult) {
                                const userData = authResult.data?.data || {};

                                return {
                                    requiresTwoFactor: userData.requiresTwoFactor || false,
                                    user: userData.user || {},
                                    accessToken: userData.accessToken,
                                    refreshToken: userData.refreshToken,
                                    message: 'Verification completed and login successful'
                                };
                            }
                        } catch (loginError) {
                            this.logger.error('[AuthController] Auto-login during verification failed', {
                                error: loginError.message, stack: loginError.stack
                            });
                            throw loginError;
                        }
                    }

                    return result;
                } else {
                    this.logger.error('[AuthController] Code verification result invalid', { result });
                    throw new BadRequestError('Code verification failed');
                }
            } catch (verificationError) {
                this.logger.error('[AuthController] Code verification failed', {
                    error: verificationError.message, stack: verificationError.stack
                });
                throw verificationError;
            }
        } catch (error) {
            this.logger.error('[AuthController] Code verification request failed', {
                error: error.message, stack: error.stack
            });
            throw error;
        }
    }



    /**
     * Verify token from link
     */
    async verifyTokenLink(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing token verification request');

        try {
            const { token, type } = this.getValidatedData(req as any); // Cast req to any
            this.logger.debug('[AuthController] Token verification data validated', { type });

            const result = await this.verificationService.verifyToken({
                token,
                type
            });

            this.logger.info('[AuthController] Token verification completed successfully', { type });

            return result;
        } catch (error) {
            this.logger.error('[AuthController] Token verification request failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Request password reset
     */
    async resetPasswordRequest(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing password reset request');

        try {
            const { email, method = 'link' } = this.getValidatedData(req as any); // Cast req to any
            this.logger.debug('[AuthController] Password reset data validated', { email, method });

            const result = await this.verificationService.generateVerification({
                email,
                type: 'password-reset',
                channel: 'email',
                method
            });

            this.logger.info('[AuthController] Password reset request processed', { email });

            return { message: 'Password reset instructions sent' };

            //return this.success(res, { message: 'Password reset instructions sent' });

        } catch (error) {
            this.logger.error('[AuthController] Password reset request failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Reset password with token
     */
    async resetPassword(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing password reset with token');

        try {
            const { token, newPassword } = this.getValidatedData(req as any); // Cast req to any
            this.logger.debug('[AuthController] Password reset data validated');

            const result = await this.verificationService.resetPassword(token, newPassword);
            this.logger.info('[AuthController] Password reset completed successfully');

            return result;
        } catch (error) {
            this.logger.error('[AuthController] Password reset failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Update user password (for logged in users)
     */
    async updatePassword(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing password update request', { userId: req.user?.id });

        try {
            const { currentPassword, newPassword } = this.getValidatedData(req as any); // Cast req to any
            this.logger.debug('[AuthController] Password update data validated', { userId: req.user?.id });
            this.logger.debug('[AuthController] Password update data validated', { currentPassword, newPassword });

            const result = await this.authService.updatePassword(req.user.id, currentPassword, newPassword);
            this.logger.info('[AuthController] Password updated successfully', { userId: req.user.id });

            return result;
        } catch (error) {
            this.logger.error('[AuthController] Password update request failed', {
                userId: req.user?.id,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Setup 2FA for user
     */
    async setup2FA(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing 2FA setup request', { userId: req.user?.id });

        try {
            const { type = TWO_FACTOR_METHODS.EMAIL } = this.getValidatedData(req as any); // Cast req to any
            this.logger.debug('[AuthController] 2FA setup data validated', { userId: req.user?.id, type });

            const result = await this.authService.setup2FA(req.user.id, type);
            this.logger.info('[AuthController] 2FA setup completed', { userId: req.user.id, type });

            return result;
        } catch (error) {
            this.logger.error('[AuthController] 2FA setup request failed', {
                userId: req.user?.id,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Enable 2FA for user
     */
    async enable2FA(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing 2FA enable request', { userId: req.user?.id });

        try {
            const { token, type = TWO_FACTOR_METHODS.EMAIL } = this.getValidatedData(req as any); // Cast req to any
            this.logger.debug('[AuthController] 2FA enable data validated', { userId: req.user?.id, type });

            const result = await this.authService.enable2FA(req.user.id, token, type);
            this.logger.info('[AuthController] 2FA enabled successfully', { userId: req.user.id, type });

            return result;
        } catch (error) {
            this.logger.error('[AuthController] 2FA enable request failed', {
                userId: req.user?.id,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Disable 2FA for user
     */
    async disable2FA(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing 2FA disable request', { userId: req.user?.id });

        try {
            const { password } = this.getValidatedData(req as any); // Cast req to any
            this.logger.debug('[AuthController] 2FA disable data validated', { userId: req.user?.id, hasPassword: !!password });

            const result = await this.authService.disable2FA(req.user.id, password);
            this.logger.info('[AuthController] 2FA disabled successfully', { userId: req.user.id });

            return result;
        } catch (error) {
            this.logger.error('[AuthController] 2FA disable request failed', {
                userId: req.user?.id,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Verify 2FA during login
     */
    async verify2FA(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing 2FA verification request');

        try {
            const { tempToken, token, type } = this.getValidatedData(req as any); // Cast req to any
            this.logger.debug('[AuthController] 2FA verification data validated');

            const result = await this.authService.verify2FA(tempToken, token, type);
            this.logger.info('[AuthController] 2FA verification completed', { userId: result.userData?.id });

            // Standardize response format to match login response
            return {
                requiresTwoFactor: result.requiresTwoFactor ?? false,
                requiresEmailVerification: result.requiresEmailVerification ?? false,
                user: result.userData ?? null, // Map userData to user for consistency
                abilityRules: result.abilityRules ?? [],
                accessToken: result.accessToken ?? null,
                refreshToken: result.refreshToken ?? null,
                message: result.message ?? null
            };

        } catch (error) {
            this.logger.error('[AuthController] 2FA verification request failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Generate one-time token for password reset
     * @param userId - The ID of the user
     * @returns The generated token
     */
    private async generateOneTimeResetToken(userId: number): Promise<string> {
        this.logger.debug('[AuthController] Generating one-time password reset token', { userId });

        // Generate token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

        // Set expiration (1 hour)
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        // Store token in password_resets table
        const existingReset = await this.prisma.authPasswordReset.findFirst({
            where: { userId }
        });

        if (existingReset) {
            await this.prisma.authPasswordReset.update({
                where: { id: existingReset.id },
                data: {
                    token: hashedToken,
                    expiresAt
                }
            });
        } else {
            await this.prisma.authPasswordReset.create({
                data: {
                    userId,
                    token: hashedToken,
                    expiresAt
                }
            });
        }

        // Return token to frontend
        this.logger.info('[AuthController] One-time password reset token generated successfully');
        return verificationToken;
    }

    /**
     * Middleware for avatar upload
     */
    uploadAvatarMiddleware() {
        // Use the existing middleware method from the injected FileSystemController
        this.logger.debug('[AuthController] Getting avatar upload middleware from FileSystemController');
        return this.StorageController.uploadMiddleware; // Use the dedicated middleware method
    }

    /**
     * Get login history
     */
    async getLoginHistory(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing login history request');

        try {
            const { limit = 50 } = req.query;
            const result = await this.authService.getLoginHistory(Number(limit));
            
            this.logger.info('[AuthController] Login history retrieved successfully', { 
                count: result.length 
            });

            return result;
        } catch (error) {
            this.logger.error('[AuthController] Login history request failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Upload avatar
     */
    async uploadAvatar(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing avatar upload request', { userId: req.user?.id });

        try {
            // Check for Multer errors potentially attached to req by middleware
            if ((req as any).multerError) {
                throw (req as any).multerError;
            }

            if (!req.file) {
                throw new BadRequestError('No file uploaded or file rejected by filter');
            }

            if (!req.user || !req.user.id) {
                throw new UnauthorizedError('Authentication required');
            }

            // Use StorageService for proper DSL integration
            const storageFile = await this.storageService.saveFileWithMetadata(
                req.file as any,
                req.user,
                {
                    moduleContext: 'auth',
                    contextId: 'avatar',
                    visibility: 'PRIVATE',
                    description: 'User avatar image'
                }
            );

            // Use GUID-based URL for avatar access
            const avatarUrl = `/api/storage/${storageFile.id}`;

            const updatedUser = await this.authService.updateProfile(req.user.id, {
                avatarUrl: avatarUrl
            });

            this.logger.info('[AuthController] Avatar uploaded successfully', {
                userId: req.user.id,
                fileId: storageFile.id,
                avatarUrl: avatarUrl
            });

            const responsePayload = {
                success: true,
                avatarUrl: avatarUrl,
                fileId: storageFile.id,
                user: updatedUser
            };

            // Ensure response is sent only once. BaseController or error middleware might handle this.
            if (!res.headersSent) {
                res.json(responsePayload);
            }

        } catch (error) {
            this.logger.error('[AuthController] Avatar upload processing failed', {
                userId: req.user?.id,
                error: error.message,
                stack: error.stack
            });

            if (!res.headersSent) {
                res.status(error.status || 500).json({ error: error.message });
            }
        }
    }

    /**
     * Get active sessions
     */
    async getActiveSessions(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing get active sessions request', { userId: req.user?.id });

        try {
            // Determine if user can see all sessions (admin) or just their own
            const userId = await this.isUserAdmin(req.user.id) ? undefined : req.user.id;
            
            const sessions = await this.sessionManagementService.getActiveSessions(userId);
            
            this.logger.info('[AuthController] Active sessions retrieved successfully', { 
                count: sessions.length,
                requestingUserId: req.user.id,
                isAdmin: userId === undefined
            });

            return sessions;
        } catch (error) {
            this.logger.error('[AuthController] Get active sessions request failed', {
                userId: req.user?.id,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Terminate a specific session
     */
    async terminateSession(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing terminate session request', { 
            userId: req.user?.id,
            sessionId: req.params.sessionId
        });

        try {
            const { sessionId } = req.params;
            
            if (!sessionId) {
                throw new BadRequestError('Session ID is required');
            }

            await this.sessionManagementService.terminateSession(sessionId, req.user.id);
            
            this.logger.info('[AuthController] Session terminated successfully', {
                sessionId,
                requestingUserId: req.user.id
            });

            return { message: 'Session terminated successfully' };
        } catch (error) {
            this.logger.error('[AuthController] Terminate session request failed', {
                userId: req.user?.id,
                sessionId: req.params.sessionId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Terminate all sessions for a user
     */
    async terminateUserSessions(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing terminate user sessions request', {
            requestingUserId: req.user?.id,
            targetUserId: req.params.userId
        });

        try {
            const { userId } = req.params;
            const targetUserId = parseInt(userId, 10);
            
            if (isNaN(targetUserId)) {
                throw new BadRequestError('Valid user ID is required');
            }

            // Get current session ID from headers to exclude it
            const currentSessionId = req.headers['current-session-id'] as string;
            
            const count = await this.sessionManagementService.terminateUserSessions(
                targetUserId,
                currentSessionId,
                req.user.id
            );
            
            this.logger.info('[AuthController] User sessions terminated successfully', {
                targetUserId,
                count,
                requestingUserId: req.user.id
            });

            return { 
                message: `${count} sessions terminated successfully`,
                count 
            };
        } catch (error) {
            this.logger.error('[AuthController] Terminate user sessions request failed', {
                requestingUserId: req.user?.id,
                targetUserId: req.params.userId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Terminate all sessions globally (admin only)
     */
    async terminateAllSessions(req: Request, res: Response) {
        this.logger.debug('[AuthController] Processing terminate all sessions request', {
            adminUserId: req.user?.id
        });

        try {
            const count = await this.sessionManagementService.terminateAllSessions(req.user.id);
            
            this.logger.info('[AuthController] All sessions terminated globally', {
                count,
                adminUserId: req.user.id
            });

            return { 
                message: `${count} sessions terminated globally`,
                count 
            };
        } catch (error) {
            this.logger.error('[AuthController] Terminate all sessions request failed', {
                adminUserId: req.user?.id,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Check if user is admin
     */
    private async isUserAdmin(userId: number): Promise<boolean> {
        try {
            const user = await this.prisma.authUser.findUnique({
                where: { id: userId },
                select: { isAdmin: true, role: true }
            });

            return user?.isAdmin === true || user?.role === 'admin';
        } catch (error) {
            this.logger.error('[AuthController] Failed to check admin status', {
                error: error.message,
                userId
            });
            return false;
        }
    }

    /**
     * Exchange INTERNAL_API_TOKEN for JWT token
     * POST /api/auth/system-token
     *
     * This endpoint allows system services (like Claude Code) to authenticate
     * using the INTERNAL_API_TOKEN and receive a JWT token for an admin user.
     */
    async exchangeSystemToken(req: Request, res: Response) {
        const { systemToken } = req.body;

        if (!systemToken) {
            throw new BadRequestError('systemToken is required');
        }

        // Verify system token matches INTERNAL_API_TOKEN from .env
        const internalToken = process.env.INTERNAL_API_TOKEN;

        if (!internalToken || systemToken !== internalToken) {
            this.logger.warn('[AuthController] Invalid system token attempt');
            throw new UnauthorizedError('Invalid system token');
        }

        this.logger.info('[AuthController] Valid system token - generating admin JWT');

        // Find first admin user
        const adminUser = await this.prisma.authUser.findFirst({
            where: {
                OR: [
                    { isAdmin: true },
                    { role: 'admin' }
                ]
            },
            include: {
                userRoles: {
                    include: {
                        role: true
                    }
                }
            }
        });

        if (!adminUser) {
            throw new NotFoundError('No admin user found in the system');
        }

        // Generate JWT tokens
        const { accessToken, refreshToken } = await this.tokenService.generateTokens({
            id: adminUser.id,
            email: adminUser.email,
            roles: adminUser.userRoles?.map(ur => ur.role.name) || ['admin']
        });

        this.logger.info('[AuthController] System token exchanged for JWT', {
            userId: adminUser.id,
            email: adminUser.email
        });

        return {
            success: true,
            accessToken,
            refreshToken,
            user: {
                id: adminUser.id,
                email: adminUser.email,
                username: adminUser.username,
                roles: adminUser.userRoles?.map(ur => ur.role.name) || ['admin']
            }
        };
    }
}
