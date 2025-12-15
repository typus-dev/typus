import { inject } from 'tsyringe';
import { BaseService } from '../../../core/base/BaseService.js';
import { Service } from '../../../core/decorators/component.js';
import { Request } from 'express';
import { Prisma } from '@prisma/client'; // Import Prisma namespace


// Define the structure for logAuthAttempt data
interface LogAuthAttemptData {
    email?: string;
    user_id?: number;
    user_name?: string;
    google_id?: string | null; // Allow null for google_id
    login?: string | null; // Allow null
    password?: string | null; // Allow null
    result: 'success' | 'failed';
    token?: string;
}

@Service()
export class AuthHelperService extends BaseService {

    constructor() {
        super();
        this.logger.info('[AuthHelperService] Initialized');
    }

    /**
     * Remove sensitive data from user object
     */
    async sanitizeUser(user) {
        if (!user) return {};
        
        const { password, ...sanitizedUser } = user;
        return sanitizedUser;
    }

    /**
     * Log authentication attempt
     */
    async logAuthAttempt(req: Request, data: LogAuthAttemptData): Promise<void> {
        this.logger.debug('[AuthHelperService] Starting to log authentication attempt', {
            email: data.email,
            userId: data.user_id,
            result: data.result
        });

        const clientInfo = this.getClientInfo(req);
        this.logger.debug('[AuthHelperService] Collected client information', {
            ip: clientInfo.ip,
            userAgent: clientInfo.user_agent
        });

        try {
            const now = new Date();
            this.logger.debug('[AuthHelperService] Creating auth history record in database');

            await this.prisma.authHistory.create({
                data: {
                    login: data.login || null,
                    email: data.email || null,
                    password: data.password || null, // Consider not logging password hashes
                     deviceData: clientInfo as any, // Cast clientInfo
                    ispData: JSON.stringify({
                        clientIp: req.ip, // req.ip might be less reliable behind proxies
                        timestamp: new Date().toISOString()
                    }),
                    result: data.result,
                    userId: data.user_id || null,
                    userName: data.user_name || null,
                    googleId: data.google_id || null,
                    token: data.token || '', // Ensure token is always a string
                    attemptTime: now,
                    createdAt: now,
                    updatedAt: now
                }
            });

            this.logger.debug('[AuthHelperService] Auth history record created successfully', {
                email: data.email,
                userId: data.user_id,
                result: data.result,
                timestamp: now
            });
        } catch (error) {
            this.logger.error('[AuthHelperService] Failed to log auth attempt', {
                error: error.message,
                stack: error.stack,
                data: {
                    email: data.email,
                    userId: data.user_id,
                    result: data.result
                }
            });
            // Decide if this error should propagate or just be logged
        }
    }

    /**
     * Get client information from request
     */
    private getClientInfo(req: Request): { user_agent?: string; ip: string; referer?: string | string[]; timestamp: string } { // Fix referer type
        this.logger.debug('[AuthHelperService] Extracting client information from request');

        const forwardedFor = req.headers['x-forwarded-for'];
        const realIp = req.headers['x-real-ip'];
        const socketRemoteAddress = req.socket?.remoteAddress; // Use optional chaining

        // Determine client IP, prioritizing headers
        let clientIp: string | undefined;
        if (forwardedFor) {
            // Handle potential array or string for x-forwarded-for
            const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
            clientIp = forwardedIp.split(',')[0].trim();
        } else if (realIp) {
             // Handle potential array or string for x-real-ip
            clientIp = Array.isArray(realIp) ? realIp[0].trim() : realIp.trim();
        } else {
            clientIp = socketRemoteAddress;
        }


        this.logger.debug('[AuthHelperService] Determined client IP address', {
            forwardedFor: forwardedFor ? 'present' : 'not present',
            realIp: realIp ? 'present' : 'not present',
            socketRemoteAddress: socketRemoteAddress || 'not available',
            resultingIp: clientIp
        });

        const clientInfo = {
            user_agent: req.headers['user-agent'],
            ip: clientIp || 'unknown', // Provide a default if IP couldn't be determined
            referer: req.headers['referer'] || req.headers['referrer'],
            timestamp: new Date().toISOString()
        };

        this.logger.debug('[AuthHelperService] Client information collected successfully');
        return clientInfo;
    }
}
