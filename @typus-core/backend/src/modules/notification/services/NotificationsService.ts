import { BaseService } from '@/core/base/BaseService.js';
import { Service } from '@/core/decorators/component.js';
import { BadRequestError, NotFoundError } from '@/core/base/BaseError.js';
import { inject } from 'tsyringe';
import { WebSocketService } from '@/core/websocket/WebSocketService.js';
import { RedisService } from '@/core/redis/RedisService.js';

@Service()
export class NotificationsService extends BaseService {
    constructor(
        @inject(WebSocketService) private wsService: WebSocketService,
        @inject(RedisService) private redisService: RedisService
    ) {
        super();
    }

    
    /**
     * Get all notifications for a user
     */
    async getNotifications(userId: number) {
        return await this.prisma.notificationsHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Mark a notification as read
     */
    async markAsRead(userId: number, notificationId: number) {
        const notification = await this.prisma.notificationsHistory.findUnique({
            where: { id: notificationId }
        });
        if (!notification || notification.userId !== userId) {
            throw new NotFoundError('Notification not found');
        }
        await this.prisma.notificationsHistory.update({
            where: { id: notificationId },
            data: { status: 'read' }
        });
    }

    /**
     * Get unread notifications count for a user
     */
    async getUnreadCount(userId: number) {
        return await this.prisma.notificationsHistory.count({
            where: { userId, status: 'unread' }
        });
    }

    /**
     * Send a new notification
     */
    async send(userId: number, type: string, data: Record<string, any>, channels: string[] = ['internal']) {
        let template = null;
        let text: string;
        let templateId: number | null = null;

        try {
            // Try to find template (table might be empty, that's ok)
            template = await this.prisma.notificationsTemplate.findUnique({
                where: { name: type },
                select: { id: true, body: true } // Only select needed fields to avoid schema issues
            });
        } catch (error) {
            // If template lookup fails (schema mismatch, etc), just use fallback
            this.logger.debug('[NotificationsService] Template lookup failed, using fallback', { type, error: error.message });
        }

        if (template) {
            text = this.compileTemplate(template.body, data);
            templateId = template.id;
        } else {
            // Fallback for simple notifications without template
            text = data.message || data.title || type;
            templateId = null;
        }

        const notification = await this.prisma.notificationsHistory.create({
            data: {
                userId,
                type,
                message: text,
                status: 'pending',
                metadata: data,
                templateId
            }
        });

        // Real-time notification
        if (channels.includes('realtime')) {
            await this.sendRealTime(userId, {
                id: notification.id,
                type,
                title: data.title || type,
                message: text,
                timestamp: new Date(),
                metadata: data
            });
            
            // Update notification status to 'sent' after successful real-time delivery
            await this.prisma.notificationsHistory.update({
                where: { id: notification.id },
                data: { 
                    status: 'sent'
                }
            });
        }
    }

    /**
     * Send real-time notification via WebSocket
     */
    async sendRealTime(userId: number, notification: any) {
        this.logger.debug('[NotificationsService] sendRealTime called', { userId, notification, keys: Object.keys(notification) });

        try {
            // Try Redis Pub/Sub first (FULL profile with multiple workers)
            const redis = await this.redisService.getRedis().catch(() => null as any);
            if (redis) {
                await redis.publish(`notification:user:${userId}`, JSON.stringify(notification));
                this.logger.debug('[NotificationsService] Sent notification via Redis Pub/Sub', { userId });
                return;
            }
        } catch (e) {
            this.logger.debug('[NotificationsService] Redis publish failed, falling back to direct WebSocket', {
                error: e instanceof Error ? e.message : e
            });
        }

        // STARTER profile (no Redis): send directly via WebSocket
        try {
            this.wsService.sendToUser(userId, notification);
            this.logger.debug('[NotificationsService] Sent notification via WebSocket', { userId, notificationKeys: Object.keys(notification) });
        } catch (error) {
            this.logger.error('[NotificationsService] Failed to send real-time notification', { error, userId });
        }
    }

    /**
     * Broadcast to all users via WebSocket
     */
    async broadcast(notification: any) {
        try {
            // Try Redis Pub/Sub first (FULL profile)
            const redis = await this.redisService.getRedis().catch(() => null as any);
            if (redis) {
                await redis.publish('notification:broadcast', JSON.stringify(notification));
                this.logger.debug('[NotificationsService] Broadcasted notification via Redis Pub/Sub');
                return;
            }
        } catch (e) {
            this.logger.debug('[NotificationsService] Redis publish failed, falling back to direct WebSocket', {
                error: e instanceof Error ? e.message : e
            });
        }

        // STARTER profile (no Redis): broadcast directly via WebSocket
        try {
            this.wsService.broadcast(notification);
            this.logger.debug('[NotificationsService] Broadcasted notification via WebSocket');
        } catch (error) {
            this.logger.error('[NotificationsService] Failed to broadcast notification', { error });
        }
    }

    /**
     * Simple API for sending notifications
     */
    async notify(userId: number, title: string, message: string, type: string = 'info') {
        return await this.send(userId, 'simple', {
            title,
            message,
            type
        }, ['internal', 'realtime']);
    }

    /**
     * Broadcast notification to all users
     */
    async notifyAll(title: string, message: string, type: string = 'info') {
        await this.broadcast({
            type,
            title,
            message,
            timestamp: new Date()
        });
    }

    /**
     * Compile template with data
     */
    private compileTemplate(template: string, data: Record<string, any>): string {
        let compiledTemplate = template;

        for (const [key, value] of Object.entries(data)) {
            const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
            compiledTemplate = compiledTemplate.replace(regex, value);
        }

        return compiledTemplate;
    }
}
