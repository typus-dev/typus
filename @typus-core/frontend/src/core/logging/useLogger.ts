// src/core/logging/useLogger.ts
import { logger } from './logger';
import type { Logger } from './types';

/**
 * Composable to access the centralized logger instance.
 */
export function useLogger(): Logger {
  return logger;
}
