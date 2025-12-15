import type { ErrorSeverity } from './types'

/**
 * Error display modes
 */
export type ErrorDisplayMode = 'fullscreen' | 'modal' | 'toast' | 'none'

/**
 * Recovery action identifiers
 */
export type RecoveryActionId = 'reloadPage' | 'resetTheme' | 'clearSession' | 'logOnly'

/**
 * Error config override for specific error code/type
 */
export interface ErrorSpecificOverride {
  code: string | number
  displayMode?: ErrorDisplayMode
  recoveryActions?: RecoveryActionId[]
}

/**
 * Error handling configuration
 */
export const errorConfig = {
  // Severity levels
  severityLevels: ['critical', 'warning', 'info', 'log'] as ErrorSeverity[],

  // Default display mode by severity
  defaultDisplayModeBySeverity: {
    critical: 'fullscreen',
    warning: 'none',  // Changed from 'modal' to 'none' - warnings only in console
    info: 'toast',
    log: 'none'
  } as Record<ErrorSeverity, ErrorDisplayMode>,

  // Default recovery actions by severity
  defaultRecoveryActionsBySeverity: {
    critical: ['reloadPage'],
    warning: ['logOnly'],
    info: [],
    log: []
  } as Record<ErrorSeverity, RecoveryActionId[]>,

  // Error-specific overrides
  errorSpecificOverrides: [
    // Example: override for auth error
    { code: 'AUTH_401', displayMode: 'none', recoveryActions: ['clearSession'] }
  ] as ErrorSpecificOverride[],

  // Logging settings
  logLevel: 'warning' as ErrorSeverity, // log errors with severity >= logLevel
  logStackTraces: 'all' as 'all' | 'criticalOnly' | 'none',

  // Monitoring settings (stub)
  monitoring: {
    enabled: false,
    url: '',
    apiKey: ''
  }
}

export type ErrorConfig = typeof errorConfig
