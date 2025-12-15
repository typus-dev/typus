import { errorConfig, type ErrorDisplayMode, type RecoveryActionId, type ErrorSpecificOverride } from './config'
import { AppError, type ErrorSeverity } from './types'
import { errorBus, ErrorUIEvent } from '@/core/events/errorBus'
import { logger } from '@/core/logging/logger'

/**
 * Recovery actions registry
 */
const recoveryActionsRegistry: Record<RecoveryActionId, () => void> = {
  reloadPage: () => window.location.reload(),
  resetTheme: () => {
    localStorage.removeItem('app-theme')
    window.location.reload()
  },
  clearSession: () => {
    // Emit event for session clear, to be handled by auth module
    errorBus.emit('recovery:clearSession', undefined)
    // Optionally, reload page after session clear
    window.location.reload()
  },
  logOnly: () => {
    // No-op, just log
  }
}

/**
 * Centralized error handler
 */
export class ErrorHandler {
  /**
   * Classify error and extract context
   */
  classifyError(error: unknown, metadata?: Record<string, any>) {
    if (error instanceof AppError) {
      return {
        severity: error.severity,
        code: error.code,
        origin: error.origin,
        message: error.message,
        metadata: error.metadata ?? metadata
      }
    }
    // Fallback for native errors
    return {
      severity: 'warning' as ErrorSeverity,
      code: undefined,
      origin: undefined,
      message: error instanceof Error ? error.message : String(error),
      metadata
    }
  }

  /**
   * Get display mode for error
   */
  getDisplayMode(severity: ErrorSeverity, code?: string | number): ErrorDisplayMode {
    const override = errorConfig.errorSpecificOverrides.find(o => o.code === code)
    if (override?.displayMode) return override.displayMode
    return errorConfig.defaultDisplayModeBySeverity[severity] ?? 'modal'
  }

  /**
   * Get recovery actions for error
   */
  getRecoveryActions(severity: ErrorSeverity, code?: string | number): RecoveryActionId[] {
    const override = errorConfig.errorSpecificOverrides.find(o => o.code === code)
    if (override?.recoveryActions) return override.recoveryActions
    return errorConfig.defaultRecoveryActionsBySeverity[severity] ?? []
  }


/**
 * Show error UI via Event Bus
 */
showErrorUI(displayMode: ErrorDisplayMode, error: { message: string, details?: any, actions: RecoveryActionId[], severity: ErrorSeverity }) {
  // Emit error event for UI layer
  // UI components should listen to 'error:show' and display accordingly
  errorBus.emit('error:show', {
    displayMode,
    message: error.message,
    details: error.details ? { stack: error.details } : undefined, // Wrap details in object
    actions: error.actions,
    severity: error.severity
  } as ErrorUIEvent)
}

  /**
   * Error cycle prevention: track recent errors
   */
  private recentErrors = new Map<string, number>()
  private static CYCLE_WINDOW_MS = 3000
  private static CYCLE_MAX_COUNT = 3

  /**
   * Handle error (main entry)
   */
  handle(error: unknown, metadata?: Record<string, any>) {
    const { severity, code, origin, message, metadata: meta } = this.classifyError(error, metadata)
    const displayMode = this.getDisplayMode(severity, code)
    const actions = this.getRecoveryActions(severity, code)

    // Cycle prevention key
    const key = [message, origin, code].join('|')
    const now = Date.now()
    const count = this.recentErrors.get(key) || 0
    if (count >= ErrorHandler.CYCLE_MAX_COUNT) {
      // Skip handling to prevent error loop
      logger.warn('[ErrorHandler] Error cycle detected, suppressing repeated error:', { key })
      return { error, severity, code, origin, message, actions, displayMode, suppressed: true }
    }
    this.recentErrors.set(key, count + 1)
    // Clean up old errors
    setTimeout(() => {
      const current = this.recentErrors.get(key) || 0
      if (current > 1) this.recentErrors.set(key, current - 1)
      else this.recentErrors.delete(key)
    }, ErrorHandler.CYCLE_WINDOW_MS)

    // Ensure error is of type string | Error for logger
    const errorToLog = error instanceof Error ? error : String(error);
    logger.error(errorToLog, meta, origin);

    if (displayMode !== 'none') {
      this.showErrorUI(displayMode, {
        message,
        details: (error instanceof Error && errorConfig.logStackTraces !== 'none') ? error.stack : undefined,
        actions,
        severity
      })
    }
    // Optionally return context for UI
    return { error, severity, code, origin, message, actions, displayMode }
  }

  /**
   * Execute recovery action by id
   */
  executeRecoveryAction(actionId: RecoveryActionId) {
    const fn = recoveryActionsRegistry[actionId]
    if (fn) fn()
    else logger.warn('[ErrorHandler] Unknown recovery action:', { actionId })
  }
}

export const errorHandler = new ErrorHandler()
