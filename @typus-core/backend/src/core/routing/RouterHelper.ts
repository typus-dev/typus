import { ILogger } from '@/core/logger/ILogger.js';
import { LoggerFactory } from '@/core/logger/LoggerFactory.js';

export class RouterHelper {
    private logger: ILogger;
    
    constructor() {
        this.logger = LoggerFactory.getGlobalLogger();
        this.logger.info('[RouterHelper] initialized');

       
    }
    
    static setupRoutes(module: any) {
        const r = module.router;
        const c = module.controller;
        const logger = LoggerFactory.getGlobalLogger();
        const moduleName = module.moduleName || module.constructor.name || 'UnknownModule';
        const basePath = module.basePath || '/';
    
        logger.info(`[RouterHelper] Setting up routes for module: ${moduleName} at base path: ${basePath}`);
                 
        // Safe wrapper function for route handlers
        const safeHandler = (handler: any, controllerInstance: any) => {

            logger.debug(`➡️ [RouterHelper] Handling request in module ${moduleName}`);
            return async (req: any, res: any, next: any) => {
                // Process request body
                if (req.body === null || req.body === undefined) {
                    req.body = {};
                    logger.debug('➡️ [RouterHelper] Empty body detected, initializing to empty object', {
                        method: req.method,
                        path: req.originalUrl || req.url || 'unknown'
                    });
                }


                
                const route = req.route?.path || 'unknown';
                const method = req.method || 'unknown';
                const url = req.originalUrl || req.url || 'unknown';
                
                logger.debug(`➡️ [RouterHelper] Handling ${method} request to ${route} (${url})`, {
                    controller: controllerInstance.constructor.name,
                    userId: req.user?.id
                });
                
                logger.debug(`➡️ [RouterHelper] Request body for ${method} ${url}`, { requestBody: req.body });
                
                const startTime = Date.now();
                
                try {
                    // Determine the handler (function or controller method)
                    const handlerFn = typeof handler === 'string'
                        ? controllerInstance[handler].bind(controllerInstance)
                        : handler;
                    
                    logger.debug(`➡️ [RouterHelper] Executing controller method`, {
                        controller: controllerInstance.constructor.name,
                        path: url,
                        method
                    });
                    
                    // Execute the handler
                    const result = await handlerFn(req, res, next);
                    
                    const processingTime = Date.now() - startTime;
                    
                    // If headers already sent, handler called res.json/send/end
                    if (res.headersSent) {
                        logger.debug(`⬅️ [RouterHelper] Headers already sent by controller`, {
                            controller: controllerInstance.constructor.name,
                            method,
                            path: url,
                            processingTime,
                            statusCode: res.statusCode
                        });
                        return;
                    }
                    
                    logger.debug(`⬅️ [RouterHelper] Request completed successfully`, {
                        controller: controllerInstance.constructor.name,
                        method,
                        path: url,
                        processingTime,
                        resultSize: result ? JSON.stringify(result).length : 0
                    });
                    
                    // If result already has status/data/error, return as is
                    if (result && typeof result === 'object' && 'status' in result && 'data' in result && 'error' in result) {
                        logger.debug('⬅️ [RouterHelper] Returning existing standard response', { result });
                        // Add detailed logging of the response structure
                        logger.info('⬅️ [RouterHelper] Response structure (pre-formatted)', {
                            controller: controllerInstance.constructor.name,
                            method,
                            path: url,
                            responseStructure: JSON.stringify(result),
                            hasStatus: 'status' in result,
                            hasData: 'data' in result,
                            dataType: result.data ? typeof result.data : 'null',
                            isDataObject: result.data && typeof result.data === 'object',
                            dataKeys: result.data && typeof result.data === 'object' ? Object.keys(result.data) : []
                        });
                        
                        // Check for nested data object and warn if found
                        if (result.data && 
                            typeof result.data === 'object' && 
                            'data' in result.data) {
                            logger.warn('⚠️ [RouterHelper] WARNING: Nested data object detected in response', {
                                controller: controllerInstance.constructor.name,
                                method,
                                path: url,
                                nestedDataType: typeof result.data.data,
                                nestedDataKeys: typeof result.data.data === 'object' ? Object.keys(result.data.data) : []
                            });
                        }
                        return res.status(result.status).json(result);
                    }

                    // Else wrap in standard format
                    logger.debug('⬅️ [RouterHelper] Wrapping response in standard format', { result });
                    // Add detailed logging of the response structure
                    const standardResponse = {
                        status: 200,
                        data: result,
                        error: null
                    };
                    logger.info('⬅️ [RouterHelper] Response structure (wrapped)', {
                        controller: controllerInstance.constructor.name,
                        method,
                        path: url,
                        responseStructure: JSON.stringify(standardResponse),
                        originalResultType: typeof result,
                        isResultObject: result && typeof result === 'object',
                        resultKeys: result && typeof result === 'object' ? Object.keys(result) : []
                    });
                    
                    // Check for nested data object and warn if found
                    if (result && 
                        typeof result === 'object' && 
                        'data' in result) {
                        logger.warn('⚠️ [RouterHelper] WARNING: Nested data object detected in controller result', {
                            controller: controllerInstance.constructor.name,
                            method,
                            path: url,
                            nestedDataType: typeof result.data,
                            nestedDataKeys: typeof result.data === 'object' ? Object.keys(result.data) : []
                        });
                    }

                    logger.debug('⬅️ [RouterHelper] Sending standard response', JSON.stringify(standardResponse));
                    return res.status(200).json(standardResponse);
                } catch (error) {
                    const processingTime = Date.now() - startTime;
                    
                    // Log the error
                    logger.error(`⬅️ [RouterHelper] Error handling ${method} ${route}`, {
                        error: error.message,
                        stack: error.stack,
                        processingTime,
                        userId: req.user?.id,
                        controller: controllerInstance.constructor.name
                    });
                    
                    // Check error type
                    const status = error.status || 500;
                    const code = error.code || 'INTERNAL_ERROR';
                    
                    logger.debug(`⬅️ [RouterHelper] Sending error response`, {
                        controller: controllerInstance.constructor.name,
                        method,
                        path: url,
                        statusCode: status,
                        errorCode: code
                    });
                    
                    return res.status(status).json({
                        success: false,
                        error: {
                            message: error.message || 'Internal server error',
                            code
                        }
                    });
                }
            };
        };
        
        return {
            get: (path: string, middleware = [], handler: any) => {
                // Remove: logger.debug(`[RouterHelper:${moduleName}] Received arguments for GET ${path}:`, arguments);

                if (typeof handler !== 'function') { // Check if handler is a function
                    logger.warn(`[RouterHelper:${moduleName}] GET ${path}: handler is missing or not a function`);
                }
            
                if (!Array.isArray(middleware)) {
                    logger.warn(`[RouterHelper:${moduleName}] GET ${path}: middleware should be an array`);
                }

                logger.debug(`[RouterHelper:${moduleName}] Registering GET route: ${basePath}${path}`);
                return r.get(path, ...middleware, safeHandler(handler, c));
            },
            post: (path: string, middleware = [], handler: any) => {
                // Remove: logger.debug(`[RouterHelper:${moduleName}] Received arguments for POST ${path}:`, arguments);

                if (typeof handler !== 'function') { // Check if handler is a function
                    logger.warn(`[RouterHelper:${moduleName}] POST ${path}: handler is missing or not a function`); // Corrected method
                }
            
                if (!Array.isArray(middleware)) {
                    logger.warn(`[RouterHelper:${moduleName}] POST ${path}: middleware should be an array`); // Corrected method
                }
                
                logger.debug(`[RouterHelper:${moduleName}] Registering POST route: ${basePath}${path}`);
                return r.post(path, ...middleware, safeHandler(handler, c));
            },
            put: (path: string, middleware = [], handler: any) => {
                // Remove: logger.debug(`[RouterHelper:${moduleName}] Received arguments for PUT ${path}:`, arguments);

                if (typeof handler !== 'function') { // Check if handler is a function
                    logger.warn(`[RouterHelper:${moduleName}] PUT ${path}: handler is missing or not a function`); // Corrected method
                }
            
                if (!Array.isArray(middleware)) {
                    logger.warn(`[RouterHelper:${moduleName}] PUT ${path}: middleware should be an array`); // Corrected method
                }
                
                logger.debug(`[RouterHelper:${moduleName}] Registering PUT route: ${basePath}${path}`);
                return r.put(path, ...middleware, safeHandler(handler, c));
            },
            delete: (path: string, middleware = [], handler: any) => {
                // Remove: logger.debug(`[RouterHelper:${moduleName}] Received arguments for DELETE ${path}:`, arguments);

                if (typeof handler !== 'function') { // Check if handler is a function
                    logger.warn(`[RouterHelper:${moduleName}] DELETE ${path}: handler is missing or not a function`); // Corrected method
                }
            
                if (!Array.isArray(middleware)) {
                    logger.warn(`[RouterHelper:${moduleName}] DELETE ${path}: middleware should be an array`); // Corrected method
                }                
                logger.debug(`[RouterHelper:${moduleName}] Registering DELETE route: ${basePath}${path}`);
                return r.delete(path, ...middleware, safeHandler(handler, c));
            }
        };
    }
}
