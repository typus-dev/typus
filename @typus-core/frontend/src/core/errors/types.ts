// src/core/errors/types.ts

/**
 * AppError — extended Error class for application-specific errors
 * @param message — user/log message
 * @param code — error code/identifier
 * @param severity — error severity
 * @param metadata — context info for debug/log
 * @param origin — error source (component/module/service)
 * @param displayModeOverride — (optional) force display mode
 * @param recoveryHint — (optional) manual recovery hint
 */
export type ErrorSeverity = 'critical' | 'warning' | 'info' | 'log'

export class AppError extends Error {
  public severity: ErrorSeverity
  public code?: string | number
  public metadata?: Record<string, any>
  public origin?: string
  public displayModeOverride?: 'fullscreen' | 'modal' | 'toast' | 'none'
  public recoveryHint?: string

  constructor(
    message: string,
    options?: {
      code?: string | number
      severity?: ErrorSeverity
      metadata?: Record<string, any>
      origin?: string
      displayModeOverride?: 'fullscreen' | 'modal' | 'toast' | 'none'
      recoveryHint?: string
    }
  ) {
    super(message)
    this.name = 'AppError'
    this.severity = options?.severity ?? 'warning'
    this.code = options?.code
    this.metadata = options?.metadata
    this.origin = options?.origin
    this.displayModeOverride = options?.displayModeOverride
    this.recoveryHint = options?.recoveryHint
  }
}
