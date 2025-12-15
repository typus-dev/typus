import { BaseModule } from '../../core/base/BaseModule.js';
import { AuthController } from './controllers/AuthController';
import { AuthService } from './services/AuthService';
import { Module } from '../../core/decorators/component.js';
import multer from 'multer';
import { BadRequestError } from '../../core/base/BaseError.js';
import { container } from 'tsyringe'; // Keep container for specific registrations

// Import new services
import { PasswordAuth } from './services/methods/PasswordAuth.js';
import { TwoFactorAuth } from './services/methods/TwoFactorAuth.js';
import { AuthMethodFactory } from './services/methods/AuthMethodFactory.js';
import { AuthMethodService } from './services/AuthMethodService';
import { SessionManagementService } from './services/SessionManagementService';


@Module({ path: 'auth' })
export class AuthModule extends BaseModule<AuthController, AuthService> { // Add generic types

    constructor() {
        const basePath = 'auth';
        // Pass classes directly to super
        super(basePath, AuthController, AuthService);

        // Register auth method implementations
        container.register(PasswordAuth, { useClass: PasswordAuth });
        container.register(TwoFactorAuth, { useClass: TwoFactorAuth });
        container.register(AuthMethodFactory, { useClass: AuthMethodFactory });
        container.register(AuthMethodService, { useClass: AuthMethodService });
        container.register(SessionManagementService, { useClass: SessionManagementService });
    }

    /**
     * Initialize module
     */
    protected initialize(): void {
        this.logger.info(`[${this.moduleName}] module initialized`);
    }

    /**
     * Initialize module routes
     */    
    protected initializeRoutes(): void {
        this.logger.info(`[${this.moduleName}] routes initializing...`);

        // Registration and authentication
        this.router.post('/signup', [], this.controller.signUp.bind(this.controller));
        this.router.post('/login', [], this.controller.login.bind(this.controller));
        this.router.post('/logout', [this.auth()], this.controller.logout.bind(this.controller));
        this.router.post('/refresh-token', [], this.controller.refreshToken.bind(this.controller));

        // System token exchange (no auth required - validates systemToken internally)
        this.router.post('/system-token', [], this.controller.exchangeSystemToken.bind(this.controller));

        // Verification
        this.router.post('/verify/send', [], this.controller.sendVerification.bind(this.controller));
        this.router.post('/verify/confirm', [], this.controller.confirmVerification.bind(this.controller));
        this.router.post('/verify/token', [], this.controller.verifyTokenLink.bind(this.controller));

        // Password management
        this.router.post('/password/reset-request', [], this.controller.resetPasswordRequest.bind(this.controller));
        this.router.post('/password/reset', [], this.controller.resetPassword.bind(this.controller));
        this.router.post('/password/update', [this.auth()], this.controller.updatePassword.bind(this.controller));

        // 2FA
        this.router.post('/2fa/setup', [this.auth()], this.controller.setup2FA.bind(this.controller));
        this.router.post('/2fa/enable', [this.auth()], this.controller.enable2FA.bind(this.controller));
        this.router.post('/2fa/disable', [this.auth()], this.controller.disable2FA.bind(this.controller));
        this.router.post('/2fa/verify', [], this.controller.verify2FA.bind(this.controller));

        // Profile
        this.router.get('/profile', [this.auth()], this.controller.getProfile.bind(this.controller));
        this.router.post('/profile', [this.auth()], this.controller.updateProfile.bind(this.controller));

        // Login History

        this.router.get('/login-history', [this.auth()], this.controller.getLoginHistory.bind(this.controller));

        // Avatar
        // Create a dedicated multer instance for avatar upload here
        const avatarStorage = multer.memoryStorage();
        const avatarMulter = multer({
            storage: avatarStorage,
            limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
                    // Pass error to callback
                    return cb(new BadRequestError('Only image files (jpeg, png, gif, webp) are allowed'));
                }
                // Accept file
                cb(null, true);
            }
        });
        // Use the dedicated multer middleware instance
        this.router.post('/avatar', [avatarMulter.single('avatar'), this.auth()], this.controller.uploadAvatar.bind(this.controller)); // Bind controller method

        // OAuth
        this.router.post('/google/login', [], this.controller.googleLogin.bind(this.controller));
        

        // Session Management
        this.router.get('/sessions', [this.auth()], this.controller.getActiveSessions.bind(this.controller));
        this.router.delete('/sessions/:sessionId', [this.auth()], this.controller.terminateSession.bind(this.controller));
        this.router.delete('/sessions/user/:userId', [this.auth()], this.controller.terminateUserSessions.bind(this.controller));
        this.router.delete('/sessions/all', [this.auth()], this.controller.terminateAllSessions.bind(this.controller));

        this.logger.info(`[${this.moduleName}] routes initialized`);
    }
}
