import { BaseModule } from '@/core/base/BaseModule.js';
import { UserController } from './controllers/UserController';
import { UserService } from './services/UserService';
import { userCreateSchema, userUpdateSchema, userIdParamSchema, userSearchSchema } from './validation/userSchemas';
import { Module } from '@/core/decorators/component.js';
import { ValidationMiddleware } from '@/core/middleware/ValidationMiddleware.js'; // Import ValidationMiddleware
import { UnauthorizedError, ForbiddenError } from '@/core/base/BaseError.js';
import { isAdmin } from '@/core/security/isAdmin.js';
import { Request, Response, NextFunction } from 'express';

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
     * Fields that decide what a user IS, not what a user looks like.
     *
     * WHY they are listed here: `role` is the column AuthMiddleware reads on every request to build
     * req.user.roles, so a user who can write it can make themselves an admin between two requests.
     * The rest hand out account state (approved / deleted / verified) that only an operator may set.
     */
    private static readonly PRIVILEGED_FIELDS = ['role', 'isAdmin', 'isApproved', 'isDeleted', 'isEmailVerified'];

    /**
     * The caller may act on :id only if it is their own row, or if they are an admin.
     *
     * WHY: `this.auth()` alone only answers "are you signed in", and these routes address ANY user by
     * :id. Proven on prod (2026-07-21) with a throwaway account: GET /users/:id returned a stranger's
     * row and PUT /users/:id rewrote that stranger's password hash - an account takeover of anyone,
     * including the owner, by anybody who registered a minute earlier.
     */
    private selfOrAdmin() {
        return (req: Request, res: Response, next: NextFunction) => {
            if (!req.user) return next(new UnauthorizedError('Authentication required'));
            if (isAdmin(req.user)) return next();
            if (String((req.user as any).id) === String(req.params.id)) return next();
            return next(new ForbiddenError('Insufficient permissions'));
        };
    }

    /**
     * A non-admin editing their own profile may not touch the fields that grant privilege.
     *
     * WHY it rejects instead of silently dropping them: a request carrying `role: admin` is an attempt,
     * not a typo, and a 403 says so in the log. Silently stripping would also lie to a legitimate client
     * that its write succeeded.
     */
    private noPrivilegeEscalation() {
        return (req: Request, res: Response, next: NextFunction) => {
            if (isAdmin(req.user)) return next();
            const body = (req.body ?? {}) as Record<string, unknown>;
            const attempted = UserModule.PRIVILEGED_FIELDS.filter(f => f in body);
            if (attempted.length > 0) {
                return next(new ForbiddenError(`Only an admin may set: ${attempted.join(', ')}`));
            }
            return next();
        };
    }

    /**
     * Initialize module routes
     */
    protected initializeRoutes(): void {
        this.logger.info(`[${this.moduleName}] routes initializing...`);


        this.router.post('/search', [this.auth(), this.roles(['admin']), ValidationMiddleware.validate(userSearchSchema, 'body')], // Use ValidationMiddleware directly
            this.controller.searchUsers.bind(this.controller)
        );

        // ADMIN: this is the whole user table, addresses included. The stray userIdParamSchema that used
        // to guard it validated a :id that this route does not have, so every call 400d - an accident,
        // not a guard, and it would have started leaking the moment anyone "fixed" the validator.
        this.router.get('/', [this.auth(), this.roles(['admin'])],
            this.controller.getAllUsers.bind(this.controller));

        this.router.get('/:id', [this.auth(),
            ValidationMiddleware.validate(userIdParamSchema, 'params'), // Use ValidationMiddleware directly
            this.selfOrAdmin()],
            this.controller.getUserById.bind(this.controller));

        this.router.post('/', [
            this.auth(),
            this.roles(['admin']),
            ValidationMiddleware.validate(userCreateSchema, 'body') // Use ValidationMiddleware directly
        ], this.controller.createUser.bind(this.controller));

        this.router.put('/:id', [
            this.auth(),
            ValidationMiddleware.validate(userIdParamSchema, 'params'), // Use ValidationMiddleware directly
            ValidationMiddleware.validate(userUpdateSchema), // Use ValidationMiddleware directly
            this.selfOrAdmin(),
            this.noPrivilegeEscalation()
        ], this.controller.updateUser.bind(this.controller));

        this.router.delete('/:id', [
            this.auth(),
            this.roles(['admin']),
            ValidationMiddleware.validate(userIdParamSchema, 'params'), // Use ValidationMiddleware directly
        ], this.controller.deleteUser.bind(this.controller));



        this.logger.info(`[${this.moduleName}] routes initialized`);
    }
}
