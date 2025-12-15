import { Request, Response } from 'express';
import { BaseController } from '@/core/base/BaseController.js';
import { UserService } from '../services/UserService';
import { inject } from 'tsyringe';
import { Controller } from '@/core/decorators/component.js';

@Controller({ path: 'users' })
export class UserController extends BaseController {
    constructor(
        @inject(UserService) private userService: UserService
    ) {
        super();
    }

    async getAllUsers(req: Request, res: Response) {
        return await this.userService.getAllUsers();
    }

    async searchUsers(req: Request, res: Response) {
        const searchParams = this.getValidatedData(req).body;

        this.logger.debug('[UserController.searchUsers] searchParams:', searchParams);

        return await this.userService.searchUsers(searchParams);
    }

    async getUserById(req: Request, res: Response) {

        const { id } = req.params;

        return await this.userService.getUserById(Number(id));
    }

    async createUser(req: Request, res: Response) {
        const userData = this.getValidatedData(req).body;

        this.logger.debug('[UserController.createUser]  Received userData:', userData);

        const result = await this.userService.createUser(userData);


        this.logger.debug('[UserController.createUser] result:', result);   

        /*
        if (result.error) {
            return this.badRequest(res, result.error.message, result.error.code);
        }
        if (result.data) {
            return this.success(res, result.data, 201);
        }*/

        return result;
    }

    async updateUser(req: Request, res: Response) {
        const { id } = req.params;
        const userData = this.getValidatedData(req).body;

        this.logger.debug('[UserController.updateUser] Received userData:', userData);

        return await this.userService.updateUser(Number(id), userData);
    }

    async deleteUser(req: Request, res: Response) {
        const { id } = req.params;

        return await this.userService.deleteUser(Number(id));
    }
}