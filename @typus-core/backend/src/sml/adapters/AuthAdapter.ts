/**
 * Auth Adapter for SML
 *
 * Registers authentication operations under auth.*
 */

import { SML } from '@typus-core/shared/sml';
import { container } from 'tsyringe';
import { Logger } from '../../core/logger/Logger.js';

const logger = new Logger();
const OWNER = 'core:auth';

/**
 * Register auth operations in SML.
 */
export async function registerAuthOperations(): Promise<void> {
  logger.debug('[SML:AuthAdapter] Registering auth operations');

  // auth.users.current
  SML.register('auth.users.current', {
    handler: async (params, ctx) => {
      if (!ctx?.user) {
        return null;
      }
      return {
        id: ctx.user.id,
        email: ctx.user.email,
        roles: ctx.user.roles
      };
    },
    schema: {
      description: 'Get current authenticated user from context',
      returns: {
        type: 'User',
        fields: {
          id: { type: 'number', primary: true },
          email: { type: 'string', required: true },
          roles: { type: 'string[]' }
        }
      }
    }
  }, { owner: OWNER });

  // auth.users.by-role (OPG: kebab-case for multi-word segments)
  SML.register('auth.users.by-role', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) {
        throw new Error('Prisma client not available');
      }

      const users = await prisma.authUser.findMany({
        where: {
          userRoles: {
            some: {
              role: {
                name: params.role
              }
            }
          }
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      });

      return users;
    },
    schema: {
      description: 'Get users by role name',
      params: {
        role: { type: 'string', required: true, description: 'Role name (e.g., admin, manager)' }
      },
      returns: { type: 'User[]' }
    }
  }, { owner: OWNER, visibility: 'internal' });

  // auth.users.by-id (OPG: kebab-case for multi-word segments)
  SML.register('auth.users.by-id', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) {
        throw new Error('Prisma client not available');
      }

      const user = await prisma.authUser.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      });

      return user;
    },
    schema: {
      description: 'Get user by ID',
      params: {
        id: { type: 'number', required: true }
      },
      returns: {
        type: 'User',
        fields: {
          id: { type: 'number', primary: true },
          email: { type: 'string', required: true },
          firstName: { type: 'string' },
          lastName: { type: 'string' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'internal' });

  // auth.check
  SML.register('auth.check', {
    handler: async (params, ctx) => {
      if (!ctx?.user) {
        return false;
      }

      // Check if user has the required permission/role
      const { permission, role } = params;

      if (role) {
        return ctx.user.roles?.includes(role) ?? false;
      }

      if (permission) {
        // For now, admin has all permissions
        if (ctx.user.roles?.includes('admin')) {
          return true;
        }
        // TODO: Implement proper permission checking
        return false;
      }

      return false;
    },
    schema: {
      description: 'Check if current user has permission or role',
      params: {
        permission: { type: 'string', description: 'Permission to check' },
        role: { type: 'string', description: 'Role to check' }
      },
      returns: { type: 'boolean' }
    }
  }, { owner: OWNER });

  // auth.is-authenticated (OPG: kebab-case for multi-word segments)
  SML.register('auth.is-authenticated', {
    handler: async (params, ctx) => {
      return ctx?.user !== undefined && ctx?.user !== null;
    },
    schema: {
      description: 'Check if user is authenticated',
      returns: { type: 'boolean' }
    }
  }, { owner: OWNER });

  logger.info('[SML:AuthAdapter] Registered 5 auth operations');
}
