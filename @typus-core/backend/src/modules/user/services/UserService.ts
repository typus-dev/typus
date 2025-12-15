import { inject } from 'tsyringe';
import { BaseService } from '@/core/base/BaseService.js';
import { NotFoundError, BadRequestError } from '@/core/base/BaseError.js';
import bcrypt from 'bcryptjs';
import { Service } from '@/core/decorators/component.js';
import { AuthHelperService } from '@/modules/auth/services/AuthHelperService.js';
import { SessionManagementService } from '@/modules/auth/services/SessionManagementService.js';

interface UserSearchParams {
    name?: string;
    email?: string;
    role?: string;
    isDeleted?: boolean;
}

@Service()
export class UserService extends BaseService {
    constructor(
        @inject(AuthHelperService) private authHelperService: AuthHelperService,
        @inject(SessionManagementService) private sessionManagementService: SessionManagementService
    ) {
        super();
        this.logger.info('[UserService] Initialized');
    }

    async getAllUsers() {
        const users = await this.prisma.authUser.findMany({
            where: { isDeleted: false }
        });
        
        return Promise.all(users.map(user => this.authHelperService.sanitizeUser(user)));
    }

    async searchUsers(params: UserSearchParams = {}) {
        this.logger.debug('[UserService.searchUsers] searchParams:', params);
        
        const whereClause: any = { // Keep 'any' for now, focus on params typing
            isDeleted: false,
        };
        
        if (params.name) whereClause.name = { contains: params.name };
        if (params.email) whereClause.email = { contains: params.email };
        if (params.role) whereClause.role = { contains: params.role };
        if (params.isDeleted !== undefined) whereClause.isDeleted = params.isDeleted;
        
        const users = await this.prisma.authUser.findMany({
            where: whereClause
        });
        
        return Promise.all(users.map(user => this.authHelperService.sanitizeUser(user)));
    }

    async getUserById(id) {
        const user = await this.prisma.authUser.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!user) {
            throw new NotFoundError(`User with ID ${id} not found`);
        }
        
        return this.authHelperService.sanitizeUser(user);
    }

    async createUser(data) {
        
        const existingUser = await this.prisma.authUser.findUnique({
            where: { email: data.email }
        });
        
        if (existingUser) {
            throw new BadRequestError(`User with email ${data.email} already exists`);
        }
        
        const hashedPassword = await bcrypt.hash(data.password, 10);
        
        const userData = { ...data, password: hashedPassword };
        const createdUser = await this.prisma.authUser.create({ data: userData });
        
        return this.authHelperService.sanitizeUser(createdUser);
    }

    async updateUser(id, data) {
        const userExists = await this.prisma.authUser.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!userExists) {
            throw new NotFoundError(`User with ID ${id} not found`);
        }
        
        if (data.email && data.email !== userExists.email) {
            const existingUser = await this.prisma.authUser.findFirst({
                where: {
                    email: data.email,
                    id: { not: parseInt(id) }
                }
            });
            
            if (existingUser) {
                throw new BadRequestError(`Email ${data.email} is already in use`);
            }
        }
        
        // Check if approval status is being changed to false
        const wasApproved = userExists.isApproved;
        const willBeApproved = data.isApproved;
        const approvalRevoked = wasApproved && willBeApproved === false;
        
        const updateData = { ...data };
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }
        
        const updatedUser = await this.prisma.authUser.update({
            where: { id: parseInt(id) },
            data: updateData
        });
        
        // If approval was revoked, terminate all user sessions
        if (approvalRevoked) {
            this.logger.info('[UserService] User approval revoked, terminating all sessions', {
                userId: parseInt(id),
                email: userExists.email
            });
            
            try {
                const terminatedCount = await this.sessionManagementService.terminateUserSessions(
                    parseInt(id),
                    undefined, // Don't exclude any sessions
                    undefined  // No requesting user ID for system action
                );
                
                this.logger.info('[UserService] Successfully terminated user sessions due to approval revocation', {
                    userId: parseInt(id),
                    terminatedCount
                });
            } catch (error) {
                // Log error but don't fail the user update
                this.logger.error('[UserService] Failed to terminate user sessions after approval revocation', {
                    userId: parseInt(id),
                    error: error.message,
                    stack: error.stack
                });
            }
        }
        
        return this.authHelperService.sanitizeUser(updatedUser);
    }

    async deleteUser(id) {
        const userExists = await this.prisma.authUser.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!userExists) {
            throw new NotFoundError(`User with ID ${id} not found`);
        }
        
        await this.prisma.authUser.update({
            where: { id: parseInt(id) },
            data: {
                isDeleted: true,
                updatedAt: new Date()
            }
        });
        
        // Terminate all user sessions when user is deleted
        this.logger.info('[UserService] User deleted, terminating all sessions', {
            userId: parseInt(id),
            email: userExists.email
        });
        
        try {
            const terminatedCount = await this.sessionManagementService.terminateUserSessions(
                parseInt(id),
                undefined, // Don't exclude any sessions
                undefined  // No requesting user ID for system action
            );
            
            this.logger.info('[UserService] Successfully terminated user sessions due to user deletion', {
                userId: parseInt(id),
                terminatedCount
            });
        } catch (error) {
            // Log error but don't fail the user deletion
            this.logger.error('[UserService] Failed to terminate user sessions after user deletion', {
                userId: parseInt(id),
                error: error.message,
                stack: error.stack
            });
        }
        
        return true;
    }

    async hardDeleteUser(id) {
        const userExists = await this.prisma.authUser.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!userExists) {
            throw new NotFoundError(`User with ID ${id} not found`);
        }
        
        await this.prisma.authUser.delete({
            where: { id: parseInt(id) }
        });
        
        return true;
    }
}
