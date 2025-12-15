// src/core/security/middlewares/AuthMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken'; // Import JwtPayload
import { UnauthorizedError, ForbiddenError } from '@/core/base/BaseError.js';
import { ILogger } from '@/core/logger/ILogger.js';
import { env } from '@/config/env.config.js';
import { LoggerFactory } from '@/core/logger/LoggerFactory.js';
import prisma from '@/core/database/prisma.js';
import { injectable } from 'tsyringe';

@injectable()
export class AuthMiddleware {
  private logger: ILogger;
  private jwtSecret: string;

  constructor() {
    this.logger = LoggerFactory.getGlobalLogger();
    this.jwtSecret = env.JWT_SECRET;

    this.logger.info('[AuthMiddleware] initialized');
  }

  /**
   * Shared token resolution logic used by both strict and optional auth flows
   */
  private async resolveToken(req: Request, token: string): Promise<void> {
    if (!token) {
      throw new UnauthorizedError('Invalid token format');
    }

    // Handle internal API token scenario
    if (token === env.INTERNAL_API_TOKEN) {
      this.logger.debug('[AuthMiddleware] Internal API token detected, creating task_worker user');

      const taskWorkerUser = {
        id: 0,
        email: 'task_worker@system',
        roles: ['task_worker'],
        isTaskWorker: true,
        abilityRules: [{ action: 'manage', subject: 'all' }]
      };

      req.user = taskWorkerUser;
      (req as any)._taskWorkerUser = taskWorkerUser;

      if (req.context) {
        req.context.set('user', taskWorkerUser);
      }

      this.logger.debug('[AuthMiddleware] taskWorkerUser created:', taskWorkerUser);
      return;
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;

      if (!decoded.jti) {
        this.logger.error('Token missing JTI', { userId: decoded.id });
        throw new UnauthorizedError('Invalid token format');
      }

      const refreshToken = await prisma.authRefreshToken.findFirst({
        where: {
          accessTokenJti: decoded.jti,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (!refreshToken) {
        this.logger.error('Session invalidated - refresh token not found', {
          userId: decoded.id,
          jti: decoded.jti
        });
        throw new UnauthorizedError('Session has been invalidated');
      }

      const userWithRole = await prisma.authUser.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, role: true }
      });

      let abilityRules: any[] = [];
      if (userWithRole?.role) {
        const roleData = await prisma.authRole.findFirst({
          where: { name: userWithRole.role },
          select: { abilityRules: true }
        });
        abilityRules = Array.isArray(roleData?.abilityRules)
          ? roleData.abilityRules
          : [];
      }

      const userWithAbilities = {
        id: decoded.id,
        email: decoded.email || userWithRole?.email,
        ...decoded,
        roles: [userWithRole?.role].filter(Boolean),
        abilityRules
      };

      req.user = userWithAbilities;

      if (req.context) {
        req.context.set('user', userWithAbilities);
      }
    } catch (error) {
      this.logger.error('Token verification failed', { error });
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  /**
   * Authenticate user using JWT or INTERNAL_API_TOKEN
   */
  authenticate() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new UnauthorizedError('Authorization token is required');
        }

        const token = authHeader.split(' ')[1];
        await this.resolveToken(req, token);
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Attempt to authenticate user but allow anonymous access when no token is provided
   */
  authenticateOptional() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
          // No token provided – keep anonymous context
          return next();
        }

        if (!authHeader.startsWith('Bearer ')) {
          throw new UnauthorizedError('Authorization token is required');
        }

        const token = authHeader.split(' ')[1];
        await this.resolveToken(req, token);
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check if user has required roles
   */
  hasRoles(roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          throw new UnauthorizedError('Authentication required');
        }

        // Get user roles, normalize to array of lower-case strings
        const userRolesRaw = (req.user as any).roles || [];
        const userRoles = Array.isArray(userRolesRaw)
          ? userRolesRaw.map((r: string) => (typeof r === 'string' ? r.toLowerCase() : ''))
          : [];
        // Normalize required roles to lower-case
        const requiredRoles = roles.map(r => r.toLowerCase());

        // Log role check
        this.logger.info(
          `[AuthMiddleware] Role check: userRoles=[${userRoles.join(', ')}] requiredRoles=[${requiredRoles.join(', ')}]`
        );

        // Check if user has at least one of the required roles (case-insensitive)
        const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

        if (!hasRequiredRole) {
          throw new ForbiddenError('Insufficient permissions');
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}
