/**
 * System constants and users for internal operations
 */

/**
 * Task Worker System User
 * Used for internal operations that require DSL access without HTTP authentication
 * Matches the user created by AuthMiddleware when INTERNAL_API_TOKEN is detected
 *
 * Used by:
 * - TaskWorker: Sets this user in AsyncLocalStorage context for all task handlers
 * - ConfigService: Reads from context via getCurrentUser()
 * - Any service that needs system-level DSL access during task execution
 */
export const TASK_WORKER_USER = {
  id: 0,
  email: 'task_worker@system',
  roles: ['task_worker'],
  isTaskWorker: true,
  abilityRules: [{ action: 'manage', subject: 'all' }]
} as const;
