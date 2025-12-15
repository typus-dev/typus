<!-- src/core/components/ErrorBoundary.vue -->
<template>
  <!-- Only show local error UI if showLocalErrorUI is true -->
  <div v-if="showLocalErrorUI" class="error-boundary">
    <div class="error-content">
      <h2 class="component-title">{{ componentTitle }}</h2>
      <p class="error-message">{{ errorMessage }}</p>
      <!-- Show details if config allows AND stack is available -->
      <div v-if="showDetails && errorStack" class="error-details">
        <pre>{{ errorStack }}</pre>
      </div>
      <div class="actions">
        <button v-if="canRetry" class="retry-button" @click="retry">Try again</button>
        <button class="reload-button" @click="reloadPage">Reload Page</button>
        <button class="reset-theme-button" @click="resetTheme">Reset Theme</button>
        <button class="report-issue-button" @click="reportIssue">Report Issue</button>
      </div>
    </div>
  </div>
  <!-- Otherwise (no error OR error is handled globally), render the slot -->
  <slot v-else></slot>
</template>

<script setup lang="ts">
import { ref, computed, onErrorCaptured, getCurrentInstance, ComponentPublicInstance } from 'vue' // Import ComponentPublicInstance
import { errorHandler } from '@/core/errors/handler'
import { AppError } from '@/core/errors/types'
import { errorConfig } from '@/core/errors/config'
import { logger } from '@/core/logging/logger' // Import logger

// --- Props ---
const props = defineProps<{ title?: string }>()

// --- State ---
const capturedError = ref<Error | null>(null) // Store the captured error object
const errorStack = ref<string | null>(null) // Store the stack trace
const showDetails = ref(errorConfig.logStackTraces !== 'none') // Control details visibility based on config
const showLocalErrorUI = ref(false) // Initially hide local UI
const canRetry = ref(true) // Allow retry by default for MVP
const handlerContext = ref<any>(null) // Store context from ErrorHandler for debugging

// --- Computed Properties ---
const errorMessage = computed(() => capturedError.value?.message || 'Unknown error occurred')
const componentTitle = computed(() => props.title || 'Something went wrong in this section')

// --- Methods ---
/**
 * Resets the error state to allow Vue to re-render the slot content.
 */
const retry = () => {
  logger.debug('[ErrorBoundary] Attempting to retry rendering slot content.');
  capturedError.value = null
  errorStack.value = null
  handlerContext.value = null // Clear context
  showLocalErrorUI.value = false // Hide local UI to trigger slot re-render
}

/**
 * Executes the 'reloadPage' recovery action via the central handler.
 */
const reloadPage = () => {
  logger.debug('[ErrorBoundary] Requesting "reloadPage" recovery action.');
  errorHandler.executeRecoveryAction('reloadPage')
}

/**
 * Executes the 'resetTheme' recovery action via the central handler.
 */
const resetTheme = () => {
  logger.debug('[ErrorBoundary] Requesting "resetTheme" recovery action.');
  errorHandler.executeRecoveryAction('resetTheme')
}

/**
 * Copies error details to the clipboard for reporting.
 */
const reportIssue = () => {
  const message = capturedError.value?.message ?? 'Unknown error'
  const stack = errorStack.value ?? 'N/A'
  const details = `Error: ${message}\nOrigin: ${handlerContext.value?.origin ?? 'Unknown'}\nStack: ${stack}`
  navigator.clipboard.writeText(details)
    .then(() => logger.debug('[ErrorBoundary] Error details copied to clipboard.'))
    .catch(err => logger.error('[ErrorBoundary] Failed to copy error details:', err))
  // TODO: Optionally show a success toast here
}

// --- Error Capture Hook ---
  onErrorCaptured((err: Error, instance: ComponentPublicInstance | null, info: string) => { // Explicitly type instance and info
  // Get component name, use __name for script setup components
  const componentName = instance?.$options.__name || instance?.$options.name || 'UnknownComponent'; // Safely access name
  logger.error(`[ErrorBoundary] Caught error in component "${componentName}"`, err);

  // 1. Store error details immediately
  capturedError.value = err;
  errorStack.value = err.stack || 'No stack trace available';

  // 2. Determine origin and ensure we have an AppError instance
  const origin = componentName;
  const appError = err instanceof AppError
    ? err // Use existing AppError
    : new AppError(err.message, { // Wrap native error
        origin,
        severity: 'warning', // Default severity if not AppError
        metadata: { componentInfo: info, rawErrorName: err.name }
      });
  // Update capturedError ref if we wrapped it
  if (!(err instanceof AppError)) {
      capturedError.value = appError;
  }

  // 3. Handle the error centrally and get context/instructions
  let context;
  try {
    logger.debug(`[ErrorBoundary] Calling errorHandler.handle for error from origin "${origin}"`, appError);
    // Pass info as part of an object for metadata
    context = errorHandler.handle(appError, { componentInfo: info }); // Pass component info directly
    handlerContext.value = context; // Store context for debugging/reporting
    logger.debug("[ErrorBoundary] Context received from handler:", JSON.stringify(context, null, 2));
  } catch (handlerError: any) {
    // Catastrophic failure: Error handler itself failed!
    logger.error("[ErrorBoundary] FATAL: Error occurred within ErrorHandler itself!", handlerError);
    // Force show local UI with details about both errors
    showLocalErrorUI.value = true;
    capturedError.value = new Error(`Original error: ${err.message}. Handler failed: ${handlerError.message}`);
    errorStack.value = `Original Stack:\n${err.stack}\nHandler Stack:\n${handlerError.stack}`;
    canRetry.value = false; // Disable retry if handler is broken
    return false; // Prevent bubbling
  }

  // 4. Decide whether to show the local ErrorBoundary UI
  // Show if displayMode is 'toast' or 'none', OR if the error was suppressed by cycle detection
  if (context.displayMode === 'toast' || context.displayMode === 'none' || context.suppressed) {
    showLocalErrorUI.value = true;
    logger.debug(`[ErrorBoundary] Decision: Show local UI (displayMode: ${context.displayMode}, suppressed: ${context.suppressed})`);
  } else {
    // For 'fullscreen' and 'modal', hide local UI and expect global handler to take over
    showLocalErrorUI.value = false;
    logger.debug(`[ErrorBoundary] Decision: Hide local UI, expecting global handler (displayMode: ${context.displayMode})`);
  }

  // 5. Decide if the 'Try Again' button should be enabled
  // Disable retry for critical errors as it's unlikely to help
  canRetry.value = context.severity !== 'critical';
  logger.debug(`[ErrorBoundary] Can Retry set to: ${canRetry.value} (severity: ${context.severity})`);

  // 6. Prevent the error from bubbling further up the component tree
  return false;
})
</script>

<style scoped>
/* Styles remain the same, added some semantic class names */
.error-boundary {
  padding: 1rem;
  border: 1px dashed var(--color-border-primary);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
.error-content {
  text-align: center;
}
.error-content > * + * {
  margin-top: 0.5rem;
}
.component-title {
  font-size: 1.25rem;
  font-weight: 600;
}
.error-message {
  font-size: 1rem;
}
.error-details {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: var(--color-bg-error);
  border-radius: 0.375rem;
  text-align: left;
  overflow: auto;
  max-height: 200px;
  font-size: 0.75rem;
  font-family: monospace;
}
.actions {
  @apply flex flex-row gap-2 justify-center mt-3;
}
.retry-button,
.reload-button,
.reset-theme-button,
.report-issue-button {
  @apply px-3 py-1 text-sm rounded border;
}
.retry-button {
  background-color: var(--color-bg-warning);
  color: var(--color-text-contrast);
  border-color: var(--color-border-warning);
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}
.retry-button:hover:not(:disabled) {
  opacity: 0.9;
}
.reload-button {
  background-color: var(--color-bg-accent);
  color: var(--color-text-contrast);
  border-color: var(--color-border-accent);
}
.reload-button:hover {
  opacity: 0.9;
}
.reset-theme-button {
  background-color: var(--color-bg-error);
  color: var(--color-text-contrast);
  border-color: var(--color-border-error);
}
.reset-theme-button:hover {
  opacity: 0.9;
}
.report-issue-button {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-border-primary);
}
.report-issue-button:hover {
  background-color: var(--color-bg-tertiary);
}
</style>
