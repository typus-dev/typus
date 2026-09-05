import { Router } from 'express';
import { RouterHelper } from '@/core/routing/RouterHelper.js';
import { AuthMiddleware } from '@/core/security/middlewares/AuthMiddleware.js';
import { container } from 'tsyringe';
import { CoreBase } from './CoreBase';

// Define Constructor type for dependency injection
type Constructor<T> = new (...args: any[]) => T;

/**
 * Base module for all application modules.
 * Handles common module initialization, routing, and dependency resolution.
 */
export abstract class BaseModule<TController, TService> extends CoreBase {
  protected basePath: string;
  protected moduleName: string;
  protected service: TService; // Use generic type
  protected controller: TController; // Use generic type
  protected router: Router;
  protected routes: any;
  protected authMiddleware: AuthMiddleware;

  /**
   * Constructor for BaseModule.
   * @param basePath - Base path for module routes.
   * @param controllerClass - Controller class.
   * @param serviceClass - Service class.
   * @param customRouter - Optional custom Express Router.
   */
  constructor(
    basePath: string,
    controllerClass: Constructor<TController>, // Expect class constructor
    serviceClass: Constructor<TService>,     // Expect class constructor
    customRouter?: Router
  ) {
    super();
       
    this.basePath = basePath;
    this.logger.info(`[Base:${this.className}] initializing...`);

    // Resolve instances from classes
    this.controller = container.resolve(controllerClass); // Resolve controller instance
    this.service = container.resolve(serviceClass);     // Resolve service instance
    this.router = customRouter || Router();
    this.moduleName = this.className;
    this.authMiddleware = this.getAuthMiddleware();

    this.initializeRoutes(); // Initialize module-specific routes
    this.routes = RouterHelper.setupRoutes(this); // Setup routes after initialization

    this.initialize(); // Perform other module initialization

    this.logger.info(`[Base:${this.moduleName}] initialized with base path: ${this.basePath}`);
  }
  
  /**
   * Abstract method for module-specific initialization logic.
   */
  protected abstract initialize(): void;
 
  /**
   * Abstract method for initializing module routes.
   */
  protected abstract initializeRoutes(): void;
  
  /**
   * Returns authentication middleware.
   * @returns Authentication middleware
   */
  protected auth(...args: never[]) {
    // WHY: this used to be auth() with no params while PaymentModule called this.auth('admin') on 28
    // routes. The argument was silently discarded, so every "admin" payment route (including
    // POST /tokens/add) was reachable by any authenticated user. tsx does not type-check at runtime,
    // so the mistake was invisible. Fail loudly at route registration instead: roles go through
    // this.roles([...]), never through auth().
    if (args.length > 0) {
      throw new Error(
        `BaseModule.auth() takes no arguments (got ${JSON.stringify(args)}). ` +
        `It only authenticates. For a role check use [this.auth(), this.roles(['admin'])].`
      );
    }
    return this.authMiddleware.authenticate();
  }

  protected authOptional() {
    return this.authMiddleware.authenticateOptional();
  }

  protected roles(roles: string[]) {
    return this.authMiddleware.hasRoles(roles);
  }

  /**
   * Get module router.
   * @returns Express Router
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Get module base path.
   * @returns Base path string
   */
  getBasePath(): string {
    return this.basePath;
  }

  /**
   * Get authentication middleware instance.
   * @returns AuthMiddleware instance
   */
  protected getAuthMiddleware(): AuthMiddleware {
    return container.resolve(AuthMiddleware);
  }
}
