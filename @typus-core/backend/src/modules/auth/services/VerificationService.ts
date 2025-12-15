import { inject } from 'tsyringe';
import { BaseService } from '../../../core/base/BaseService.js';
import { Service } from '../../../core/decorators/component.js';
import { Request } from 'express';
import { EmailService } from '../../email/services/EmailService.js';
import { AuthService } from './AuthService';
import { TwoFactorAuth } from './methods/TwoFactorAuth.js';
import crypto from 'crypto';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../../core/base/BaseError.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { TWO_FACTOR_METHODS } from '../constants.js'

// Define verification types
export type VerificationType = 'registration' | 'password-reset' | '2fa' | 'email-change';
export type VerificationChannel = 'email' | 'sms' | 'telegram';
export type VerificationMethod = 'code' | 'link';

@Service()
export class VerificationService extends BaseService {
    constructor(
        @inject(EmailService) private emailService: EmailService,
        @inject(AuthService) private authService: AuthService,
        @inject(TwoFactorAuth) private twoFactorAuth: TwoFactorAuth
    ) {
        super();
    }

    /**
     * Generate verification code or token
     */
    async generateVerification(options: {
        userId?: number;
        email?: string;
        type: VerificationType;
        channel: VerificationChannel;
        method: VerificationMethod;
        twoFactorMethod?: string;
    }): Promise<{token?: string, code?: string, message: string}> {
        this.logger.debug('[VerificationService] Generating verification', options);
        
        if (!options.userId && !options.email) {
            throw new BadRequestError('Either userId or email is required');
        }

        let userId = options.userId;
        let email = options.email;
        
        if (!userId && email) {
            const user = await this.prisma.authUser.findUnique({
                where: { email }
            });
            
            if (!user) {
                throw new NotFoundError('User not found');
            }
            
            userId = user.id;
        } else if (userId && !email) {
            const user = await this.prisma.authUser.findUnique({
                where: { id: userId }
            });
            
            if (!user) {
                throw new NotFoundError('User not found');
            }
            
            email = user.email;
        }

        if (options.method === 'code') {
            return await this.generateVerificationCode({
                userId,
                email,
                type: options.type,
                channel: options.channel,
                twoFactorMethod: options.twoFactorMethod || TWO_FACTOR_METHODS.EMAIL
            });
        } else {
            return await this.generateVerificationLink({
                userId,
                email,
                type: options.type,
                channel: options.channel
            });
        }
    }

    /**
     * Handle auto-login after verification
     */
    async handleTempLogin(email: string, req: Request): Promise<any> {
        this.logger.debug('[VerificationService] Handling temp-login', { email });
        
        const user = await this.prisma.authUser.findUnique({
            where: { email }
        });

        if (user) {
            const tempPassword = crypto.randomBytes(8).toString('hex');
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            await this.prisma.authUser.update({
                where: { id: user.id },
                data: { password: hashedPassword }
            });

            await this.emailService.sendPasswordEmail(
                email,
                tempPassword,
                user.userName || email.split('@')[0]
            );

            return await this.authService.login(email, tempPassword, req);
        }
        
        return null;
    }

    /**
     * Generate verification code
     */
    private async generateVerificationCode(options: {
        userId: number;
        email: string;
        type: VerificationType;
        channel: VerificationChannel;
        twoFactorMethod?: string;
    }): Promise<{code: string, message: string}> {
        this.logger.debug('[VerificationService] Generating verification code', { 
            userId: options.userId,
            type: options.type,
            channel: options.channel
        });
        
        if (options.type === '2fa') {
            const twoFactorMethod = options.twoFactorMethod || TWO_FACTOR_METHODS.EMAIL;
            this.logger.debug('[VerificationService] Generating 2FA code with method', {
                userId: options.userId,
                method: twoFactorMethod
            });

            // For EMAIL 2FA, use generateEmailCode() which actually sends the email
            if (twoFactorMethod.toLowerCase() === TWO_FACTOR_METHODS.EMAIL) {
                const result = await this.twoFactorAuth.generateEmailCode(options.userId);
                return {
                    code: null,
                    message: result.message || 'Verification code sent'
                };
            }

            // For other methods (APP), use setup2FA
            const result = await this.authService.setup2FA(options.userId, twoFactorMethod);
            return {
                code: null,
                message: 'Verification code sent'
            };
        }
        
        const code = crypto.randomInt(100000, 999999).toString();
        this.logger.debug('[VerificationService] Code generated', { userId: options.userId });
        
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        
        await this.prisma.authVerificationCode.upsert({
            where: { email: options.email },
            update: { 
                code, 
                expiresAt 
            },
            create: { 
                email: options.email, 
                code, 
                expiresAt 
            }
        });
        
        if (options.channel === 'email') {
            await this.emailService.sendVerificationCodeEmail(
                options.email, 
                code, 
                options.email.split('@')[0]
            );
        } else {
            this.logger.warn('[VerificationService] Channel not implemented', { channel: options.channel });
        }
        
        return { code, message: 'Verification code sent' };
    }

    /**
     * Generate verification link with token
     */
    private async generateVerificationLink(options: {
        userId: number;
        email: string;
        type: VerificationType;
        channel: VerificationChannel;
    }): Promise<{token: string, message: string}> {
        this.logger.debug('[VerificationService] Generating verification link', { 
            userId: options.userId,
            type: options.type,
            channel: options.channel
        });
        
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
        
        let expiresAt: Date;
        switch (options.type) {
            case 'registration':
            case 'email-change':
                expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
                break;
            case 'password-reset':
                expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
                break;
            default:
                expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }
        
        switch (options.type) {
            case 'registration':
            case 'email-change':
                const existingVerification = await this.prisma.authEmailVerification.findFirst({
                    where: { userId: options.userId }
                });
                
                if (existingVerification) {
                    await this.prisma.authEmailVerification.update({
                        where: { id: existingVerification.id },
                        data: {
                            token: hashedToken,
                            expiresAt
                        }
                    });
                } else {
                    await this.prisma.authEmailVerification.create({
                        data: {
                            userId: options.userId,
                            token: hashedToken,
                            expiresAt
                        }
                    });
                }
                break;
                
            case 'password-reset':
                const existingReset = await this.prisma.authPasswordReset.findFirst({
                    where: { userId: options.userId }
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
                            userId: options.userId,
                            token: hashedToken,
                            expiresAt
                        }
                    });
                }
                break;
        }
        
        if (options.channel === 'email') {
            switch (options.type) {
                case 'registration':
                case 'email-change':
                    await this.emailService.sendVerificationEmail(
                        options.email, 
                        verificationToken, 
                        options.email.split('@')[0]
                    );
                    break;
                    
                case 'password-reset':
                    await this.emailService.sendPasswordResetEmail(
                        options.email, 
                        verificationToken, 
                        options.email.split('@')[0]
                    );
                    break;
            }
        } else {
            this.logger.warn('[VerificationService] Channel not implemented', { channel: options.channel });
        }
        
        return { token: verificationToken, message: 'Verification link sent' };
    }

    /**
     * Verify code
     */
    async verifyCode(options: {
        userId?: number;
        email?: string;
        code: string;
        type: VerificationType;
        tempToken?: string;
        twoFactorMethod?: string;
    }): Promise<{success: boolean, user?: any, token?: string}> {
        this.logger.debug('[VerificationService] Verifying code', { 
            userId: options.userId,
            email: options.email,
            type: options.type
        });
        
        if (options.type === '2fa') {
            if (!options.tempToken) {
                throw new BadRequestError('Temporary token is required for 2FA verification');
            }
            
            const twoFactorMethod = options.twoFactorMethod || TWO_FACTOR_METHODS.EMAIL;
            this.logger.debug('[VerificationService] Verifying 2FA with method', { 
                method: twoFactorMethod
            });
            
            const result = await this.authService.verify2FA(
                options.tempToken, 
                options.code,
                twoFactorMethod
            );
            
            return {
                success: true,
                user: result.userData,
                token: result.accessToken
            };
        }
        
        if (!options.email && !options.userId) {
            throw new BadRequestError('Either email or userId is required');
        }
        
        const verificationCode = await this.prisma.authVerificationCode.findFirst({
            where: { email: options.email }
        });
        
        if (!verificationCode) {
            throw new BadRequestError('Verification code not found');
        }
        
        if (verificationCode.code !== options.code) {
            throw new BadRequestError('Invalid verification code');
        }
        
        if (verificationCode.expiresAt < new Date()) {
            throw new BadRequestError('Verification code expired');
        }
        
        const user = await this.prisma.authUser.findUnique({
            where: options.email 
                ? { email: options.email } 
                : { id: options.userId }
        });
        
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        switch (options.type) {
            case 'registration':
                await this.prisma.authUser.update({
                    where: { id: user.id },
                    data: { isEmailVerified: true }
                });
                break;
                
            case 'email-change':
                if (options.email && options.email !== user.email) {
                    await this.prisma.authUser.update({
                        where: { id: user.id },
                        data: { 
                            email: options.email,
                            isEmailVerified: true 
                        }
                    });
                }
                break;
        }
        
        await this.prisma.authVerificationCode.delete({
            where: { id: verificationCode.id }
        });
        
        return { success: true, user };
    }

    /**
     * Verify token from link
     */
    async verifyToken(options: {
        token: string;
        type: VerificationType;
    }): Promise<{success: boolean, user?: any}> {
        this.logger.debug('[VerificationService] Verifying token', { type: options.type });
        
        if (!options.token) {
            throw new BadRequestError('Token is required');
        }
        
        const hashedToken = crypto.createHash('sha256').update(options.token).digest('hex');
        
        let verification;
        let user;
        
        switch (options.type) {
            case 'registration':
            case 'email-change':
                verification = await this.prisma.authEmailVerification.findFirst({
                    where: { token: hashedToken }
                });
                
                if (verification) {
                    user = await this.prisma.authUser.findUnique({
                        where: { id: verification.userId }
                    });
                }
                break;
                
            case 'password-reset':
                verification = await this.prisma.authPasswordReset.findFirst({
                    where: { token: hashedToken }
                });
                
                if (verification) {
                    user = await this.prisma.authUser.findUnique({
                        where: { id: verification.userId }
                    });
                }
                break;
                
            default:
                throw new BadRequestError(`Unsupported verification type: ${options.type}`);
        }
        
        if (!verification) {
            throw new BadRequestError('Invalid or expired token');
        }
        
        if (verification.expiresAt < new Date()) {
            throw new BadRequestError('Token has expired');
        }
        
        switch (options.type) {
            case 'registration':
            case 'email-change':
                await this.prisma.authUser.update({
                    where: { id: user.id },
                    data: { isEmailVerified: true }
                });
                
                await this.prisma.authEmailVerification.delete({
                    where: { id: verification.id }
                });
                break;
                
            case 'password-reset':
                // Don't delete password reset token yet
                break;
        }
        
        return { success: true, user };
    }

    /**
     * Reset password with token
     */
    async resetPassword(token: string, newPassword: string): Promise<{success: boolean, message: string}> {
        this.logger.debug('[VerificationService] Resetting password with token');
        
        if (!token || !newPassword) {
            throw new BadRequestError('Token and new password are required');
        }
        
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        const passwordReset = await this.prisma.authPasswordReset.findFirst({
            where: { token: hashedToken }
        });
        
        if (!passwordReset) {
            throw new BadRequestError('Invalid or expired token');
        }
        
        if (passwordReset.expiresAt < new Date()) {
            throw new BadRequestError('Token has expired');
        }
        
        this.logger.debug('[VerificationService] Starting password hashing', { userId: passwordReset.userId });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        this.logger.debug('[VerificationService] Updating user password in database', { userId: passwordReset.userId });
        await this.prisma.authUser.update({
            where: { id: passwordReset.userId },
            data: { 
                password: hashedPassword,
                isEmailVerified: true 
             }
        });
        
        this.logger.debug('[VerificationService] Deleting used password reset token', { 
            userId: passwordReset.userId,
            tokenId: passwordReset.id 
        });
        await this.prisma.authPasswordReset.delete({
            where: { id: passwordReset.id }
        });
        
        return { success: true, message: 'Password reset successfully' };
    }
}