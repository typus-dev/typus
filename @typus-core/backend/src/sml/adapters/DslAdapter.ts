/**
 * DSL Adapter for SML
 *
 * Registers all DSL models as SML operations under data.models.*
 */

import { SML, FieldSchema } from '@typus-core/shared/sml';
import { registry } from '../../dsl/registry-adapter.js';
import { container } from 'tsyringe';
import { DslService } from '../../dsl/services/DslService.js';
import { Logger } from '../../core/logger/Logger.js';

const logger = new Logger();
const OWNER = 'core:dsl';

/**
 * Register all DSL models as SML operations.
 */
export async function registerDslOperations(): Promise<void> {
  const models = registry.getAllModels();
  logger.debug(`[SML:DslAdapter] Registering ${models.length} models`);

  for (const model of models) {
    const name = model.name;

    // Build field schema from model definition
    const fields = buildFieldSchema(model);

    // findMany - internal (use actions.* for public API)
    SML.register(`data.models.${name}.findMany`, {
      handler: async (params, ctx) => {
        const dslService = container.resolve(DslService);
        return dslService.executeOperation(
          name,
          'read',
          undefined,
          params?.where,
          params?.include,
          params?.pagination,
          ctx?.user
        );
      },
      schema: {
        description: `Find multiple ${name} records`,
        params: {
          where: { type: 'object', description: 'Filter conditions' },
          include: { type: 'array', description: 'Relations to include' },
          pagination: { type: 'object', description: '{ page, limit }' }
        },
        returns: { type: `${name}[]`, fields }
      }
    }, { owner: OWNER, visibility: 'internal' });

    // findOne - internal
    SML.register(`data.models.${name}.findOne`, {
      handler: async (params, ctx) => {
        const dslService = container.resolve(DslService);
        return dslService.executeOperation(
          name,
          'read',
          undefined,
          { id: params.id },
          params?.include,
          undefined,
          ctx?.user
        );
      },
      schema: {
        description: `Find one ${name} by id`,
        params: {
          id: { type: 'number', required: true },
          include: { type: 'array', description: 'Relations to include' }
        },
        returns: { type: name, fields }
      }
    }, { owner: OWNER, visibility: 'internal' });

    // create - internal
    SML.register(`data.models.${name}.create`, {
      handler: async (params, ctx) => {
        const dslService = container.resolve(DslService);
        return dslService.executeOperation(
          name,
          'create',
          params.data,
          undefined,
          undefined,
          undefined,
          ctx?.user
        );
      },
      schema: {
        description: `Create a new ${name}`,
        params: {
          data: { type: 'object', required: true, description: 'Record data' }
        },
        returns: { type: name, fields }
      }
    }, { owner: OWNER, visibility: 'internal' });

    // update - internal
    SML.register(`data.models.${name}.update`, {
      handler: async (params, ctx) => {
        const dslService = container.resolve(DslService);
        return dslService.executeOperation(
          name,
          'update',
          params.data,
          { id: params.id },
          undefined,
          undefined,
          ctx?.user
        );
      },
      schema: {
        description: `Update ${name} by id`,
        params: {
          id: { type: 'number', required: true },
          data: { type: 'object', required: true, description: 'Fields to update' }
        },
        returns: { type: name, fields }
      }
    }, { owner: OWNER, visibility: 'internal' });

    // delete
    SML.register(`data.models.${name}.delete`, {
      handler: async (params, ctx) => {
        const dslService = container.resolve(DslService);
        return dslService.executeOperation(
          name,
          'delete',
          undefined,
          { id: params.id },
          undefined,
          undefined,
          ctx?.user
        );
      },
      schema: {
        description: `Delete ${name} by id`,
        params: {
          id: { type: 'number', required: true }
        },
        returns: { type: 'boolean' }
      }
    }, { owner: OWNER, visibility: 'admin' });

    // count - internal
    SML.register(`data.models.${name}.count`, {
      handler: async (params, ctx) => {
        const dslService = container.resolve(DslService);
        return dslService.executeOperation(
          name,
          'count',
          undefined,
          params?.where,
          undefined,
          undefined,
          ctx?.user
        );
      },
      schema: {
        description: `Count ${name} records`,
        params: {
          where: { type: 'object', description: 'Filter conditions' }
        },
        returns: { type: 'number' }
      }
    }, { owner: OWNER, visibility: 'internal' });
  }

  logger.info(`[SML:DslAdapter] Registered ${models.length * 6} operations for ${models.length} models`);
}

/**
 * Build FieldSchema from DSL model definition.
 */
function buildFieldSchema(model: any): Record<string, FieldSchema> {
  const fields: Record<string, FieldSchema> = {};

  if (model.fields) {
    for (const [fieldName, fieldDef] of Object.entries(model.fields)) {
      const def = fieldDef as any;
      fields[fieldName] = {
        type: mapDslType(def.type),
        required: def.required ?? false,
        nullable: def.nullable ?? !def.required,
        unique: def.unique ?? false,
        primary: fieldName === 'id'
      };
    }
  }

  return fields;
}

/**
 * Map DSL field type to SML type.
 */
function mapDslType(dslType: string): string {
  const typeMap: Record<string, string> = {
    'string': 'string',
    'text': 'string',
    'int': 'number',
    'integer': 'number',
    'float': 'number',
    'decimal': 'number',
    'boolean': 'boolean',
    'bool': 'boolean',
    'datetime': 'Date',
    'date': 'Date',
    'json': 'object',
    'array': 'array'
  };

  return typeMap[dslType?.toLowerCase()] ?? 'string';
}
