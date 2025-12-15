import { BaseModule } from '@/core/base/BaseModule.js';
import { UserController } from './controllers/UserController';
import { UserService } from './services/UserService';
import { userCreateSchema, userUpdateSchema, userIdParamSchema, userSearchSchema } from './validation/userSchemas';
import { Module } from '@/core/decorators/component.js';
import { ValidationMiddleware } from '@/core/middleware/ValidationMiddleware.js'; // Import ValidationMiddleware

/**
 * User module
 */


export class UserModule extends BaseModule<UserController, UserService> { // Add generic types

    constructor() {
        const basePath = 'users';
        // Pass classes directly to super
        super(basePath, UserController, UserService);
    }

    /**
     * Initialize module
     */
    protected initialize(): void {
        this.logger.info(`[${this.moduleName}] module initialized`);
    }

    /**
     * Initialize module routes
     */
    protected initializeRoutes(): void {
        this.logger.info(`[${this.moduleName}] routes initializing...`);


        this.router.post('/search', [this.auth(), this.roles(['admin']), ValidationMiddleware.validate(userSearchSchema, 'body')], // Use ValidationMiddleware directly
            this.controller.searchUsers.bind(this.controller)
        );

        this.router.get('/', [this.auth(),
        ValidationMiddleware.validate(userIdParamSchema, 'params')], // Use ValidationMiddleware directly
            this.controller.getAllUsers.bind(this.controller));

        this.router.get('/:id', [this.auth(),
            ValidationMiddleware.validate(userIdParamSchema, 'params')], // Use ValidationMiddleware directly
            this.controller.getUserById.bind(this.controller));

        this.router.post('/', [
            this.auth(),
            this.roles(['admin']),
            ValidationMiddleware.validate(userCreateSchema, 'body') // Use ValidationMiddleware directly
        ], this.controller.createUser.bind(this.controller));

        this.router.put('/:id', [
            this.auth(),
            ValidationMiddleware.validate(userIdParamSchema, 'params'), // Use ValidationMiddleware directly
            ValidationMiddleware.validate(userUpdateSchema) // Use ValidationMiddleware directly
        ], this.controller.updateUser.bind(this.controller));

        this.router.delete('/:id', [
            this.auth(),
            this.roles(['admin']),
            ValidationMiddleware.validate(userIdParamSchema, 'params'), // Use ValidationMiddleware directly
        ], this.controller.deleteUser.bind(this.controller));



        this.logger.info(`[${this.moduleName}] routes initialized`);
    }
}
