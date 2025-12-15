import { inject } from 'tsyringe';
import { BaseService } from '../../../core/base/BaseService.js';
import { Service } from '../../../core/decorators/component.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { EmailService } from '../../email/services/EmailService.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../../core/base/BaseError.js';

@Service()
export class PasswordManagementService extends BaseService {

    constructor(
        @inject(EmailService) private emailService: EmailService
    ) {
        super();
        this.logger.info('[PasswordManagementService] Initialized');
    }

    /**
     * Request a password reset
     */
    async forgotPassword(email: string) {
        this.logger.debug('[PasswordManagementService] Processing password reset request', { email });

        this.logger.debug('[PasswordManagementService] Looking up user', { email });
        const user = await this.prisma.authUser.findUnique({
            where: { email }
        });

        if (!user) {
            this.logger.debug('[PasswordManagementService] User not found for password reset, returning success for security', { email });
            // Return success even if user doesn't exist for security
            return { message: 'Password reset instructions sent' };
        }

        // Generate reset token
        this.logger.debug('[PasswordManagementService] Generating reset token', { userId: user.id });
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Save token to database
        this.logger.debug('[PasswordManagementService] Checking for existing reset token', { userId: user.id });
        const existingReset = await this.prisma.authPasswordReset.findFirst({
            where: { userId: user.id }
        });

        if (existingReset) {
            // Refresh existing token
            this.logger.debug('[PasswordManagementService] Updating existing reset token', { userId: user.id, resetId: existingReset.id });
            await this.prisma.authPasswordReset.update({
                where: { id: existingReset.id },
                data: {
                    token: hashedToken,
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry
                }
            });
        } else {
            // Create new token
            this.logger.debug('[PasswordManagementService] Creating new reset token', { userId: user.id });
            await this.prisma.authPasswordReset.create({
                data: {
                    userId: user.id,
                    token: hashedToken,
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry
                }
            });
        }

        this.logger.debug('[PasswordManagementService] Sending password reset email', { userId: user.id, email });
        await this.emailService.sendPasswordResetEmail(email, resetToken, user.userName || email.split('@')[0]);

        this.logger.info('[PasswordManagementService] Password reset instructions sent successfully', { userId: user.id, email });
        return { message: 'Password reset instructions sent' };
    }

    /**
     * Update user password
     */
    async updatePassword(userId: number, currentPassword: string, newPassword: string) {
        this.logger.debug('[PasswordManagementService] Processing password update request', { userId });

        // Input validation
        if (!currentPassword || !newPassword) {
            this.logger.warn('[PasswordManagementService] Password update failed - Missing required fields', { userId });
            throw new BadRequestError('Both old and new passwords are required');
        }

        // Get user with careful null checking
        this.logger.debug('[PasswordManagementService] Looking up user', { userId });
        const user = await this.prisma.authUser.findUnique({
            where: { id: userId }
        });

        // Check if user exists
        if (!user) {
            this.logger.warn('[PasswordManagementService] Password update failed - User not found', { userId });
            throw new NotFoundError('User not found');
        }

        // Check if password exists in user record
        if (!user.password) {
            this.logger.warn('[PasswordManagementService] Password update failed - Account has no password set', { userId });
            throw new BadRequestError('Account has no password set (social login?)');
        }

        // Verify old password
        this.logger.debug('[PasswordManagementService] Verifying current password', { userId });
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            this.logger.warn('[PasswordManagementService] Password update failed - Current password is incorrect', { userId });
            throw new UnauthorizedError('Current password is incorrect');
        }

        // Hash new password
        this.logger.debug('[PasswordManagementService] Hashing new password', { userId });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password in database
        this.logger.debug('[PasswordManagementService] Updating password in database', { userId });
        await this.prisma.authUser.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        // Log the successful password change (for security auditing)
        this.logger.info('[PasswordManagementService] Password updated successfully', { userId });

        return { message: 'Password updated successfully' };
    }
}
