/**
 * SML Routes
 *
 * Mounts SML controller endpoints at /api/sml/*
 */

import { Router } from 'express';
import { SmlController } from '../controllers/SmlController.js';

const router = Router();
const controller = new SmlController();

// Discovery endpoints (no auth required for AI discovery)
router.get('/meta', controller.getMeta.bind(controller));
router.get('/list', controller.list.bind(controller));
router.get('/describe', controller.describe.bind(controller));
router.get('/resolve', controller.resolve.bind(controller));

// Execution endpoint (auth may be required based on operation visibility)
router.post('/execute', controller.execute.bind(controller));

export default router;
