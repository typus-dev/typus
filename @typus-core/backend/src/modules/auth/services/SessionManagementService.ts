import { inject, injectable } from 'tsyringe';
import { BaseService } from '../../../core/base/BaseService.js';
import { Service } from '../../../core/decorators/component.js';
import { TokenService } from './TokenService.js';
import { AuthHelperService } from './AuthHelperService.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../../core/base/BaseError.js';

interface SessionInfo {
    id: string;
    userId: number;
    user: {
        id: number;
        email: string;
        userName: string | null;
    };
    createdAt: Date;
    expiresAt: Date;
    ip: string;
    device: string;
    location: string;
    lastActivity: Date;
    isCurrentSession: boolean;
}

@Service()
export class SessionManagementService extends BaseService {
    constructor(
        @inject(TokenService) private tokenService: TokenService,
        @inject(AuthHelperService) private authHelper: AuthHelperService
    ) {
        super();
        this.logger.info('[SessionManagementService] Initialized');
    }

    /**
     * Get active sessions for user(s)
     */
    async getActiveSessions(userId?: number): Promise<SessionInfo[]> {
        this.logger.debug('[SessionManagementService] Getting active sessions', { userId });

        try {
            const query = {
                where: {
                    expiresAt: { gt: new Date() }, // Only non-expired tokens
                    ...(userId && { userId })
                },
                include: {
                    // We need to manually join with user data since there's no relation defined
                },
                orderBy: { createdAt: 'desc' as const }
            };

            const refreshTokens = await this.prisma.authRefreshToken.findMany(query);
            
            // Get user data and enrich with AuthHistory metadata
            const sessions = await Promise.all(
                refreshTokens.map(async (token) => {
                    // Get user data
                    const user = await this.prisma.authUser.findUnique({
                        where: { id: token.userId },
                        select: { id: true, email: true, userName: true }
                    });

                    if (!user) {
                        this.logger.warn('[SessionManagementService] User not found for token', { 
                            tokenId: token.id, 
                            userId: token.userId 
                        });
                        return null;
                    }

                    // Find the most recent successful auth record for this user
                    const lastActivity = await this.prisma.authHistory.findFirst({
                        where: {
                            userId: token.userId,
                            result: 'success'
                        },
                        orderBy: { attemptTime: 'desc' }
                    });

                    return {
                        id: token.id,
                        userId: token.userId,
                        user,
                        createdAt: token.createdAt,
                        expiresAt: token.expiresAt,
                        // Extract metadata from AuthHistory
                        ip: this.extractIp(lastActivity?.deviceData, lastActivity?.ispData),
                        device: this.extractDevice(lastActivity?.deviceData?.user_agent),
                        location: this.extractLocation(lastActivity?.ispData),
                        lastActivity: lastActivity?.attemptTime || token.createdAt,
                        isCurrentSession: false // Will be determined on frontend
                    };
                })
            );

            // Filter out null sessions (where user was not found)
            const validSessions = sessions.filter(session => session !== null) as SessionInfo[];

            this.logger.info('[SessionManagementService] Active sessions retrieved', { 
                count: validSessions.length,
                userId 
            });

            return validSessions;
        } catch (error) {
            this.logger.error('[SessionManagementService] Failed to get active sessions', {
                error: error.message,
                stack: error.stack,
                userId
            });
            throw error;
        }
    }

    /**
     * Terminate a specific session
     */
    async terminateSession(sessionId: string, requestingUserId: number): Promise<void> {
        this.logger.debug('[SessionManagementService] Terminating session', { 
            sessionId, 
            requestingUserId 
        });

        try {
            const session = await this.prisma.authRefreshToken.findUnique({
                where: { id: sessionId }
            });

            if (!session) {
                this.logger.warn('[SessionManagementService] Session not found', { sessionId });
                throw new NotFoundError('Session not found');
            }

            // Check permissions
            const isAdmin = await this.isAdmin(requestingUserId);
            if (!isAdmin && session.userId !== requestingUserId) {
                this.logger.warn('[SessionManagementService] Unauthorized session termination attempt', {
                    sessionId,
                    sessionUserId: session.userId,
                    requestingUserId
                });
                throw new UnauthorizedError('Cannot terminate other user sessions');
            }

            // Delete the refresh token (this terminates the session)
            await this.prisma.authRefreshToken.delete({
                where: { id: sessionId }
            });

            // Log the action
            await this.logSessionAction('session_terminated', session.userId, requestingUserId, {
                sessionId,
                targetUserId: session.userId
            });

            this.logger.info('[SessionManagementService] Session terminated successfully', {
                sessionId,
                sessionUserId: session.userId,
                requestingUserId
            });
        } catch (error) {
            this.logger.error('[SessionManagementService] Failed to terminate session', {
                error: error.message,
                stack: error.stack,
                sessionId,
                requestingUserId
            });
            throw error;
        }
    }

    /**
     * Terminate all sessions for a user
     */
    async terminateUserSessions(
        userId: number, 
        exceptSessionId?: string, 
        requestingUserId?: number
    ): Promise<number> {
        this.logger.debug('[SessionManagementService] Terminating user sessions', {
            userId,
            exceptSessionId,
            requestingUserId
        });

        try {
            // Check permissions
            if (requestingUserId) {
                const isAdmin = await this.isAdmin(requestingUserId);
                if (!isAdmin && userId !== requestingUserId) {
                    this.logger.warn('[SessionManagementService] Unauthorized bulk session termination attempt', {
                        userId,
                        requestingUserId
                    });
                    throw new UnauthorizedError('Cannot terminate other user sessions');
                }
            }

            const whereClause = {
                userId,
                ...(exceptSessionId && { id: { not: exceptSessionId } })
            };

            // Count sessions before deletion
            const count = await this.prisma.authRefreshToken.count({ where: whereClause });

            // Delete sessions
            await this.prisma.authRefreshToken.deleteMany({ where: whereClause });

            // Log the action
            await this.logSessionAction('bulk_session_terminated', userId, requestingUserId, {
                count,
                exceptSessionId
            });

            this.logger.info('[SessionManagementService] User sessions terminated successfully', {
                userId,
                count,
                requestingUserId
            });

            return count;
        } catch (error) {
            this.logger.error('[SessionManagementService] Failed to terminate user sessions', {
                error: error.message,
                stack: error.stack,
                userId,
                requestingUserId
            });
            throw error;
        }
    }

    /**
     * Terminate all sessions globally (admin only)
     */
    async terminateAllSessions(adminUserId: number): Promise<number> {
        this.logger.debug('[SessionManagementService] Terminating all sessions globally', { adminUserId });

        try {
            // Check admin permissions
            if (!await this.isAdmin(adminUserId)) {
                this.logger.warn('[SessionManagementService] Unauthorized global session termination attempt', {
                    adminUserId
                });
                throw new UnauthorizedError('Admin access required');
            }

            // Count all sessions before deletion
            const count = await this.prisma.authRefreshToken.count();

            // Delete all sessions
            await this.prisma.authRefreshToken.deleteMany({});

            // Log the action
            await this.logSessionAction('global_session_terminated', null, adminUserId, { count });

            this.logger.info('[SessionManagementService] All sessions terminated globally', {
                count,
                adminUserId
            });

            return count;
        } catch (error) {
            this.logger.error('[SessionManagementService] Failed to terminate all sessions', {
                error: error.message,
                stack: error.stack,
                adminUserId
            });
            throw error;
        }
    }

    /**
     * Check if user is admin
     */
    private async isAdmin(userId: number): Promise<boolean> {
        try {
            const user = await this.prisma.authUser.findUnique({
                where: { id: userId },
                select: { isAdmin: true, role: true }
            });

            return user?.isAdmin === true || user?.role === 'admin';
        } catch (error) {
            this.logger.error('[SessionManagementService] Failed to check admin status', {
                error: error.message,
                userId
            });
            return false;
        }
    }

    /**
     * Log session management actions
     */
    private async logSessionAction(
        action: string, 
        targetUserId: number | null, 
        adminUserId?: number, 
        metadata?: any
    ): Promise<void> {
        try {
            await this.prisma.authHistory.create({
                data: {
                    login: null,
                    email: null,
                    password: null,
                    deviceData: {
                        action,
                        adminUserId,
                        targetUserId,
                        metadata,
                        timestamp: new Date().toISOString()
                    },
                    ispData: null,
                    result: 'success',
                    userId: targetUserId,
                    userName: null,
                    googleId: null,
                    token: '',
                    attemptTime: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            this.logger.error('[SessionManagementService] Failed to log session action', {
                error: error.message,
                action,
                targetUserId,
                adminUserId
            });
            // Don't throw - logging failure shouldn't break the main operation
        }
    }

    /**
     * Extract IP address from auth history data
     */
    private extractIp(deviceData: any, ispData: any): string {
        if (deviceData && typeof deviceData === 'object') {
            if (deviceData.ip) return deviceData.ip;
        }
        
        if (ispData && typeof ispData === 'object') {
            if (ispData.clientIp) return ispData.clientIp;
            if (ispData.ip) return ispData.ip;
        }

        return 'Unknown';
    }

    /**
     * Extract device information from user agent
     */
    private extractDevice(userAgent?: string): string {
        if (!userAgent || userAgent === 'Unknown') return 'Unknown';
        
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

    /**
     * Extract location from ISP data
     */
    private extractLocation(ispData: any): string {
        if (ispData && typeof ispData === 'object') {
            if (ispData.location) return ispData.location;
            if (ispData.city) return ispData.city;
            if (ispData.country) return ispData.country;
        }

        return 'Unknown';
    }
}
