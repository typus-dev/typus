import { BaseModule } from '@/core/base/BaseModule.js';
import { NotificationsController } from './controllers/NotificationsController';
import { NotificationsService } from './services/NotificationsService';
import { Module } from '@/core/decorators/component.js';


export class NotificationsModule extends BaseModule<NotificationsController, NotificationsService> { // Add generic types

    constructor() {
        const basePath = 'notifications';
        // Pass classes directly to super
        super(basePath, NotificationsController, NotificationsService);
    }

    protected initialize(): void {
        this.logger.info(`[${this.moduleName}] module initialized`);
    }

    protected initializeRoutes(): void {
        this.router.get('/', [
            this.auth()
        ], this.controller.getNotifications.bind(this.controller));

        this.router.put('/:id/read', [
            this.auth()
        ], this.controller.markAsRead.bind(this.controller));

        this.router.get('/unread-count', [
            this.auth()
        ], this.controller.getUnreadCount.bind(this.controller));

        this.router.post('/send', [
            this.auth()
        ], this.controller.sendNotification.bind(this.controller));

        this.router.post('/notify', [
            this.auth()
        ], this.controller.notify.bind(this.controller));

        this.router.post('/broadcast', [
            this.auth()
        ], this.controller.broadcast.bind(this.controller));

        // Internal API endpoints (no authentication required)
        this.router.post('/internal/notify', 
            this.controller.internalNotify.bind(this.controller));

        this.router.post('/internal/broadcast', 
            this.controller.internalBroadcast.bind(this.controller));
    }
}
