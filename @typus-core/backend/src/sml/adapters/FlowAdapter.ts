/**
 * Flow Adapter for SML
 *
 * Registers workflow operations under flow.*
 * Provides workflow definition management and execution control.
 */

import { SML } from '@typus-core/shared/sml';
import { Logger } from '../../core/logger/Logger.js';

const logger = new Logger();
const OWNER = 'core:flow';

/**
 * Register flow operations in SML.
 */
export async function registerFlowOperations(): Promise<void> {
  logger.debug('[SML:FlowAdapter] Registering flow operations');

  let registeredCount = 0;

  // ==========================================================================
  // Workflow Definition Operations
  // ==========================================================================

  // flow.workflow.create - Create a new workflow
  SML.register('flow.workflow.create', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.name) {
        throw new Error('Workflow name is required');
      }

      const workflow = await prisma.workflowDefinition.create({
        data: {
          name: params.name,
          description: params.description,
          version: 1,
          blocks: params.blocks || {},
          connections: params.connections || {},
          status: 'draft',
          triggerType: params.triggerType || 'manual',
          triggerConfig: params.triggerConfig || {},
          tags: params.tags || [],
          isActive: false,
          createdBy: ctx?.user?.id || 0
        }
      });

      return {
        id: workflow.id,
        name: workflow.name,
        version: workflow.version,
        status: workflow.status
      };
    },
    schema: {
      description: 'Create a new workflow definition',
      params: {
        name: { type: 'string', required: true, description: 'Workflow name' },
        description: { type: 'string', description: 'Workflow description' },
        blocks: { type: 'object', description: 'Workflow blocks definition' },
        connections: { type: 'object', description: 'Block connections' },
        triggerType: { type: 'string', description: 'Trigger: manual, schedule, event, webhook' },
        triggerConfig: { type: 'object', description: 'Trigger configuration' },
        tags: { type: 'array', description: 'Tags for categorization' }
      },
      returns: {
        type: 'Workflow',
        fields: {
          id: { type: 'number', primary: true },
          name: { type: 'string', required: true },
          version: { type: 'number' },
          status: { type: 'string' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // flow.workflow.list - List workflows
  SML.register('flow.workflow.list', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const where: any = {};
      if (params.status) where.status = params.status;
      if (params.triggerType) where.triggerType = params.triggerType;
      if (params.isActive !== undefined) where.isActive = params.isActive;

      const workflows = await prisma.workflowDefinition.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: Math.min(params.limit || 20, 100),
        skip: params.offset || 0,
        select: {
          id: true,
          name: true,
          description: true,
          version: true,
          status: true,
          triggerType: true,
          isActive: true,
          tags: true,
          createdAt: true,
          updatedAt: true
        }
      });

      const total = await prisma.workflowDefinition.count({ where });

      return { items: workflows, total };
    },
    schema: {
      description: 'List workflow definitions',
      params: {
        status: { type: 'string', description: 'Filter by status: draft, published, archived' },
        triggerType: { type: 'string', description: 'Filter by trigger type' },
        isActive: { type: 'boolean', description: 'Filter by active status' },
        limit: { type: 'number', description: 'Max items (default 20)' },
        offset: { type: 'number', description: 'Skip items' }
      },
      returns: {
        type: 'WorkflowList',
        fields: {
          items: { type: 'Workflow[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // flow.workflow.get - Get workflow details
  SML.register('flow.workflow.get', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.id) {
        throw new Error('Workflow ID is required');
      }

      const workflow = await prisma.workflowDefinition.findUnique({
        where: { id: params.id }
      });

      if (!workflow) {
        return { found: false };
      }

      return {
        found: true,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          version: workflow.version,
          blocks: workflow.blocks,
          connections: workflow.connections,
          status: workflow.status,
          triggerType: workflow.triggerType,
          triggerConfig: workflow.triggerConfig,
          tags: workflow.tags,
          isActive: workflow.isActive,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt
        }
      };
    },
    schema: {
      description: 'Get workflow definition details',
      params: {
        id: { type: 'number', required: true, description: 'Workflow ID' }
      },
      returns: {
        type: 'WorkflowDetail',
        fields: {
          found: { type: 'boolean', required: true },
          workflow: { type: 'Workflow' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // flow.workflow.update - Update workflow
  SML.register('flow.workflow.update', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.id) {
        throw new Error('Workflow ID is required');
      }

      const data: any = {};
      if (params.name !== undefined) data.name = params.name;
      if (params.description !== undefined) data.description = params.description;
      if (params.blocks !== undefined) data.blocks = params.blocks;
      if (params.connections !== undefined) data.connections = params.connections;
      if (params.triggerType !== undefined) data.triggerType = params.triggerType;
      if (params.triggerConfig !== undefined) data.triggerConfig = params.triggerConfig;
      if (params.tags !== undefined) data.tags = params.tags;

      const workflow = await prisma.workflowDefinition.update({
        where: { id: params.id },
        data
      });

      return { id: workflow.id, name: workflow.name, version: workflow.version };
    },
    schema: {
      description: 'Update a workflow definition',
      params: {
        id: { type: 'number', required: true, description: 'Workflow ID' },
        name: { type: 'string', description: 'New name' },
        description: { type: 'string', description: 'New description' },
        blocks: { type: 'object', description: 'Updated blocks' },
        connections: { type: 'object', description: 'Updated connections' },
        triggerType: { type: 'string', description: 'New trigger type' },
        triggerConfig: { type: 'object', description: 'New trigger config' },
        tags: { type: 'array', description: 'New tags' }
      },
      returns: {
        type: 'Workflow',
        fields: {
          id: { type: 'number', primary: true },
          name: { type: 'string' },
          version: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // flow.workflow.publish - Publish a workflow
  SML.register('flow.workflow.publish', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.id) {
        throw new Error('Workflow ID is required');
      }

      const workflow = await prisma.workflowDefinition.update({
        where: { id: params.id },
        data: {
          status: 'published',
          isActive: true,
          publishedAt: new Date(),
          version: { increment: 1 }
        }
      });

      return {
        id: workflow.id,
        name: workflow.name,
        version: workflow.version,
        status: workflow.status,
        publishedAt: workflow.publishedAt
      };
    },
    schema: {
      description: 'Publish a workflow (makes it active)',
      params: {
        id: { type: 'number', required: true, description: 'Workflow ID' }
      },
      returns: {
        type: 'Workflow',
        fields: {
          id: { type: 'number', primary: true },
          name: { type: 'string' },
          version: { type: 'number' },
          status: { type: 'string' },
          publishedAt: { type: 'Date' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // ==========================================================================
  // Workflow Execution Operations
  // ==========================================================================

  // flow.execution.start - Start workflow execution
  SML.register('flow.execution.start', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.workflowId) {
        throw new Error('Workflow ID is required');
      }

      // Verify workflow exists and is active
      const workflow = await prisma.workflowDefinition.findUnique({
        where: { id: params.workflowId }
      });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      if (!workflow.isActive) {
        throw new Error('Workflow is not active');
      }

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: params.workflowId,
          status: 'running',
          progress: 0,
          context: params.context || {},
          triggerSource: params.triggerSource || 'manual',
          triggeredBy: ctx?.user?.id,
          startedAt: new Date(),
          retryCount: 0
        }
      });

      return {
        executionId: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        startedAt: execution.startedAt
      };
    },
    schema: {
      description: 'Start a workflow execution',
      params: {
        workflowId: { type: 'number', required: true, description: 'Workflow ID to execute' },
        context: { type: 'object', description: 'Initial context/variables' },
        triggerSource: { type: 'string', description: 'Source: manual, schedule, event, webhook' }
      },
      returns: {
        type: 'Execution',
        fields: {
          executionId: { type: 'number', primary: true },
          workflowId: { type: 'number' },
          status: { type: 'string' },
          startedAt: { type: 'Date' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // flow.execution.status - Get execution status
  SML.register('flow.execution.status', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.executionId) {
        throw new Error('Execution ID is required');
      }

      const execution = await prisma.workflowExecution.findUnique({
        where: { id: params.executionId },
        include: {
          workflow: {
            select: { name: true }
          }
        }
      });

      if (!execution) {
        return { found: false };
      }

      return {
        found: true,
        executionId: execution.id,
        workflowId: execution.workflowId,
        workflowName: execution.workflow?.name,
        status: execution.status,
        progress: execution.progress,
        currentBlocks: execution.currentBlocks,
        completedBlocks: execution.completedBlocks,
        error: execution.error,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt
      };
    },
    schema: {
      description: 'Get workflow execution status',
      params: {
        executionId: { type: 'number', required: true, description: 'Execution ID' }
      },
      returns: {
        type: 'ExecutionStatus',
        fields: {
          found: { type: 'boolean', required: true },
          executionId: { type: 'number' },
          workflowId: { type: 'number' },
          workflowName: { type: 'string' },
          status: { type: 'string' },
          progress: { type: 'number' },
          error: { type: 'string' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // flow.execution.list - List executions
  SML.register('flow.execution.list', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const where: any = {};
      if (params.workflowId) where.workflowId = params.workflowId;
      if (params.status) where.status = params.status;

      const executions = await prisma.workflowExecution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(params.limit || 20, 100),
        skip: params.offset || 0,
        include: {
          workflow: {
            select: { name: true }
          }
        }
      });

      const total = await prisma.workflowExecution.count({ where });

      return {
        items: executions.map(e => ({
          executionId: e.id,
          workflowId: e.workflowId,
          workflowName: e.workflow?.name,
          status: e.status,
          progress: e.progress,
          triggerSource: e.triggerSource,
          startedAt: e.startedAt,
          completedAt: e.completedAt
        })),
        total
      };
    },
    schema: {
      description: 'List workflow executions',
      params: {
        workflowId: { type: 'number', description: 'Filter by workflow' },
        status: { type: 'string', description: 'Filter by status: running, completed, failed, paused' },
        limit: { type: 'number', description: 'Max items (default 20)' },
        offset: { type: 'number', description: 'Skip items' }
      },
      returns: {
        type: 'ExecutionList',
        fields: {
          items: { type: 'Execution[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // flow.execution.cancel - Cancel execution
  SML.register('flow.execution.cancel', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.executionId) {
        throw new Error('Execution ID is required');
      }

      const execution = await prisma.workflowExecution.update({
        where: { id: params.executionId },
        data: {
          status: 'cancelled',
          completedAt: new Date()
        }
      });

      return {
        executionId: execution.id,
        status: execution.status,
        message: 'Execution cancelled'
      };
    },
    schema: {
      description: 'Cancel a running workflow execution',
      params: {
        executionId: { type: 'number', required: true, description: 'Execution ID to cancel' }
      },
      returns: {
        type: 'CancelResult',
        fields: {
          executionId: { type: 'number' },
          status: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  logger.info(`[SML:FlowAdapter] Registered ${registeredCount} flow operations`);
}
