import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { BaseService } from '@/core/base/BaseService.js';
import { AuthMiddleware } from '@/core/security/middlewares/AuthMiddleware.js';
import { registry } from '../registry-adapter';

/**
 * DSL Pre-Authentication Middleware
 * 
 * Analyzes DSL requests to determine if authentication is required
 * based on the target model's access control settings.
 * 
 * Flow:
 * 1. Parse request body to extract model name
 * 2. Check model's access control settings
 * 3. If model allows anonymous access for the operation - skip auth
 * 4. If model requires authentication - delegate to AuthMiddleware
 */
export class DslPreAuthMiddleware extends BaseService {
    constructor() {
        super();
    }

    /**
     * Get AuthMiddleware instance using lazy loading pattern
     * Following the same approach as BaseModule.getAuthMiddleware()
     */
    private getAuthMiddleware(): AuthMiddleware {
        try {
            return container.resolve(AuthMiddleware);
        } catch (error) {
            this.logger.error('[DslPreAuthMiddleware] Failed to resolve AuthMiddleware', error);
            throw new Error('AuthMiddleware is not available');
        }
    }

    /**
     * Create middleware function for DSL authentication
     */
    middleware() {
        // Bind to named method to avoid <anonymous> in logs
        return this.analyze.bind(this);
    }

    /**
     * Analyze DSL request to determine auth need
     */
    private async analyze(req: Request, res: Response, next: NextFunction) {
        try {
            this.logger.debug('[DslPreAuthMiddleware] Analyzing DSL request for authentication requirements', {
                method: req.method,
                path: req.path,
                hasBody: !!req.body,
                className: 'DslPreAuthMiddleware',
                methodName: 'analyze'
            });

                // 🔍 DETAILED REQUEST BODY LOGGING
                this.logger.debug('[DslPreAuthMiddleware] Full request body:', {
                    body: req.body,
                    bodyType: typeof req.body,
                    bodyKeys: req.body ? Object.keys(req.body) : 'null',
                    bodyStringified: JSON.stringify(req.body, null, 2)
                });

                // Extract DSL operation details from request body
                const operationDetails = this.extractOperationDetails(req);
                
                if (!operationDetails) {
                    this.logger.warn('[DslPreAuthMiddleware] Could not extract operation details from request body');
                    return this.delegateToAuth(req, res, next);
                }

                const { modelName, operation, module } = operationDetails;

                this.logger.debug('[DslPreAuthMiddleware] Extracted operation details', {
                    modelName,
                    operation,
                    module,
                    className: 'DslPreAuthMiddleware',
                    methodName: 'analyze'
                });

                // 🔍 DEBUG: Check variables right before registry call
                this.logger.debug('[DslPreAuthMiddleware] About to call registry.getModel with:', {
                    operationDetails,
                    modelName,
                    operation,
                    module,
                    modelNameType: typeof modelName,
                    moduleType: typeof module
                });

                // Get model from DSL registry
                const model = registry.getModel(modelName, module);
                
                if (!model) {
                    this.logger.warn('[DslPreAuthMiddleware] Model not found in registry', {
                        modelName,
                        module
                    });
                    return this.delegateToAuth(req, res, next);
                }

                // Check if model allows anonymous access for this operation
                const allowsAnonymous = this.checkAnonymousAccess(model, operation);

                if (allowsAnonymous) {
                    this.logger.debug('[DslPreAuthMiddleware] Anonymous access allowed for operation', {
                        modelName,
                        operation
                    });
                    
                    // Set user as undefined for anonymous access
                    req.user = undefined;
                    return next();
                } else {
                    this.logger.debug('[DslPreAuthMiddleware] Authentication required for operation', {
                        modelName,
                        operation
                    });
                    
                    // Delegate to standard authentication middleware
                    return this.delegateToAuth(req, res, next);
                }

            } catch (error: any) {
                this.logger.error('[DslPreAuthMiddleware] Error during pre-authentication analysis', {
                    error: error.message,
                    stack: error.stack,
                    className: 'DslPreAuthMiddleware',
                    methodName: 'analyze'
                });
                
                // On error, delegate to standard auth for security
                return this.delegateToAuth(req, res, next);
            }
    }

    /**
     * Extract operation details from request body
     */
    private extractOperationDetails(req: Request): {
        modelName: string;
        operation: string;
        module?: string;
    } | null {
        try {
            this.logger.debug('[DslPreAuthMiddleware] Extracting operation details...', { className: 'DslPreAuthMiddleware', methodName: 'extractOperationDetails' });
            
            // Handle both direct body and nested body structure
            const payload = req.body?.body || req.body;
            
            this.logger.debug('[DslPreAuthMiddleware] Payload extracted:', {
                payload,
                payloadType: typeof payload,
                isObject: typeof payload === 'object',
                payloadKeys: payload ? Object.keys(payload) : 'null'
            });
            
            if (!payload || typeof payload !== 'object') {
            this.logger.warn('[DslPreAuthMiddleware] Invalid payload type');
                return null;
            }

            const { model, operation, module } = payload;

            this.logger.debug('[DslPreAuthMiddleware] Destructured fields:', {
                model,
                operation,
                module,
                modelType: typeof model,
                operationType: typeof operation,
                moduleType: typeof module
            });

            if (!model || !operation) {
                this.logger.debug('[DslPreAuthMiddleware] Missing required fields in payload', {
                    hasModel: !!model,
                    hasOperation: !!operation,
                    model,
                    operation
                });
                return null;
            }

            const result = {
                modelName: model,
                operation: operation,
                module: module
            };

            this.logger.debug('[DslPreAuthMiddleware] Successfully extracted operation details:', result);

            return result;

        } catch (error: any) {
            this.logger.warn('[DslPreAuthMiddleware] Failed to parse operation details', {
                error: error.message,
                stack: error.stack
            });
            return null;
        }
    }

    /**
     * Check if model allows anonymous access for the given operation
     */
    private checkAnonymousAccess(model: any, operation: string): boolean {
        try {
            if (!model.access) {
                // No access control defined - require authentication
                return false;
            }

            const allowedRoles = model.access[operation] || [];
            const allowsAnonymous = allowedRoles.includes('anonymous');

            this.logger.debug('[DslPreAuthMiddleware] Access control check', {
                modelName: model.name,
                operation,
                allowedRoles,
                allowsAnonymous
            });

            return allowsAnonymous;

        } catch (error: any) {
            this.logger.warn('[DslPreAuthMiddleware] Error checking anonymous access', {
                error: error.message,
                modelName: model?.name
            });
            return false; // Default to requiring authentication
        }
    }

    /**
     * Delegate to standard AuthMiddleware
     */
    private delegateToAuth(req: Request, res: Response, next: NextFunction) {
        this.logger.debug('[DslPreAuthMiddleware] Delegating to AuthMiddleware');
        
        try {
            // Get AuthMiddleware instance using lazy loading
            const authMiddleware = this.getAuthMiddleware();
            
            // 🔍 DEBUG: Inspect authMiddleware object
            this.logger.info('[DslPreAuthMiddleware] 🔍 AuthMiddleware object debug:', {
                type: typeof authMiddleware,
                constructor: authMiddleware.constructor?.name,
                isInstance: authMiddleware instanceof AuthMiddleware,
                methods: Object.getOwnPropertyNames(authMiddleware),
                prototypeMethod: Object.getOwnPropertyNames(Object.getPrototypeOf(authMiddleware)),
                hasAuthenticate: typeof authMiddleware.authenticate,
                stringified: authMiddleware.toString()
            });
            
            // Create auth middleware function and call it
            const authFunction = authMiddleware.authenticate();
            return authFunction(req, res, next);
        } catch (error: any) {
            this.logger.error('[DslPreAuthMiddleware] Failed to delegate to AuthMiddleware', {
                error: error.message
            });
            
            // If AuthMiddleware is not available, return 500 error
            return res.status(500).json({
                success: false,
                error: 'Authentication service unavailable'
            });
        }
    }
}
