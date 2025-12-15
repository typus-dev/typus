import { inject, injectable } from 'tsyringe';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { BaseService } from '../../../core/base/BaseService.js';
import { Service } from '../../../core/decorators/component.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../../core/base/BaseError.js';


@Service()
export class TokenService extends BaseService {
    private jwtSecret: string;
    private jwtExpiry: string | number;
    private refreshTokenExpiry: string | number;

    constructor() {
        super();
        this.jwtSecret = global.env.JWT_SECRET;
        this.jwtExpiry = global.env.JWT_EXPIRE || '1h';
        this.refreshTokenExpiry = global.env.REFRESH_TOKEN_EXPIRE || '7d';
        this.logger.info('[TokenService] Initialized with configuration', {
            jwtExpiry: this.jwtExpiry,
            refreshTokenExpiry: this.refreshTokenExpiry
        });
    }

    /**
     * Generate JWT tokens with guaranteed uniqueness
     * @param user - The user object
     * @returns Access and Refresh tokens
     */
    async generateTokens(user: { id: number; email: string; roles?: string[] }): Promise<{ accessToken: string; refreshToken: string }> {
        this.logger.debug('[TokenService] Starting token generation process', { userId: user.id });

        // Function to generate a unique refresh token
        const generateUniqueRefreshToken = async (): Promise<string> => {
            this.logger.debug('[TokenService] Generating unique refresh token', { userId: user.id });

            const randomBytes = crypto.randomBytes(32).toString('hex');
            const timestamp = Date.now();

            const refreshTokenPayload = {
                id: user.id,
                jti: `${randomBytes}_${timestamp}`,
                rand: Math.random()
            };
            const refreshToken = jwt.sign(
                refreshTokenPayload,
                this.jwtSecret,
                { expiresIn: this.refreshTokenExpiry } as SignOptions
            );

            // Check if the token already exists in the database
            this.logger.debug('[TokenService] Checking if refresh token already exists', { userId: user.id });
            const existingToken = await this.prisma.authRefreshToken.findFirst({
                where: { token: refreshToken }
            });

            // If it exists, generate a new one
            if (existingToken) {
                this.logger.debug('[TokenService] Token collision detected, regenerating token', { userId: user.id });
                return generateUniqueRefreshToken();
            }

            return refreshToken;
        };

        // Generate access token
        this.logger.debug('[TokenService] Generating access token', { userId: user.id });
        const beforeSign = Date.now();
        this.logger.debug(`[TokenService] Signing access token with expiry: ${this.jwtExpiry}`, { userId: user.id });
        const accessTokenPayload = {
            id: user.id,
            email: user.email,
            roles: user.roles || [],
            jti: crypto.randomBytes(16).toString('hex')
        };
        const accessToken = jwt.sign(
            accessTokenPayload,
            this.jwtSecret,
            { expiresIn: this.jwtExpiry } as SignOptions
        );
        const afterSign = Date.now();
        this.logger.debug(`[TokenService] Access token generated in ${afterSign - beforeSign}ms`, { userId: user.id });

        // Log decoded token payload on backend for verification
        try {
            const decodedPayload = jwt.decode(accessToken);
            this.logger.debug('[TokenService] Decoded Access Token Payload:', { userId: user.id, payload: decodedPayload });
            if (typeof decodedPayload === 'object' && decodedPayload !== null && typeof decodedPayload.iat === 'number' && typeof decodedPayload.exp === 'number') {
                this.logger.debug(`[TokenService] Token Timestamps (Backend): iat=${new Date(decodedPayload.iat * 1000).toISOString()}, exp=${new Date(decodedPayload.exp * 1000).toISOString()}`, { userId: user.id });
                this.logger.debug(`[TokenService] Current Backend Time: ${new Date(afterSign).toISOString()}`, { userId: user.id });
            }
        } catch (decodeError) {
            this.logger.error('[TokenService] Failed to decode generated access token for logging', { userId: user.id, error: decodeError });
        }

        // Generate refresh token
        const refreshToken = await generateUniqueRefreshToken();

        // Generate a UUID for the refresh token ID
        const refreshTokenId = crypto.randomUUID();

        // Create refresh token in database
        this.logger.debug('[TokenService] Storing refresh token in database', { userId: user.id });
        await this.prisma.authRefreshToken.create({
            data: {
                id: refreshTokenId,
                userId: user.id,
                token: refreshToken,
                accessTokenJti: accessTokenPayload.jti,
                expiresAt: this.calculateExpiryDate(this.refreshTokenExpiry),
                updatedAt: new Date()
            }
        });

        this.logger.info('[TokenService] Tokens generated successfully', { userId: user.id });
        return { accessToken, refreshToken };
    }

    /**
     * Verify JWT token
     * @param token - The JWT token string
     * @returns Object indicating validity and decoded payload
     */
    async verifyToken(token: string): Promise<{ valid: boolean; decoded?: any }> {
        this.logger.debug('[TokenService] Verifying JWT token');

        try {
            this.logger.debug('[TokenService] Attempting to verify token');
            const decoded = jwt.verify(token, this.jwtSecret);
            // Check if decoded is an object and has id property
            if (typeof decoded === 'object' && decoded !== null && 'id' in decoded) {
                this.logger.debug('[TokenService] Token verified successfully', { userId: decoded.id });
                return { valid: true, decoded };
            } else {
                this.logger.warn('[TokenService] Token verification failed - Invalid payload structure');
                return { valid: false };
            }
        } catch (error) {
            this.logger.warn('[TokenService] Token verification failed', { error: error.message });
            return { valid: false };
        }
    }

    /**
     * Refresh access token using refresh token
     * @param refreshToken - The refresh token string
     * @returns New access and refresh tokens
     */
    async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        this.logger.debug('[TokenService] Processing token refresh request');

        // Log incoming refresh token
        this.logger.info('[TokenService] Incoming refresh token:', { refreshToken });

        // Check if refresh token is provided
        if (!refreshToken) {
            this.logger.warn('[TokenService] Token refresh failed - Refresh token not provided');
            throw new BadRequestError('Refresh token is required');
        }

        // Check if refresh token exists
        this.logger.debug('[TokenService] Validating refresh token');
        const tokenRecord = await this.prisma.authRefreshToken.findFirst({
            where: { token: refreshToken }
        });

        // Log token record from DB
        this.logger.info('[TokenService] DB token record:', { tokenRecord });

        if (!tokenRecord) {
            this.logger.warn('[TokenService] Token refresh failed - Invalid refresh token');
            this.logger.error('[TokenService] Invalid refresh token: not found in DB', { refreshToken });
            throw new UnauthorizedError('Invalid refresh token');
        }

        // Check if token has expired
        this.logger.debug('[TokenService] Checking if token has expired', { tokenId: tokenRecord.id, userId: tokenRecord.userId });
        if (new Date() > tokenRecord.expiresAt) {
            // Remove expired token
            this.logger.debug('[TokenService] Removing expired token', { tokenId: tokenRecord.id, userId: tokenRecord.userId });
            await this.prisma.authRefreshToken.delete({
                where: { id: tokenRecord.id }
            });

            this.logger.warn('[TokenService] Token refresh failed - Refresh token expired', { userId: tokenRecord.userId });
            this.logger.error('[TokenService] Invalid refresh token: expired', { refreshToken, expiresAt: tokenRecord.expiresAt });
            throw new UnauthorizedError('Refresh token has expired');
        }

        // Find user
        const user = await this.prisma.authUser.findUnique({
            where: { id: tokenRecord.userId },
            select: {
                id: true,
                email: true,
                role: true
            }
        });

        if (!user) {
            this.logger.warn('[TokenService] Token refresh failed - User not found', { userId: tokenRecord.userId });
            this.logger.error('[TokenService] Invalid refresh token: user not found', { refreshToken, userId: tokenRecord.userId });
            throw new NotFoundError('User not found');
        }

        // Delete used refresh token
        this.logger.debug('[TokenService] Deleting used refresh token', { tokenId: tokenRecord.id, userId: user.id });
        await this.prisma.authRefreshToken.delete({
            where: { id: tokenRecord.id }
        });

        // Generate new tokens
        this.logger.debug('[TokenService] Generating new tokens', { userId: user.id });
        const tokens = await this.generateTokens({
            id: user.id,
            email: user.email,
            roles: user.role ? [user.role] : []
        });

        this.logger.info('[TokenService] Token refreshed successfully', { userId: user.id });
        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        };
    }

    /**
     * Invalidate all refresh tokens for a user
     * @param userId - The ID of the user
     */
    async invalidateRefreshTokens(userId: number): Promise<void> {
        this.logger.debug('[TokenService] Deleting refresh tokens', { userId });
        await this.prisma.authRefreshToken.deleteMany({
            where: { userId }
        });
        this.logger.info('[TokenService] Refresh tokens invalidated successfully', { userId });
    }

    /**
     * Calculates expiry date based on a string (e.g., '1h', '7d') or a number of seconds.
     * @param expiryValue - The expiry duration string or number of seconds.
     * @returns The calculated expiry date.
     */
    private calculateExpiryDate(expiryValue: string | number): Date {
        const now = new Date();

        // 1. Check if it's already a number (seconds)
        if (typeof expiryValue === 'number') {
            if (!isNaN(expiryValue)) {
                this.logger.debug(`[TokenService] Calculating expiry from number of seconds: ${expiryValue}`);
                return new Date(now.getTime() + expiryValue * 1000);
            }
        }

        // 2. If it's a string, try to process it
        if (typeof expiryValue === 'string') {
            // 2a. Check if it's a string containing only a number (seconds)
            const asNumber = parseInt(expiryValue, 10);
            if (!isNaN(asNumber) && asNumber.toString() === expiryValue) {
                this.logger.debug(`[TokenService] Calculating expiry from numeric string (seconds): ${expiryValue}`);
                return new Date(now.getTime() + asNumber * 1000);
            }

            // 2b. Check "number + letter" format (e.g., "7d")
            const unit = expiryValue.slice(-1).toLowerCase();
            const value = parseInt(expiryValue.slice(0, -1), 10);

            if (!isNaN(value)) {
                let multiplier = 1000; // ms
                switch (unit) {
                    case 's': multiplier = 1000; break;
                    case 'm': multiplier = 60 * 1000; break;
                    case 'h': multiplier = 60 * 60 * 1000; break;
                    case 'd': multiplier = 24 * 60 * 60 * 1000; break;
                    default:
                        this.logger.warn(`[TokenService] Unknown time unit '${unit}' in expiry string. Defaulting to 1 hour.`);
                        return new Date(now.getTime() + 60 * 60 * 1000);
                }
                this.logger.debug(`[TokenService] Calculating expiry from string with unit: ${expiryValue}`);
                return new Date(now.getTime() + value * multiplier);
            }
        }

        // 3. If nothing matched, return default value
        this.logger.warn(`[TokenService] Invalid or unsupported expiry format: '${expiryValue}'. Defaulting to 1 hour.`);
        return new Date(now.getTime() + 60 * 60 * 1000);
    }
}