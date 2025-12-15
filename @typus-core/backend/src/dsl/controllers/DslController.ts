import { Request, Response } from 'express';
import { BaseController } from '@/core/base/BaseController.js';
import { inject, container } from 'tsyringe';
import { Controller } from '@/core/decorators/component.js';
import { DslService } from '../services/DslService';
import { DslOperationRequest, DslOperationResponse } from '../types/index';
import { registry } from '../registry-adapter';
import { AbilityFactory } from '@/core/security/abilities/AbilityFactory.js';

/**
 * Controller for DSL operations
 */
@Controller({ path: 'dsl' })
export class DslController extends BaseController {
    constructor(
        @inject(DslService) private dslService: DslService
    ) {
        super();
    }

    /**
     * Get DSL registry
     * Returns registry methods for accessing models
     */
    async getRegistry(req: Request, res: Response) {
        this.logger.debug(`[DslController.getRegistry] Request received.`);
        const modelNames = registry.getModelNames(); // Log is inside adapter
        const allModels = registry.getAllModels(); // Log is inside adapter
        
        // Log the actual models retrieved (might be large)
        this.logger.debug(`[DslController.getRegistry] Registry getAllModels() returned ${allModels?.length} models.`); 
        
        // Note: Returning allModels might expose too much backend detail. 
        // Consider returning only necessary info like names and basic metadata.
        return {
            modelNames: modelNames, 
            models: allModels
        };
    }
    
    /**
     * Get model metadata
     * Returns metadata for a specific model
     */
    async getModelMetadata(req: Request, res: Response) {
        const modelName = req.params.modelName;
        
        this.logger.debug(`[DslController.getModelMetadata] Getting metadata for model: ${modelName}`);
        
        const model = registry.getModel(modelName);
        
        if (!model) {
            return this.notFound(res, 'Model not found');
        }
        
        return model;
    }
    
    /**
     * Handle DSL operation
     */
    async handleOperation(req: Request, res: Response) {
        const validatedData = this.getValidatedData(req);
        this.logger.debug(`[DslController.handleOperation] Received validated data:`, validatedData);

        // Inject CASL abilities if user is authenticated
        if (req.user && req.user.id) {
            try {
                const abilityFactory = container.resolve(AbilityFactory);
                req.user.ability = abilityFactory.defineAbilityFor(req.user);
                req.user.abilityRules = req.user.ability.rules;

                this.logger.debug('[DslController.handleOperation] CASL abilities injected', {
                    userId: req.user.id,
                    rulesCount: req.user.abilityRules?.length || 0
                });
            } catch (error) {
                this.logger.error('[DslController.handleOperation] Failed to inject CASL abilities', {
                    error: error.message,
                    userId: req.user.id
                });
                // Continue without abilities - let service handle authorization
            }
        }

        // Extract data from the body property if it exists (for the new schema structure)
        // or directly from validatedData if using the old structure
        const payload = validatedData.body || validatedData;
        const { model, module, operation, data, filter, include, pagination } = payload;

        // Extract relationship parameters from URL if present
        const relationParams = this.extractRelationParams(req);

        this.logger.debug(`[DslController.handleOperation] Processing operation: "${operation}" on model: "${model}"${module ? ` (module: "${module}")` : ''}`, {
            module,
            data,
            filter,
            include,
            pagination,
            relationParams,
            userId: req.user?.id,
            hasAbility: !!req.user?.ability
        });

        // Execute operation via service
        this.logger.debug(`[DslController.handleOperation] Calling dslService.executeOperation...`);
        return await this.dslService.executeOperation(
            model,
            operation,
            data,
            filter,
            include,
            pagination,
            req.user,
            relationParams,
            module // Pass module to service
        );
    }
    
    /**
     * Extract relationship parameters from request
     */
    private extractRelationParams(req: Request): { parentId?: string | number; relationName?: string } | undefined {
        const { id, relation } = req.params;
        
        if (!id || !relation) {
            return undefined;
        }
        
        return {
            parentId: isNaN(Number(id)) ? id : Number(id),
            relationName: relation
        };
    }
}
