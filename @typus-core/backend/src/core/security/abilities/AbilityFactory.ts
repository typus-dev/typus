// src/core/security/abilities/AbilityFactory.ts
import { AbilityBuilder, createMongoAbility, MongoAbility, ExtractSubjectType, subject } from '@casl/ability';

// Define file condition types
interface FileConditions {
  userId?: number;
  visibility?: string;
}
import { ILogger } from '@/core/logger/ILogger.js';
import { LoggerFactory } from '@/core/logger/LoggerFactory.js';

// Action types
export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete'
}

// Define subject types for type safety
export type Subjects = 'all' | 'User' | 'Post' | 'Comment' | 'Product' | 'Category' | 'Order' | 'StorageFile';

// Define the ability type
export type AppAbility = MongoAbility<[Action, Subjects]>;

export class AbilityFactory {
  private logger: ILogger;

  constructor() {
    this.logger = LoggerFactory.getGlobalLogger();
  }

  /**
   * Define abilities for a user
   */
  defineAbilityFor(user: any): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (!user) {
      // Public abilities (guest)
      can(Action.Read, 'Post');
      can(Action.Read, 'Category');
      can(Action.Read, 'Product');
      return build();
    }

    // Check user roles
    const roles = user.roles || [];

    // Admin can do everything
    if (roles.includes('admin')) {
      can(Action.Manage, 'all');
      return build();
    }

    // Storage abilities for authenticated users (simplified)
    if (roles.includes('admin')) {
      can(Action.Manage, 'StorageFile');
    }
    if (roles.includes('user') || roles.includes('editor')) {
      can(Action.Read, 'StorageFile');
      can([Action.Update, Action.Delete], 'StorageFile');
    }

    // Editor role
    if (roles.includes('editor')) {
      can([Action.Read, Action.Create, Action.Update], 'Post');
      can([Action.Read, Action.Create, Action.Update], 'Category');
      can(Action.Read, 'User');
      can(Action.Read, 'Comment');
    }

    // User role
    if (roles.includes('user')) {
      can(Action.Read, 'Post');
      can(Action.Read, 'Category');
      can(Action.Read, 'Product');
      can(Action.Create, 'Comment');
      
      // Users can update and delete their own comments
      can([Action.Update, Action.Delete], 'Comment', { userId: user.id });
      
      // Users can read their own orders
      can(Action.Read, 'Order', { userId: user.id });
      can(Action.Create, 'Order');
    }

    return build();
  }

  /**
   * Create middleware to check permissions
   */
  checkAbility(action: Action, subject: Subjects, getSubject?: (req: any) => any) {
    return (req: any, res: any, next: any) => {
      try {
        if (!req.user) {
          throw new Error('User not authenticated');
        }

        const ability = this.defineAbilityFor(req.user);
        
        let subjectData = null;
        if (getSubject) {
          subjectData = getSubject(req);
        }

        if (!ability.can(action, subjectData ? Object.assign({ type: subject }, subjectData) : subject)) {
          throw new Error(`You don't have permission to ${action} this ${subject}`);
        }

        next();
      } catch (error) {
        this.logger.error('Permission check failed', { error, action, subject });
        next(error);
      }
    };
  }
}
