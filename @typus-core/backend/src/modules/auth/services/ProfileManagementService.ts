import { inject } from 'tsyringe';
import { BaseService } from '../../../core/base/BaseService.js';
import { Service } from '../../../core/decorators/component.js';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { TokenService } from './TokenService';
import { AuthHelperService } from './AuthHelperService';
import { BadRequestError, NotFoundError } from '../../../core/base/BaseError.js';
import { UserRole } from '../../../constants/index.js';
import { FileSystemService } from '../../storage/services/FileSystemService.js';


@Service()
export class ProfileManagementService extends BaseService {
    private googleClient: OAuth2Client;

    constructor(
        @inject(TokenService) private tokenService: TokenService,
        @inject(AuthHelperService) private authHelperService: AuthHelperService,
        @inject(FileSystemService) private fileSystemService: FileSystemService
    ) {
        super();
        this.googleClient = new OAuth2Client(global.env.GOOGLE_CLIENT_ID);
        this.logger.info('[ProfileManagementService] Initialized');
    }

    /**
     * Get user profile
     */
    // Get user profile and abilityRules
    async getProfile(userId: number): Promise<{ user: any, abilityRules: any[] }> {
        this.logger.debug('[ProfileManagementService] Retrieving user profile', { userId });

        const user = await this.prisma.authUser.findUnique({
            where: { id: userId }
        });

        if (!user) {
            this.logger.warn('[ProfileManagementService] Get profile failed - User not found', { userId });
            throw new NotFoundError('User not found');
        }

        this.logger.debug('[ProfileManagementService] User profile retrieved successfully', user);

        // Get abilityRules by user.role
        let abilityRules: any[] = [];
        if (user.role) {
            const roleData = await this.prisma.authRole.findUnique({
                where: { name: user.role },
                select: { abilityRules: true }
            });
            abilityRules = roleData?.abilityRules ?? [];
            // Parse if stored as string
            if (typeof abilityRules === 'string') {
                try {
                    abilityRules = JSON.parse(abilityRules);
                } catch (e) {
                    this.logger.warn('[ProfileManagementService] Failed to parse abilityRules JSON', { error: e.message });
                    abilityRules = [];
                }
            }
        }

        this.logger.debug('[ProfileManagementService] Ability rules after normalization', { userId: user.id, abilityRules });

        return {
            user: await this.authHelperService.sanitizeUser(user),
            abilityRules
        };
    }

    /**
     * Download and save Google avatar locally
     */
    private async downloadAndSaveGoogleAvatar(googleAvatarUrl: string, userId: number): Promise<string | null> {
        try {
            this.logger.debug('[ProfileManagementService] Downloading Google avatar', { 
                userId, 
                googleAvatarUrl: googleAvatarUrl.substring(0, 50) + '...' 
            });

            // Download avatar from Google
            const response = await fetch(googleAvatarUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch avatar: ${response.status} ${response.statusText}`);
            }

            const buffer = await response.arrayBuffer();
            
            // Create file object for FileSystemService
            const avatarFile = {
                fieldname: 'avatar',
                originalname: `google_avatar_${userId}.jpg`,
                encoding: '7bit',
                mimetype: 'image/jpeg',
                buffer: Buffer.from(buffer),
                size: buffer.byteLength
            };

            // Save using FileSystemService
            const localAvatarPath = await this.fileSystemService.saveFile(avatarFile, {
                originalName: avatarFile.originalname,
                size: avatarFile.size,
                mimeType: avatarFile.mimetype,
                userId: userId
            });

            this.logger.info('[ProfileManagementService] Google avatar saved locally', { 
                userId, 
                localPath: localAvatarPath 
            });

            return localAvatarPath;
        } catch (error) {
            this.logger.warn('[ProfileManagementService] Failed to download Google avatar', { 
                userId, 
                error: error.message 
            });
            return null;
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: number, profileData: any): Promise<any> {
        this.logger.debug('[ProfileManagementService] Processing profile update request', { userId, profileData });

        // Check if user exists
        this.logger.debug('[ProfileManagementService] Looking up user', { userId });
        const user = await this.prisma.authUser.findUnique({
            where: { id: userId }
        });

        if (!user) {
            this.logger.warn('[ProfileManagementService] Profile update failed - User not found', { userId });
            throw new NotFoundError('User not found');
        }

        // Create a copy of profile data to avoid modifying the original
        const updatedData = { ...profileData };

        // Check if password is being updated
        if (updatedData.password !== undefined) {
            // Don't update password if it's empty or only whitespace
            if (!updatedData.password || updatedData.password.trim() === '') {
                this.logger.debug('[ProfileManagementService] Password field is empty, removing from update data', { userId });
                delete updatedData.password;
            } else {
                // Hash password before storing
                this.logger.debug('[ProfileManagementService] Hashing password for update', { userId });
                updatedData.password = await bcrypt.hash(updatedData.password, 10);
            }
        }

        // Update user
        this.logger.debug('[ProfileManagementService] Updating user profile in database', { userId });
        // Ensure avatarUrl is passed directly if present in updatedData
        const dataToUpdate = { ...updatedData };
        // Check if avatarUrl is an object and extract the URL string
        if (dataToUpdate.avatarUrl && typeof dataToUpdate.avatarUrl === 'object' && dataToUpdate.avatarUrl.data) {
             // Extract the string URL from the object
             dataToUpdate.avatarUrl = dataToUpdate.avatarUrl.data;
        }

        const updatedUser = await this.prisma.authUser.update({
            where: { id: userId },
            data: dataToUpdate // Pass the corrected data object
        });

        this.logger.info('[ProfileManagementService] User profile updated successfully', { userId });
        return this.authHelperService.sanitizeUser(updatedUser); // Return sanitized user
    }

     /**
     * Google OAuth login
     */
    async googleLogin(token: string): Promise<{ user: any; accessToken: string; refreshToken: string; abilityRules?: any[] }> {
        this.logger.debug('[ProfileManagementService] Processing Google OAuth login request');

        // Verify Google token
        this.logger.debug('[ProfileManagementService] Verifying Google token');
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: token,
                audience: global.env.GOOGLE_CLIENT_ID
            });

            const payload = ticket.getPayload();
            if (!payload || !payload.email) {
                this.logger.warn('[ProfileManagementService] Google login failed - Invalid token payload');
                throw new BadRequestError('Invalid Google token');
            }

            this.logger.debug('[ProfileManagementService] Google token verified successfully', { email: payload.email });

            // Check if user exists
            this.logger.debug('[ProfileManagementService] Looking up user by email', { email: payload.email });
            let user = await this.prisma.authUser.findUnique({
                where: { email: payload.email }
            });

            if (!user) {
                // Create new user
                this.logger.info('[ProfileManagementService] Creating new user from Google account', { email: payload.email });
                user = await this.prisma.authUser.create({
                    data: {
                        email: payload.email,
                        userName: payload.name || '',
                        firstName: payload.given_name || '',
                        lastName: payload.family_name || '',
                        isEmailVerified: true, // Assume verified via Google
                        password: '', // Empty password for OAuth users
                        googleId: payload.sub,
                        avatarUrl: payload.picture || null, // Add avatar URL from Google profile
                        role: UserRole.USER, 
                    }
                });
                this.logger.info('[ProfileManagementService] New user created from Google account', { userId: user.id, email: user.email, role: user.role });
            } else {
                // Update Google ID and avatar if needed
                const updateData: any = {};
                
                if (!user.googleId) {
                    updateData.googleId = payload.sub;
                }
                
                // Update avatar if user doesn't have one but Google provides it
                if (!user.avatarUrl && payload.picture) {
                    // Try to download and save Google avatar locally
                    const localAvatarPath = await this.downloadAndSaveGoogleAvatar(payload.picture, user.id);
                    updateData.avatarUrl = localAvatarPath || payload.picture; // Fallback to Google URL if download fails
                }
                
                // Update first/last name if not set
                if (!user.firstName && payload.given_name) {
                    updateData.firstName = payload.given_name;
                }
                
                if (!user.lastName && payload.family_name) {
                    updateData.lastName = payload.family_name;
                }
                
                // Only update if there are changes to make
                if (Object.keys(updateData).length > 0) {
                    this.logger.debug('[ProfileManagementService] Updating user data from Google profile', { 
                        userId: user.id,
                        updatedFields: Object.keys(updateData)
                    });
                    user = await this.prisma.authUser.update({
                        where: { id: user.id },
                        data: updateData
                    });
                }
            }

            // Generate tokens using TokenService
            this.logger.debug('[ProfileManagementService] Generating authentication tokens via TokenService', { userId: user.id });
            const tokens = await this.tokenService.generateTokens({
                id: user.id,
                email: user.email,
                roles: user.role ? [user.role] : []
            });

            // Update last login
            this.logger.debug('[ProfileManagementService] Updating last login timestamp', { userId: user.id });
            await this.prisma.authUser.update({
                where: { id: user.id },
                data: { lastLogin: new Date() }
            });

            // Fetch ability rules based on user role - similar to AuthenticationService.login()
            this.logger.debug('[ProfileManagementService] Fetching ability rules for user role', { userId: user.id, role: user.role });
            
            let abilityRules = null;
            if (user.role) {
                const roleData = await this.prisma.authRole.findFirst({
                    where: { name: user.role },
                    select: { abilityRules: true }
                });
                abilityRules = roleData?.abilityRules ?? null;

                this.logger.info('[ProfileManagementService] Raw abilityRules from DB', { abilityRules });

                if (typeof abilityRules === 'string') {
                    try {
                        abilityRules = JSON.parse(abilityRules);
                    } catch (e) {
                        this.logger.warn('[ProfileManagementService] Failed to parse abilityRules JSON', { error: e.message });
                        abilityRules = [];
                    }
                } else if (abilityRules === true || abilityRules === null) {
                    abilityRules = [];
                }
            }

            this.logger.debug('[ProfileManagementService] Ability rules after normalization', { userId: user.id, abilityRules });
            this.logger.info('[ProfileManagementService] Google login completed successfully', { userId: user.id });
            
            return {
                user: this.authHelperService.sanitizeUser(user), // Use helper service
                abilityRules: abilityRules, // Include ability rules in the response
                ...tokens
            };
        } catch (error) {
            this.logger.error('[ProfileManagementService] Google login failed', { error: error.message, stack: error.stack });

            if (error instanceof Error) {
                throw new BadRequestError(`Google login failed: ${error.message}`, { error: error.message });
              } else {
                throw new BadRequestError('Google login failed: Unknown error');
              }
        }
    }
}
