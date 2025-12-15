import { injectable, inject } from 'tsyringe';
import { DslOperationType, DslHookType, DslHookHandler, DslOperationResponse } from '../types/index';
import { Ability, AbilityBuilder, subject } from '@casl/ability';
import { registry } from '../registry-adapter';
import { BaseService } from '@/core/base/BaseService.js';
import { DslRelation } from '@typus-core/shared/dsl/types';
import { EventBus } from '@/events/EventBus.js';

/**
 * Service for DSL operations
 */
@injectable()
export class DslService extends BaseService {
    private hooks: Record<string, Record<string, Function[]>> = {};
    private eventBus: EventBus;

    constructor(
        @inject(EventBus) eventBus: EventBus
    ) {
        super();
        this.prisma = global.prisma;
        this.eventBus = eventBus;
    }

    async executeOperation(
        modelName: string,
        operation: 'create' | 'read' | 'update' | 'delete' | 'count',
        data?: any,
        filter?: any,
        include?: string[],
        pagination?: { page: number, limit: number },
        user?: any,
        relationParams?: {
            parentId?: number | string;
            relationName?: string;
        },
        module?: string,
        orderBy?: any
    ) {

        this.logger.debug(`[DslService] executeOperation called`, {
            modelName,
            operation,
            pagination,
            orderBy,
            filter
        });

        // 1. Check if model exists
        let model = registry.getModel(modelName, module);

        // Fallback: if model not found directly, try to find plugin model by name
        // Example: CrmContact → crm.CrmContact
        if (!model && !modelName.includes('.')) {
            const allModels = registry.getAllModels();
            const matchingModel = allModels.find(m => m.name === modelName);
            if (matchingModel) {
                this.logger.debug(`[DslService] Found plugin model: ${matchingModel.module}.${modelName}`);
                model = matchingModel;
            }
        }

        if (!model) {
            const errorMsg = module
                ? `Model ${modelName} (module: ${module}) not found`
                : `Model ${modelName} not found`;
            this.logger.error(`[DslService] Model lookup failed: ${errorMsg}`);
            return { error: { message: errorMsg, code: 'MODEL_NOT_FOUND' } };
        }

        // 1.5. Apply ownership filtering if configured
        if (operation === 'read' && model.ownership?.autoFilter) {
            filter = this.applyOwnershipFilter(model, filter, user, operation);
        }

        // 2. Check access permissions using CASL
        const accessResult = await this.validateModelAccess(model, operation, data, filter, user);
        if (accessResult.error) {
            return accessResult;
        }

        // 3. Apply "before" hooks with metadata (filter, operation, user)
        const processedData = await this.applyHooks(
            modelName,
            `before${operation.charAt(0).toUpperCase() + operation.slice(1)}`,
            data,
            {
                filter,
                operation,
                user
            }
        );

        // 4. Handle relationships and prepare data
        let manyToManyRelations = {};
        let preparedData = processedData || {};
        const updatedFields = preparedData ? Object.keys(preparedData) : [];

        // Extract many-to-many relations from data
        if (operation === 'create' || operation === 'update') {
            const modelDef = registry.getModel(modelName, module);

            if (modelDef?.relations) {
                for (const relation of modelDef.relations) {
                    // Check if it's many-to-many and data is provided
                    if (relation.type === 'manyToMany' && preparedData[relation.name]) {
                        // Store relations for processing
                        manyToManyRelations[relation.name] = preparedData[relation.name];
                        // Remove from main data
                        delete preparedData[relation.name];
                    }
                }
            }
        }

        // 5. Handle timestamp and audit fields
        if (operation === 'create') {
            // Remove timestamp fields with null values
            if (preparedData.createdAt === null) delete preparedData.createdAt;
            if (preparedData.updatedAt === null) delete preparedData.updatedAt;

            // Add audit information using camelCase (for Prisma)
            if (user && user.id) {
                preparedData.createdBy = user.id;
                preparedData.updatedBy = user.id;
            }
        } else if (operation === 'update') {

            model?.relations?.forEach(relation => {
                // We only care about belongsTo relations here
                if (relation.type === 'belongsTo') {
                    // By convention, the foreign key is the relation name + 'Id' (e.g., 'ogImage' -> 'ogImageId')
                    const foreignKeyName = relation.name + 'Id';

                    // Check if the update data contains a value for this foreign key
                    if (preparedData[foreignKeyName] !== undefined) {
                        const foreignKeyValue = preparedData[foreignKeyName];

                        if (foreignKeyValue === null) {
                            // If the ID is null, we need to disconnect the relation
                            preparedData[relation.name] = { disconnect: true };
                        } else {
                            // If there's an ID, we need to connect the relation
                            preparedData[relation.name] = { connect: { id: foreignKeyValue } };
                        }

                        // IMPORTANT: Remove the original foreign key field (e.g., 'ogImageId') 
                        // as Prisma will now use the relation object we just created.
                        delete preparedData[foreignKeyName];
                    }
                }
            });
            // For updates, only handle updatedAt and updatedBy
            if (preparedData.updatedAt === null) delete preparedData.updatedAt;

            // Remove fields that shouldn't be updated
            if (preparedData.id) delete preparedData.id;
            if (typeof preparedData.type === 'string' || preparedData.type === null) {
                delete preparedData.type;
            }

            if (user && user.id) {
                preparedData.updatedBy = user.id;
            }
        }

        // Filter unknown fields based on model schema
        if (operation === 'create' || operation === 'update') {
            const allowedFields = model?.fields?.map(f => f.name) || [];
            const originalKeys = Object.keys(preparedData);
            const filteredData = {};

            for (const [key, value] of Object.entries(preparedData)) {
                if (allowedFields.includes(key)) {
                    filteredData[key] = value;
                }
            }

            const filteredOutKeys = originalKeys.filter(key => !allowedFields.includes(key));

            this.logger.warn('[DslService] Model fields:', model?.fields?.map(f => f.name));
            this.logger.warn('[DslService] Original data keys:', originalKeys);
            this.logger.warn('[DslService] Filtered out fields:', filteredOutKeys);

            preparedData = filteredData;
            this.logger.debug('[DslService] Final preparedData:', preparedData);
        }

        // 6. Execute operation
        let result;
        try {
            const camelCaseModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
            const paginationObject = this.buildPaginationObject(pagination);


            switch (operation) {
                case 'create':
                    result = await this.prisma[camelCaseModelName].create({
                        data: preparedData
                    });
                    break;
                case 'read':
                    if (filter === undefined && data && typeof data === 'object' && (data.id !== undefined && data.id !== null)) {
                        // Handle findUnique by ID
                        result = await this.prisma[camelCaseModelName].findUnique({
                            where: { id: parseInt(data.id) },
                            include: this.buildIncludeObject(include, model)
                        });
                    } else {
                        // Check if pagination is requested
                        const shouldIncludeCount = pagination && (pagination.page || pagination.limit);

                        if (shouldIncludeCount) {
                            // Return data with count for pagination
                            const [data, total] = await Promise.all([
                                this.prisma[camelCaseModelName].findMany({
                                    where: filter,
                                    include: this.buildIncludeObject(include, model),
                                    orderBy: orderBy || { createdAt: 'desc' },
                                    ...paginationObject
                                }),
                                this.prisma[camelCaseModelName].count({ where: filter })
                            ]);

                            result = {
                                data,
                                paginationMeta: {
                                    total,
                                    currentPage: pagination?.page || 1,
                                    limit: pagination?.limit || 20,
                                    totalPages: Math.ceil(total / (pagination?.limit || 20)),
                                    hasMore: (pagination?.page || 1) < Math.ceil(total / (pagination?.limit || 20))
                                }
                            };
                        } else {
                            // Regular findMany without count
                            result = await this.prisma[camelCaseModelName].findMany({
                                where: filter,
                                include: this.buildIncludeObject(include, model),
                                orderBy: orderBy || { createdAt: 'desc' },
                                ...paginationObject
                            });
                        }
                    }
                    break;
                case 'count':
                    result = await this.prisma[camelCaseModelName].count({
                        where: filter
                    });
                    break;

                case 'update':
                    result = await this.prisma[camelCaseModelName].update({
                        where: filter,
                        data: preparedData
                    });

                    (result as any).__updatedFields = Object.keys(preparedData);
                    break;

                case 'delete':
                    let whereClauseForDelete = filter;
                    if (!whereClauseForDelete && data && data.id !== undefined) {

                        const idField = model.fields.find(f => f.primaryKey);
                        let idValue;

                        if (idField?.type === 'string') {
                            idValue = data.id;
                        } else {
                            idValue = typeof data.id === 'string' ? parseInt(data.id, 10) : data.id;
                            if (isNaN(idValue)) {
                                return { error: { message: `Invalid ID format for delete on ${modelName}`, code: 'INVALID_INPUT' } };
                            }
                        }

                        whereClauseForDelete = { id: idValue };
                    }

                    if (!whereClauseForDelete) {
                        return { error: { message: `Missing identifier for delete on ${modelName}`, code: 'INVALID_INPUT' } };
                    }

                    result = await this.prisma[camelCaseModelName].delete({
                        where: whereClauseForDelete
                    });
                    break;
            }

        } catch (error: any) {
            this.logger.error(`[DslService executeOperation] Prisma error during ${operation} on ${modelName}`, { error });

            let errorMessage = error.message || 'Operation failed';
            if (error.meta?.message) {
                errorMessage = error.meta.message;
            }

            this.logger.error(`[DslService] Prisma error details:`, {
                code: error.code,
                message: errorMessage,
                meta: error.meta
            });
            const customError = new Error(errorMessage) as any;
            customError.code = error.code || 'PRISMA_ERROR';
            throw customError;
        }

        // 6.5. Handle many-to-many relationships
        if (Object.keys(manyToManyRelations).length > 0 && result?.id) {
            await this.handleManyToManyRelations(
                modelName,
                result.id,
                manyToManyRelations,
                model,
                user
            );

            // Reload with relations using safe include
            const includeObj: any = {};

            for (const relationName of Object.keys(manyToManyRelations)) {
                // Only include if not conflicting with scalar fields
                const scalarFields = model.fields?.map(f => f.name) || [];
                if (!scalarFields.includes(relationName)) {
                    includeObj[relationName] = true;
                }
            }

            if (Object.keys(includeObj).length > 0) {
                const camelCaseModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
                try {
                    result = await this.prisma[camelCaseModelName].findUnique({
                        where: { id: result.id },
                        include: includeObj
                    });
                } catch (includeError: any) {
                    // If include fails, return result without relations
                    this.logger.warn(`Could not include relations after update: ${includeError.message}`);
                }
            }
        }

        // 7. Apply "after" hooks
        const finalResult = await this.applyHooks(
            modelName,
            `after${operation.charAt(0).toUpperCase() + operation.slice(1)}`,
            result
        );

        // 8. Emit events if configured in model
        this.emitModelEvent(model, operation, finalResult, user);

        // 9. Transform Prisma result for many-to-many relations
        const transformedResult = this.transformPrismaResult(finalResult, model);

        return { data: transformedResult };
    }

    /**
     * Emit event via EventBus if model has events configured
     * Fire-and-forget, non-blocking
     */
    private emitModelEvent(
        model: any,
        operation: 'create' | 'read' | 'update' | 'delete' | 'count',
        record: any,
        user?: any
    ): void {
        if (!model.events) return;

        const eventMap: Record<string, string | undefined> = {
            create: model.events.afterCreate,
            update: model.events.afterUpdate,
            delete: model.events.afterDelete
        };

        const eventName = eventMap[operation];
        if (!eventName) return;

        const payload = {
            record,
            modelName: model.name,
            module: model.module,
            userId: user?.id,
            timestamp: new Date().toISOString()
        };

        this.logger.info(`[DslService] Emitting event: ${eventName}`, {
            modelName: model.name,
            operation,
            recordId: record?.id
        });

        // Fire and forget - don't wait for handlers
        this.eventBus.emit(eventName, payload);
    }

    private hasJsonFilters(filter: any): boolean {
        return Object.values(filter).some(value =>
            value && typeof value === 'object' &&
            ('string_contains' in value || 'path' in value)
        );
    }

    private transformJsonFilters(filter: any): any {
        const transformed = { ...filter };

        for (const [key, value] of Object.entries(filter)) {
            if (value && typeof value === 'object' && 'string_contains' in value) {
                // MySQL JSON search
                transformed[key] = {
                    path: '$',
                    string_contains: value.string_contains
                };
            }
        }

        return transformed;
    }

    private buildManyToManyInclude(relationField: DslRelation, junctionModel: any): any {
        const targetRelation = junctionModel?.relations?.find(rel =>
            rel.target === relationField.target && rel.type === 'belongsTo'
        );

        if (!targetRelation) return true;

        return {
            include: { [targetRelation.name]: true }
        };
    }

    private transformManyToManyRelation(result: any, relation: DslRelation): void {
        if (!result[relation.name]?.length || !relation.through) return;

        const firstItem = result[relation.name][0];
        const junctionModel = registry.getModel(relation.through.model);
        const targetRelation = junctionModel?.relations?.find(rel =>
            rel.target === relation.target && rel.type === 'belongsTo'
        );

        if (targetRelation && firstItem[targetRelation.name]) {
            result[relation.name] = result[relation.name].map(
                junctionRecord => junctionRecord[targetRelation.name]
            );
        }
    }
    /**
 * Build simple include object for flat relations
 * DSL:    ['conversation']
 * Prisma: { conversation: true }
 * SQL:    JOIN conversations
 * 
 * DSL:    ['conversation', 'channel']
 * Prisma: { conversation: true, channel: true }
 * SQL:    JOIN conversations + JOIN channels
 * 
 * DSL:    ['tags'] (many-to-many)
 * Prisma: { tags: { include: { tag: true } } }
 * SQL:    JOIN junction_table + JOIN tags
 */
    private buildSimpleInclude(include?: string[], model?: any): object | undefined {
        if (!include?.length) return undefined;

        const includeObj: any = {};
        const scalarFields = model?.fields?.map(f => f.name) || [];

        include.forEach(relationName => {
            if (scalarFields.includes(relationName)) return;

            const relationField = model?.relations?.find(r => r.name === relationName);
            if (!relationField) return;

            if (relationField.type === 'manyToMany' && relationField.through) {
                const junctionModel = registry.getModel(relationField.through.model);
                includeObj[relationName] = this.buildManyToManyInclude(relationField, junctionModel);
            } else {
                includeObj[relationName] = true;
            }
        });

        return Object.keys(includeObj).length > 0 ? includeObj : undefined;
    }

    /**
     * Build nested include object with dot notation support
     * DSL:    ['conversation.contact']
     * Prisma: { conversation: { include: { contact: true } } }
     * SQL:    JOIN conversations JOIN contacts
     * 
     * DSL:    ['order.customer.address']
     * Prisma: { order: { include: { customer: { include: { address: true } } } } }
     * SQL:    JOIN orders JOIN customers JOIN addresses
     * 
     * DSL:    ['posts.author', 'posts.tags']
     * Prisma: { posts: { include: { author: true, tags: true } } }
     * SQL:    JOIN posts JOIN authors JOIN tags
     */
    private buildIncludeObject(include?: string[], model?: any): object | undefined {
        if (!include?.length) return undefined;

        const includeObj: any = {};
        const scalarFields = model?.fields?.map(f => f.name) || [];

        include.forEach(relationPath => {
            if (scalarFields.includes(relationPath)) return;

            // Support nested paths like 'conversation.contact'
            const pathParts = relationPath.split('.');
            let currentInclude = includeObj;
            let currentModel = model;

            for (let i = 0; i < pathParts.length; i++) {
                const relationName = pathParts[i];
                const relationField = currentModel?.relations?.find(r => r.name === relationName);

                if (!relationField) {
                    this.logger.warn(`Relation ${relationName} not found in model ${currentModel?.name}` , { className: 'DslService', methodName: 'buildIncludeObject' });
                    break;
                }

                // If this is the last part of the path
                if (i === pathParts.length - 1) {
                    if (relationField.type === 'manyToMany' && relationField.through) {
                        const junctionModel = registry.getModel(relationField.through.model);
                        currentInclude[relationName] = this.buildManyToManyInclude(relationField, junctionModel);
                    } else {
                        currentInclude[relationName] = true;
                    }
                } else {
                    // Create intermediate include object
                    if (!currentInclude[relationName]) {
                        currentInclude[relationName] = { include: {} };
                    } else if (currentInclude[relationName] === true) {
                        currentInclude[relationName] = { include: {} };
                    } else if (!currentInclude[relationName].include) {
                        currentInclude[relationName].include = {};
                    }

                    currentInclude = currentInclude[relationName].include;

                    // Get model for next level
                    currentModel = registry.getModel(relationField.target, relationField.module);
                }
            }
        });

        return Object.keys(includeObj).length > 0 ? includeObj : undefined;
    }

    private transformPrismaResult(result: any, model?: any): any {
        if (!result || !model?.relations) return result;

        model.relations.forEach(relation => {
            if (relation.type === 'manyToMany') {
                this.transformManyToManyRelation(result, relation);
            }
        });

        return result;
    }

    /**
     * Register hook for model operation
     */
    registerHook(
        modelName: string,
        hookName: string,
        handler: Function
    ): void {
        if (!this.hooks[modelName]) {
            this.hooks[modelName] = {};
        }

        if (!this.hooks[modelName][hookName]) {
            this.hooks[modelName][hookName] = [];
        }

        this.hooks[modelName][hookName].push(handler);

        this.logger.debug(`[DslService] Registered hook ${hookName} for model ${modelName}`);
    }

    /**
     * Apply hooks to data
     * @param metadata - Optional metadata (filter, operation, user) passed to hooks via context
     */
    private async applyHooks(
        modelName: string,
        hookName: string,
        data: any,
        metadata?: {
            filter?: any;
            operation?: string;
            user?: any;
        }
    ): Promise<any> {
        let result = data;


        this.logger.debug(`[DslService] Hooks for hook "${hookName}" on model "${modelName}":`, this.hooks[modelName]?.[hookName]);

        // If no hooks registered, return original data
        if (!this.hooks[modelName] || !this.hooks[modelName][hookName] || this.hooks[modelName][hookName].length === 0) {
            this.logger.debug(`[DslService] No hooks registered or found for model "${modelName}" and hook "${hookName}".`);
            return result;
        }

        // Apply each hook in sequence
        for (const hook of this.hooks[modelName][hookName]) {
            try {
                this.logger.debug(`[DslService] Executing hook ${hookName} for model ${modelName}`, {
                    data: result,
                    hasMetadata: !!metadata,
                    filter: metadata?.filter
                });
                // Pass metadata as second parameter - will be injected into context by wrapper
                result = await hook(result, metadata);
                this.logger.debug(`[DslService] Hook ${hookName} for model ${modelName} executed successfully.`);
            } catch (error) {
                this.logger.error(`[DslService] Error in hook ${hookName} for model ${modelName}`, { error });
                throw error;
            }
        }

        return result;
    }
    /**
     * Validate model access permissions using CASL
     */
    private async validateModelAccess(
        model: any,
        operation: 'create' | 'read' | 'update' | 'delete' | 'count',
        data?: any,
        filter?: any,
        user?: any
    ): Promise<{ error?: { message: string, code: string } }> {
        // If no access control defined, require authentication by default
        if (!model.access) {
            if (!user) {
                return {
                    error: {
                        message: 'Authentication required',
                        code: 'UNAUTHORIZED'
                    }
                };
            }
            return {}; // Allow any authenticated user
        }

        // Check for anonymous access
        const allowedRoles = model.access[operation] || [];
        const allowsAnonymous = allowedRoles.includes('anonymous');

        this.logger.info('[DslService.validateModelAccess] DEBUG - Anonymous check', {
            modelName: model.name,
            operation,
            hasUser: !!user,
            user: user,
            allowedRoles,
            allowsAnonymous,
            willBypassToAnonymous: !user && allowsAnonymous,
            willDenyUnauthorized: !user && !allowsAnonymous
        });

        // If no user but anonymous allowed, apply security checks
        if (!user && allowsAnonymous) {
            this.logger.info('[DslService.validateModelAccess] Using validateAnonymousAccess');
            return this.validateAnonymousAccess(model, operation, data);
        }

        // If no user and not anonymous allowed, deny
        if (!user) {
            this.logger.warn('[DslService.validateModelAccess] No user and anonymous not allowed');
            return {
                error: {
                    message: 'Authentication required',
                    code: 'UNAUTHORIZED'
                }
            };
        }

        // Standard CASL validation for authenticated users
        this.logger.info('[DslService] PERMISSION CHECK - User data', {
            userId: user.id,
            userRole: user.role,
            hasAbilityRules: !!user.abilityRules,
            abilityRules: user.abilityRules,
            userRoles: user.roles,
            modelName: model.name,
            operation
        });

        const ability = this.defineAbilityFor(user, model);
        const action = this.mapOperationToAction(operation);
        const subjectData = operation === 'create' ? data : filter;
        const subjectType = model.name;

        this.logger.info('[DslService] PERMISSION CHECK - Checking ability', {
            action,
            subjectType,
            canPerform: ability.can(action, subject(subjectType, subjectData || {})),
            abilityRules: ability.rules
        });

        if (!ability.can(action, subject(subjectType, subjectData || {}))) {
            this.logger.error('[DslService] PERMISSION DENIED', {
                action,
                subjectType,
                userId: user.id,
                abilityRules: ability.rules
            });
            return {
                error: {
                    message: `You are not allowed to ${action} ${subjectType}`,
                    code: 'FORBIDDEN'
                }
            };
        }

        this.logger.info('[DslService] PERMISSION GRANTED', { action, subjectType, userId: user.id });
        return {};
    }

    /**
     * Validate anonymous access with security restrictions
     */
    private validateAnonymousAccess(
        model: any,
        operation: string,
        data?: any
    ): { error?: { message: string, code: string } } {
        // Only allow create and read operation for anonymous

        if (operation !== 'create' && operation !== 'read') {
            return {
                error: {
                    message: 'Anonymous access only allowed for create and read operations',
                    code: 'FORBIDDEN'
                }
            };
        }

        if (operation === 'read') {
            return {}; // Allow read without additional checks
        }

        // Validate data size (prevent large payloads)
        const dataSize = JSON.stringify(data || {}).length;
        if (dataSize > 50000) { // 50KB limit
            return {
                error: {
                    message: 'Data payload too large',
                    code: 'PAYLOAD_TOO_LARGE'
                }
            };
        }

        // Sanitize data
        const sanitizedData = this.sanitizeAnonymousData(data);
        if (!sanitizedData.isValid) {
            return {
                error: {
                    message: sanitizedData.error || 'Invalid data format',
                    code: 'INVALID_DATA'
                }
            };
        }

        return {};
    }

    /**
     * Sanitize data for anonymous operations
     */
    private sanitizeAnonymousData(data: any): { isValid: boolean; error?: string } {
        if (!data || typeof data !== 'object') {
            return { isValid: false, error: 'Data must be an object' };
        }

        // Check for suspicious patterns
        const dataStr = JSON.stringify(data).toLowerCase();
        const suspiciousPatterns = [
            '<script', 'javascript:', 'onerror=', 'onload=',
            'eval(', 'function(', '=>', 'document.',
            'window.', 'alert(', 'confirm('
        ];

        for (const pattern of suspiciousPatterns) {
            if (dataStr.includes(pattern)) {
                return { isValid: false, error: 'Suspicious content detected' };
            }
        }

        // Validate string fields length
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string' && value.length > 5000) {
                return { isValid: false, error: `Field ${key} too long` };
            }
        }

        return { isValid: true };
    }
    /**
     * Define CASL ability for a user
     */
    private defineAbilityFor(user: any, model: any): Ability {
        const { can, cannot, build } = new AbilityBuilder(Ability);

        // Get user roles
        const userRoles = user.roles || [];

        this.logger.info('[DslService.defineAbilityFor] DEBUG - Starting', {
            modelName: model.name,
            userId: user?.id,
            userRoles,
            modelAccess: model.access
        });

        // Track which actions have been granted
        const grantedActions = new Set<string>();
        const deniedActions = new Set<string>();

        // Define abilities based on model.access
        if (model.access) {
            // First pass: add all 'can' permissions
            for (const [operation, roles] of Object.entries(model.access)) {
                const action = this.mapOperationToAction(operation as any);
                const hasRole = (roles as string[]).some(role => userRoles.includes(role));

                this.logger.info('[DslService.defineAbilityFor] DEBUG - Processing operation (pass 1)', {
                    operation,
                    action,
                    requiredRoles: roles,
                    userRoles,
                    hasRole,
                    willAdd: hasRole ? 'can' : 'skip'
                });

                if (hasRole) {
                    can(action, model.name);
                    grantedActions.add(action);
                }
            }

            // Second pass: add 'cannot' only for actions that weren't granted
            for (const [operation, roles] of Object.entries(model.access)) {
                const action = this.mapOperationToAction(operation as any);
                const hasRole = (roles as string[]).some(role => userRoles.includes(role));

                if (!hasRole && !grantedActions.has(action)) {
                    this.logger.info('[DslService.defineAbilityFor] DEBUG - Processing operation (pass 2)', {
                        operation,
                        action,
                        requiredRoles: roles,
                        userRoles,
                        hasRole,
                        willAdd: 'cannot'
                    });

                    cannot(action, model.name);
                    deniedActions.add(action);
                } else if (!hasRole && grantedActions.has(action)) {
                    this.logger.info('[DslService.defineAbilityFor] DEBUG - Skipping cannot (already granted)', {
                        operation,
                        action,
                        requiredRoles: roles,
                        alreadyGranted: true
                    });
                }
            }
        }

        const ability = build();

        this.logger.info('[DslService.defineAbilityFor] DEBUG - Final rules', {
            modelName: model.name,
            rulesCount: ability.rules.length,
            grantedActions: Array.from(grantedActions),
            deniedActions: Array.from(deniedActions),
            rules: ability.rules
        });

        return ability;
    }

    /**
     * Map DSL operation to CASL action
     */
    private mapOperationToAction(operation: 'create' | 'read' | 'update' | 'delete' | 'count'): string {
        switch (operation) {
            case 'create': return 'create';
            case 'read': return 'read';
            case 'update': return 'update';
            case 'delete': return 'delete';
            case 'count': return 'read'; // Count is similar to read operation
            default: return operation;
        }
    }

    /**
     * Build pagination object for Prisma
     */
    private buildPaginationObject(pagination?: { page?: number, limit?: number, orderBy?: any }): object {

        this.logger.debug(`[DslService] buildPaginationObject called`, { pagination });


        const result: any = {};

        if (pagination?.orderBy) {
            result.orderBy = pagination.orderBy;
        }

        if (pagination?.limit) {
            const page = pagination.page || 1;
            result.skip = (page - 1) * pagination.limit;
            result.take = pagination.limit;
        }

        return result;
    }



    private async handleManyToManyRelations(
        modelName: string,
        recordId: number,
        relations: Record<string, any[]>,
        modelDef: any,
        user?: any
    ): Promise<void> {

        await this.handleManyToManyRelationsManual(modelName, recordId, relations, modelDef, user);
    }
    /**
     * Manual fallback for many-to-many relationships through junction tables
     * Used when Prisma schema doesn't have proper relation definitions
     */
    private async handleManyToManyRelationsManual(
        modelName: string,
        recordId: number,
        relations: Record<string, any[]>,
        modelDef: any,
        user?: any
    ): Promise<void> {
        for (const [relationName, relationData] of Object.entries(relations)) {
            const relationDef = modelDef.relations?.find(r => r.name === relationName);
            if (!relationDef || relationDef.type !== 'manyToMany') {
                continue;
            }

            // Check if junction table configuration exists
            if (!relationDef.through) {
                this.logger.warn(`Missing 'through' configuration for ${relationName} relation`);
                continue;
            }

            const { model: junctionModel, sourceKey, targetKey } = relationDef.through;
            const junctionTableName = junctionModel.charAt(0).toLowerCase() + junctionModel.slice(1);

            try {
                // 1. Delete existing relations
                await this.prisma[junctionTableName].deleteMany({
                    where: { [sourceKey]: recordId }
                });

                // 2. Create new relations
                if (Array.isArray(relationData) && relationData.length > 0) {
                    const junctionRecords = relationData.map(item => ({
                        [sourceKey]: recordId,
                        [targetKey]: typeof item === 'object' ? item.id : item,
                        createdBy: user?.id,
                        updatedBy: user?.id,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }));

                    await this.prisma[junctionTableName].createMany({
                        data: junctionRecords,
                        skipDuplicates: true
                    });
                }

            } catch (error: any) {
                this.logger.error(`Failed to update ${relationName} relations`, {
                    error,
                    modelName,
                    recordId,
                    junctionModel
                });
                throw new Error(`Failed to update ${relationName} relations: ${error.message}`);
            }
        }
    }

    /**
     * Apply ownership filter to ensure users only see their own resources
     */
    private applyOwnershipFilter(model: any, filter: any, user: any, operation: string): any {
        const ownership = model.ownership;

        if (!ownership || !ownership.autoFilter) {
            return filter;
        }

        // Check if operation is in allowed operations
        const allowedOps = ownership.operations || ['read', 'update', 'delete'];
        if (!allowedOps.includes(operation)) {
            return filter;
        }

        // Admin bypass check
        if (ownership.adminBypass !== false && user?.role === 'admin') {
            this.logger.debug('[DslService.applyOwnershipFilter] Admin bypass enabled', {
                model: model.name,
                userId: user.id
            });
            return filter;
        }

        // User must be authenticated
        if (!user || !user.id) {
            this.logger.warn('[DslService.applyOwnershipFilter] Authentication required', {
                model: model.name
            });
            throw new Error('Authentication required for ownership-filtered models');
        }

        // Auto-inject ownership filter
        const ownershipFilter = {
            [ownership.field]: user.id
        };

        // Merge with existing filter
        const mergedFilter = filter ? { ...filter, ...ownershipFilter } : ownershipFilter;

        this.logger.debug('[DslService.applyOwnershipFilter] Applied ownership filter', {
            model: model.name,
            field: ownership.field,
            userId: user.id,
            originalFilter: filter,
            mergedFilter
        });

        return mergedFilter;
    }

}
