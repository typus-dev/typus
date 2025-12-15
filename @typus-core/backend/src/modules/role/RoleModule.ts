import { BaseModule } from '@/core/base/BaseModule.js';
import { RoleController } from './controllers/RoleController';
import { RoleService } from './services/RoleService';
import { createRoleSchema, updateRoleSchema, roleIdParamSchema } from './validation/roleSchemas';
import { Module } from '@/core/decorators/component.js';
import { ValidationMiddleware } from '@/core/middleware/ValidationMiddleware.js'; // Import ValidationMiddleware

/**
 * Role module
 */

export class RoleModule extends BaseModule<RoleController, RoleService> { // Add generic types

    constructor() {
        const basePath = 'roles';
        // Pass classes directly to super
        super(basePath, RoleController, RoleService);
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
        
        // Register routes
        this.router.post('/search',  [
            this.auth(),
            this.roles(['admin'])
        ], this.controller.getAll.bind(this.controller));
              
        this.router.get('/:id', [
            this.auth(),
            this.roles(['admin']),
            ValidationMiddleware.validate(roleIdParamSchema, 'params') // Use ValidationMiddleware directly
        ], this.controller.getById.bind(this.controller));
        
        this.router.post('/', [
            this.auth(),
            this.roles(['admin']),
            ValidationMiddleware.validate(createRoleSchema) // Use ValidationMiddleware directly
        ], this.controller.create.bind(this.controller));
        
        this.router.put('/:id', [
            this.auth(),
            this.roles(['admin']),
            ValidationMiddleware.validate(roleIdParamSchema, 'params'), // Use ValidationMiddleware directly
            ValidationMiddleware.validate(updateRoleSchema, 'all') // Use ValidationMiddleware directly
        ], this.controller.update.bind(this.controller));
        
        this.router.delete('/:id', [
            this.auth(),
            this.roles(['admin']),
            ValidationMiddleware.validate(roleIdParamSchema, 'params') // Use ValidationMiddleware directly
        ], this.controller.delete.bind(this.controller));
        
        this.logger.info(`[${this.moduleName}] routes initialized`);
    }
}
