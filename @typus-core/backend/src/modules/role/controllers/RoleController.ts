import { Request, Response } from 'express';
import { BaseController } from '@/core/base/BaseController.js';
import { RoleService } from '../services/RoleService';
import { inject } from 'tsyringe';
import { Controller } from '@/core/decorators/component.js';

/**
 * Role controller with decorator
 */
@Controller({ path: 'roles' })
export class RoleController extends BaseController {
    constructor(
        @inject(RoleService) private roleService: RoleService
    ) {
        super();
    }

    /**
     * Get all roles
     */
    async getAll(req: Request, res: Response) {
        return await this.roleService.getAllRoles();
    }

    /**
     * Get role by ID
     */
    async getById(req: Request, res: Response) {
        const { id } = req.params;
        
        if (!id || isNaN(Number(id))) {
            return this.badRequest(res, 'Invalid role ID', 'INVALID_ID');
        }
        
        return await this.roleService.getRoleById(Number(id));
    }

    /**
     * Create role
     */
    async create(req: Request, res: Response) {
        const validated = this.getValidatedData(req);
        const roleData = validated.body || validated; // EN: Use body if present
        const result = await this.roleService.createRole(roleData);

        // Override status code for creation
        if (result.data) {
            return this.success(res, result.data, 201);
        }

        return result;
    }

    /**
     * Update role
     */
    async update(req: Request, res: Response) {
        const { id } = req.params;
        const validated = this.getValidatedData(req);
        const roleData = validated.body || validated; // EN: Use body if present
        
        if (!id || isNaN(Number(id))) {
            return this.badRequest(res, 'Invalid role ID', 'INVALID_ID');
        }
        
        return await this.roleService.updateRole(Number(id), roleData);
    }

    /**
     * Delete role
     */
    async delete(req: Request, res: Response) {
        const { id } = req.params;
        
        if (!id || isNaN(Number(id))) {
            return this.badRequest(res, 'Invalid role ID', 'INVALID_ID');
        }
        
        return await this.roleService.deleteRole(Number(id));
    }
}
