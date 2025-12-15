import { Request, Response } from 'express';
import { BaseController } from '@/core/base/BaseController.js';
import { NotificationsService } from '../services/NotificationsService';
import { inject } from 'tsyringe';
import { Controller } from '@/core/decorators/component.js';

@Controller({ path: 'notifications' })
export class NotificationsController extends BaseController {
    constructor(
        @inject(NotificationsService) private notificationsService: NotificationsService
    ) {
        super();
    }

    /**
     * Get all notifications for the authenticated user
     */
    async getNotifications(req: Request, res: Response) {
        const userId = req.user.id;
        const notifications = await this.notificationsService.getNotifications(userId);
        return this.success(res, notifications);
    }

    /**
     * Mark a notification as read
     */
    async markAsRead(req: Request, res: Response) {
        const { id } = req.params;
        const userId = req.user.id;
        await this.notificationsService.markAsRead(userId, parseInt(id));
        return this.success(res, { message: 'Notification marked as read' });
    }

    /**
     * Get unread notifications count for the authenticated user
     */
    async getUnreadCount(req: Request, res: Response) {
        const userId = req.user.id;
        const count = await this.notificationsService.getUnreadCount(userId);
        return this.success(res, { count });
    }

    /**
     * Send a new notification
     */
    async sendNotification(req: Request, res: Response) {
        const { userId, type, data, channels } = req.body;
        await this.notificationsService.send(parseInt(userId), String(type), data, channels);
        return this.success(res, { message: 'Notification sent' });
    }

    /**
     * Simple notification API
     */
    async notify(req: Request, res: Response) {
        const { userId, title, message, type } = req.body;
        await this.notificationsService.notify(parseInt(userId), String(title), String(message), String(type || 'info'));
        return this.success(res, { message: 'Notification sent' });
    }

    /**
     * Broadcast notification to all users
     */
    async broadcast(req: Request, res: Response) {
        const { title, message, type } = req.body;
        await this.notificationsService.notifyAll(String(title), String(message), String(type || 'info'));
        return this.success(res, { message: 'Broadcast sent' });
    }

    /**
     * Internal notification API - bypasses user authentication
     * Used by dispatcher for system notifications
     */
    async internalNotify(req: Request, res: Response) {
        // Verify internal API token
        const authHeader = req.headers.authorization;
        const expectedToken = process.env.INTERNAL_API_TOKEN;
        
        if (!authHeader || !expectedToken) {
            return this.error(res, 'Unauthorized: Missing authentication', 'UNAUTHORIZED', 401);
        }

        const token = authHeader.replace('Bearer ', '');
        if (token !== expectedToken) {
            return this.error(res, 'Unauthorized: Invalid internal token', 'UNAUTHORIZED', 401);
        }

        const { userId, title, message, type } = req.body;
        
        if (!userId || !title) {
            return this.error(res, 'Bad Request: userId and title are required', 'BAD_REQUEST', 400);
        }

        await this.notificationsService.notify(parseInt(userId), String(title), String(message || ''), String(type || 'info'));
        return this.success(res, { message: 'Internal notification sent' });
    }

    /**
     * Internal broadcast API - bypasses user authentication
     * Used by dispatcher for system broadcasts
     */
    async internalBroadcast(req: Request, res: Response) {
        // Verify internal API token
        const authHeader = req.headers.authorization;
        const expectedToken = process.env.INTERNAL_API_TOKEN;
        
        if (!authHeader || !expectedToken) {
            return this.error(res, 'Unauthorized: Missing authentication', 'UNAUTHORIZED', 401);
        }

        const token = authHeader.replace('Bearer ', '');
        if (token !== expectedToken) {
            return this.error(res, 'Unauthorized: Invalid internal token', 'UNAUTHORIZED', 401);
        }

        const { title, message, type } = req.body;
        
        if (!title) {
            return this.error(res, 'Bad Request: title is required', 'BAD_REQUEST', 400);
        }

        await this.notificationsService.notifyAll(String(title), String(message || ''), String(type || 'info'));
        return this.success(res, { message: 'Internal broadcast sent' });
    }
}
