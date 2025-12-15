/**
 * SML REST Controller
 *
 * Exposes SML registry via HTTP endpoints for AI and external clients.
 *
 * Endpoints:
 *   GET  /api/sml/meta          - Full registry metadata for AI discovery
 *   GET  /api/sml/list?path=    - List operations at path
 *   GET  /api/sml/describe?path=- Get operation schema
 *   POST /api/sml/execute       - Execute an operation
 */

import { Request, Response } from 'express';
import { SML } from '@typus-core/shared/sml';
import { SmlError, SmlErrorCode } from '@typus-core/shared/sml';
import { Logger } from '../../core/logger/Logger.js';

const logger = new Logger();

export class SmlController {
  /**
   * GET /api/sml/meta
   * Returns public registry metadata for AI discovery.
   * Query params:
   *   - includeAdmin=true  - Include admin-visibility operations
   *   - includeInternal=true - Include internal operations (for debugging)
   */
  async getMeta(req: Request, res: Response): Promise<void> {
    try {
      const includeAdmin = req.query.includeAdmin === 'true';
      const includeInternal = req.query.includeInternal === 'true';

      // Check if user is admin for includeInternal
      const isAdmin = (req as any).user?.roles?.includes('admin');

      // Use getPublicMeta() for AI discovery (hides internal/hidden)
      // Only show full meta if explicitly requested AND user is admin
      const meta = includeInternal && isAdmin
        ? SML.meta
        : SML.getPublicMeta(includeAdmin);

      // Count public operations only for stats
      const publicMeta = SML.getPublicMeta(true);
      const publicOperationCount = this.countOperationsInTree(publicMeta.tree);

      res.json({
        success: true,
        data: {
          domains: meta.domains,
          tree: meta.tree,
          models: meta.models,
          integrations: meta.integrations,
          events: meta.events,
          stats: {
            operations: SML.size,
            publicOperations: publicOperationCount,
            events: SML.eventCount,
            locked: SML.isLocked()
          }
        }
      });
    } catch (error) {
      logger.error('[SmlController] getMeta failed:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get SML metadata', code: 'INTERNAL_ERROR' }
      });
    }
  }

  /**
   * Count operations in a tree structure.
   */
  private countOperationsInTree(tree: any): number {
    if (!tree || typeof tree !== 'object') return 0;
    if (Array.isArray(tree)) return tree.length;

    let count = 0;
    for (const value of Object.values(tree)) {
      if (Array.isArray(value)) {
        count += value.length;
      } else if (typeof value === 'object') {
        count += this.countOperationsInTree(value);
      }
    }
    return count;
  }

  /**
   * GET /api/sml/list?path=
   * List operations/namespaces at the given path.
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const path = req.query.path as string | undefined;
      const children = SML.list(path);

      res.json({
        success: true,
        data: {
          path: path || '(root)',
          children
        }
      });
    } catch (error) {
      logger.error('[SmlController] list failed:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to list operations', code: 'INTERNAL_ERROR' }
      });
    }
  }

  /**
   * GET /api/sml/describe?path=
   * Get operation schema by path.
   */
  async describe(req: Request, res: Response): Promise<void> {
    try {
      const path = req.query.path as string;

      if (!path) {
        res.status(400).json({
          success: false,
          error: { message: 'Missing required parameter: path', code: 'VALIDATION' }
        });
        return;
      }

      // Check if it's an event
      const eventSchema = SML.describeEvent(path);
      if (eventSchema) {
        res.json({
          success: true,
          data: {
            path,
            type: 'event',
            schema: eventSchema
          }
        });
        return;
      }

      // Check if it's an operation
      const opSchema = SML.describe(path);
      if (opSchema) {
        const resolved = SML.resolve(path);
        res.json({
          success: true,
          data: {
            path,
            type: 'operation',
            schema: opSchema,
            owner: resolved?.owner,
            visibility: resolved?.visibility
          }
        });
        return;
      }

      // Check if it's a namespace
      if (SML.has(path)) {
        res.json({
          success: true,
          data: {
            path,
            type: 'namespace',
            children: SML.list(path)
          }
        });
        return;
      }

      res.status(404).json({
        success: false,
        error: { message: `Path not found: ${path}`, code: 'NOT_FOUND' }
      });
    } catch (error) {
      logger.error('[SmlController] describe failed:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to describe operation', code: 'INTERNAL_ERROR' }
      });
    }
  }

  /**
   * POST /api/sml/execute
   * Execute an operation.
   *
   * Body: { path: string, params?: object }
   */
  async execute(req: Request, res: Response): Promise<void> {
    const { path, params } = req.body;

    if (!path) {
      res.status(400).json({
        success: false,
        error: { message: 'Missing required field: path', code: 'VALIDATION' }
      });
      return;
    }

    try {
      // Build context from request
      const ctx = {
        traceId: req.headers['x-trace-id'] as string || `trace-${Date.now()}`,
        requestId: req.headers['x-request-id'] as string,
        user: (req as any).user,
        session: {
          id: (req as any).sessionID,
          ip: req.ip
        }
      };

      const result = await SML.execute(path, params, ctx);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof SmlError) {
        const statusMap: Record<SmlErrorCode, number> = {
          [SmlErrorCode.NOT_FOUND]: 404,
          [SmlErrorCode.VALIDATION]: 400,
          [SmlErrorCode.PERMISSION]: 403,
          [SmlErrorCode.EXECUTION]: 500,
          [SmlErrorCode.LOCKED]: 503,
          [SmlErrorCode.DUPLICATE]: 409
        };

        const status = statusMap[error.code] || 500;

        res.status(status).json({
          success: false,
          error: {
            message: error.message,
            code: error.code,
            path: error.path
          }
        });
        return;
      }

      logger.error('[SmlController] execute failed:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Execution failed', code: 'INTERNAL_ERROR' }
      });
    }
  }

  /**
   * GET /api/sml/resolve?path=
   * Resolve a path to full information.
   */
  async resolve(req: Request, res: Response): Promise<void> {
    try {
      const path = req.query.path as string;

      if (!path) {
        res.status(400).json({
          success: false,
          error: { message: 'Missing required parameter: path', code: 'VALIDATION' }
        });
        return;
      }

      const resolved = SML.resolve(path);

      if (!resolved) {
        res.status(404).json({
          success: false,
          error: { message: `Path not found: ${path}`, code: 'NOT_FOUND' }
        });
        return;
      }

      res.json({
        success: true,
        data: resolved
      });
    } catch (error) {
      logger.error('[SmlController] resolve failed:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to resolve path', code: 'INTERNAL_ERROR' }
      });
    }
  }
}
