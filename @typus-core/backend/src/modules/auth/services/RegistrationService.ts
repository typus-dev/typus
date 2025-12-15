import { inject } from 'tsyringe';
import { BaseService } from '../../../core/base/BaseService.js';
import { Service } from '../../../core/decorators/component.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { EmailService } from '../../email/services/EmailService.js';
import { BadRequestError, NotFoundError } from '../../../core/base/BaseError.js';
import { UserRole } from '../../../constants/index.js';

@Service()
export class RegistrationService extends BaseService {

    constructor(
        @inject(EmailService) private emailService: EmailService
    ) {
        super();
        this.logger.info('[RegistrationService] Initialized');
    }

    /**
     * Register a new user
     */
    async signUp(userData: any) {
        this.logger.debug('[RegistrationService] Starting user registration', { email: userData.email });

        const registrationType = userData.registrationType || 'regular';
        delete userData.registrationType;

        this.logger.debug('[RegistrationService] Checking if user already exists', { email: userData.email });
        const existingUser = await this.prisma.authUser.findUnique({
            where: { email: userData.email }
        });

        if (existingUser) {
            this.logger.warn('[RegistrationService] Registration failed - User already exists', { email: userData.email });
            throw new BadRequestError('User already exists', { email: userData.email });
        }

        this.logger.debug('[RegistrationService] Hashing password');
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        const {
            email,
            userName,
            firstName: originalFirstName,
            lastName: originalLastName,
            middleName,
            phoneNumber,
            fullName,
            ...restData
        } = userData;

        let processedFirstName = originalFirstName;
        let processedLastName = originalLastName;

        if (fullName) {
            this.logger.debug('[RegistrationService] Processing fullName', { fullName });
            const nameParts = fullName.trim().split(' ');

            if (nameParts.length > 1) {
                processedFirstName = nameParts[0];
                processedLastName = nameParts.slice(1).join(' ');
            } else {
                processedFirstName = fullName.trim();
            }
        }

        this.logger.debug('[RegistrationService] Creating new user in database', { email });
        const user = await this.prisma.authUser.create({
            data: {
                email,
                userName,
                firstName: processedFirstName,
                lastName: processedLastName,
                middleName,
                phoneNumber,
                password: hashedPassword,
                isEmailVerified: false,
                role: UserRole.USER, 
            }
        });
        this.logger.info('[RegistrationService] User created successfully', { userId: user.id, email: user.email });

        if (registrationType === 'simplified') {
            this.logger.debug('[RegistrationService] Using simplified registration with verification code', { userId: user.id });

            const code = crypto.randomInt(100000, 999999).toString();
            this.logger.debug('[RegistrationService] Verification code generated', { userId: user.id });

            this.logger.debug('[RegistrationService] Storing verification code in database', { userId: user.id });
            await this.prisma.authVerificationCode.create({
                data: {
                    email,
                    code,
                    expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
                }
            });

            try {
                this.logger.debug('[RegistrationService] Sending verification code email', { userId: user.id, email });
                await this.emailService.sendVerificationCodeEmail(
                    email,
                    code,
                    userName || processedFirstName || email.split('@')[0]
                );

                this.logger.info('[RegistrationService] Verification code sent successfully', { userId: user.id, email: user.email });
                return {
                    message: 'Registration successful! Please check your email for the verification code.',
                    email: email
                };
            } catch (error) {
                this.logger.error('[RegistrationService] Failed to send verification email', {
                    userId: user.id,
                    email: user.email,
                    error: error.message,
                    stack: error.stack
                });

                throw new BadRequestError('Registration completed but failed to send verification email. Please contact support.', { userId: user.id, email: user.email });
            }
        } else {
            this.logger.debug('[RegistrationService] Using regular registration with verification link', { userId: user.id });

            const verificationToken = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

            this.logger.debug('[RegistrationService] Storing verification token in database', { userId: user.id });
            await this.prisma.authEmailVerification.create({
                data: {
                    userId: user.id,
                    token: hashedToken,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
                }
            });

            try {
                this.logger.debug('[RegistrationService] Sending verification email', { userId: user.id, email });
                await this.emailService.sendVerificationEmail(
                    email,
                    verificationToken,
                    userName || processedFirstName || email.split('@')[0]
                );

                this.logger.info('[RegistrationService] User registration completed successfully', { userId: user.id, email: user.email });
                return {
                    message: 'Registration successful! Please check your email to verify your account.',
                    email: email
                };
            } catch (error) {
                this.logger.error('[RegistrationService] Failed to send verification email', {
                    userId: user.id,
                    email: user.email,
                    error: error.message,
                    stack: error.stack
                });

                throw new Error('Registration completed but failed to send verification email. Please contact support.');
            }
        }
    }

    /**
     * Send a registration verification code
     */
    async signUpSendCode(email: string) {
        this.logger.debug('[RegistrationService] Starting verification code generation', { email });

        const code = crypto.randomInt(100000, 999999).toString();
        this.logger.debug('[RegistrationService] Verification code generated', { email });

        this.logger.debug('[RegistrationService] Storing verification code in database', { email });
        await this.prisma.authVerificationCode.upsert({
            where: { email },
            update: { code, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
            create: { email, code, expiresAt: new Date(Date.now() + 15 * 60 * 1000) }
        });
        this.logger.debug('[RegistrationService] Verification code stored successfully', { email });

        this.logger.debug('[RegistrationService] Sending verification email', { email });
        await this.emailService.sendVerificationCodeEmail(email, code, email.split('@')[0]);
        this.logger.info('[RegistrationService] Verification email sent successfully', { email });

        return { message: 'Verification code sent' };
    }

    /**
     * Verify a registration code
     */
    async signUpVerifyCode(email: string, code: string) {
        this.logger.debug('[RegistrationService] Starting verification code validation', { email });

        this.logger.debug('[RegistrationService] Retrieving verification code from database', { email });
        const verificationCode = await this.prisma.authVerificationCode.findUnique({
            where: { email }
        });

        if (!verificationCode || verificationCode.code !== code) {
            this.logger.warn('[RegistrationService] Invalid verification code', { email });
            throw new BadRequestError('Invalid verification code');
        }

        if (verificationCode.expiresAt < new Date()) {
            this.logger.warn('[RegistrationService] Verification code expired', {
                email,
                expiresAt: verificationCode.expiresAt,
                currentTime: new Date()
            });
            throw new BadRequestError('Verification code expired');
        }

        this.logger.debug('[RegistrationService] Deleting used verification code', { email });
        await this.prisma.authVerificationCode.delete({
            where: { email }
        });

        this.logger.info('[RegistrationService] Verification code validated successfully', { email });
        return { verified: true };
    }

    /**
     * Verify email using verification code
     */
    async verifyEmailCode(email: string, code: string) {
        this.logger.debug('[RegistrationService] Starting email verification process using code', { email });

        if (!email || !code) {
            this.logger.warn('[RegistrationService] Email verification failed - Missing required fields', { email });
            throw new BadRequestError('Email and verification code are required');
        }

        this.logger.debug('[RegistrationService] Hashing verification code', { email });
        const hashedCode = code ? crypto.createHash('sha256').update(code).digest('hex') : null;

        if (!hashedCode) {
            this.logger.warn('[RegistrationService] Email verification failed - Invalid verification code', { email });
            throw new BadRequestError('Invalid verification code');
        }

        this.logger.debug('[RegistrationService] Looking up verification record', { email });
        const verification = await this.prisma.authEmailVerification.findFirst({
            where: {
                token: hashedCode
            }
        });

        if (!verification) {
            this.logger.warn('[RegistrationService] Email verification failed - Invalid or expired verification code', { email });
            throw new BadRequestError('Invalid or expired verification code');
        }

        if (new Date() > verification.expiresAt) {
            this.logger.warn('[RegistrationService] Email verification failed - Verification code expired', {
                email,
                userId: verification.userId,
                expiresAt: verification.expiresAt,
                currentTime: new Date()
            });
            throw new BadRequestError('Verification code has expired');
        }

        const user = await this.prisma.authUser.findUnique({
            where: { id: verification.userId }
        });

        if (!user) {
            throw new NotFoundError('User not found');
        }

        this.logger.debug('[RegistrationService] Marking user email as verified', { userId: verification.userId, email });
        await this.prisma.authUser.update({
            where: { id: verification.userId },
            data: { isEmailVerified: true }
        });

        this.logger.debug('[RegistrationService] Removing used verification code', { userId: verification.userId });
        await this.prisma.authEmailVerification.delete({
            where: { id: verification.id }
        });

        this.logger.info('[RegistrationService] Email verified successfully', { userId: verification.userId, email });
        return { message: 'Email verified successfully' };
    }

    /**
     * Verify email using verification token
     */
    async verifyEmailToken(token: string) {
        this.logger.debug('[RegistrationService] Starting email verification process using token');

        if (!token) {
            this.logger.warn('[RegistrationService] Email verification failed - Missing token');
            throw new BadRequestError('Verification token is required');
        }

        this.logger.debug('[RegistrationService] Hashing verification token');
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        this.logger.debug('[RegistrationService] Looking up verification record by token');
        const verification = await this.prisma.authEmailVerification.findFirst({
            where: {
                token: hashedToken
            }
        });

        if (!verification) {
            this.logger.warn('[RegistrationService] Email verification failed - Invalid or expired verification token');
            throw new BadRequestError('Invalid or expired verification token');
        }

        if (new Date() > verification.expiresAt) {
            this.logger.warn('[RegistrationService] Email verification failed - Verification token expired', {
                userId: verification.userId,
                expiresAt: verification.expiresAt,
                currentTime: new Date()
            });
            throw new BadRequestError('Verification token has expired');
        }

        const user = await this.prisma.authUser.findUnique({
            where: { id: verification.userId }
        });

        if (!user) {
            throw new NotFoundError('User not found');
        }

        this.logger.debug('[RegistrationService] Marking user email as verified', {
            userId: verification.userId,
            email: user.email
        });
        await this.prisma.authUser.update({
            where: { id: verification.userId },
            data: { isEmailVerified: true }
        });

        this.logger.debug('[RegistrationService] Removing used verification token', { userId: verification.userId });
        await this.prisma.authEmailVerification.delete({
            where: { id: verification.id }
        });

        this.logger.info('[RegistrationService] Email verified successfully', {
            userId: verification.userId,
            email: user.email
        });
        return { message: 'Email verified successfully' };
    }

    /**
     * Send a verification email
     */
    async sendVerificationEmail(email: string) {
        this.logger.debug('[RegistrationService] Processing verification email request', { email });

        this.logger.debug('[RegistrationService] Looking up user', { email });
        const user = await this.prisma.authUser.findUnique({
            where: { email }
        });

        if (!user) {
            this.logger.warn('[RegistrationService] Verification email failed - User not found', { email });
            throw new NotFoundError('User not found');
        }

        if (user.isEmailVerified) {
            this.logger.debug('[RegistrationService] Email already verified, skipping verification', { userId: user.id, email });
            return { message: 'Email already verified' };
        }

        this.logger.debug('[RegistrationService] Generating verification token', { userId: user.id });
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

        this.logger.debug('[RegistrationService] Storing verification token in database', { userId: user.id });

        const existingVerification = await this.prisma.authEmailVerification.findFirst({
            where: { userId: user.id }
        });

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        if (existingVerification) {
            this.logger.debug('[RegistrationService] Updating existing verification token', { userId: user.id });
            await this.prisma.authEmailVerification.update({
                where: { id: existingVerification.id },
                data: {
                    token: hashedToken,
                    expiresAt: expiresAt
                }
            });
        } else {
            this.logger.debug('[RegistrationService] Creating new verification token', { userId: user.id });
            await this.prisma.authEmailVerification.create({
                data: {
                    userId: user.id,
                    token: hashedToken,
                    expiresAt: expiresAt
                }
            });
        }

        this.logger.debug('[RegistrationService] Sending verification email', { userId: user.id, email });
        await this.emailService.sendVerificationCodeEmail(
            email,
            verificationToken,
            user.userName || email.split('@')[0]
        );

        this.logger.info('[RegistrationService] Verification email sent successfully', { userId: user.id, email });
        return { message: 'Verification email sent' };
    }
}