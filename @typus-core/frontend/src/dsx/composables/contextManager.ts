// @Tags: DSX, ContextManagement
import type { BlockContext } from '../types'; // Using relative path
import { logger } from '@/core/logging/logger'; // Import logger

// Global storage for shared contexts
const sharedContexts = new Map<string, BlockContext>()

/**
 * Get shared context by key
 * @param key - Context key
 * @returns BlockContext or undefined
 */
export function getSharedContext(key: string): BlockContext | undefined {
  logger.debug('[contextManager] getSharedContext', { key }); // Log entry
  return sharedContexts.get(key)
}

/**
 * Set shared context
 * @param key - Context key
 * @param context - Block context
 */
export function setSharedContext(key: string, context: BlockContext): void {
  logger.debug('[contextManager] setSharedContext', { key }); // Log entry
  sharedContexts.set(key, context)
}

/**
 * Clear shared context by key
 * @param key - Context key
 */
export function clearSharedContext(key: string): void {
  logger.debug('[contextManager] clearSharedContext', { key }); // Log entry
  sharedContexts.delete(key)
}
