# Frontend Logger

A centralized logging system for the frontend application that supports multiple output modes (console, API) and log levels.

## Features

- Multiple log levels: debug, info, warn, error
- Multiple output modes: console, API, both, or none
- Batched API logging to reduce network requests
- Context and metadata support for better debugging
- Circular reference handling in metadata
- Integration with error handling system
- Auto-import support

## Usage Examples

### Basic Usage

```typescript
// The logger is globally available through auto-imports
// No need to import it explicitly in most cases

// Simple logging
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');

// With metadata
logger.info('User logged in', { userId: 123, timestamp: Date.now() });

// With context (component/module name)
logger.info('Component mounted', { props }, 'UserProfile');

// Logging errors with stack trace
try {
  // Some code that might throw
} catch (error) {
  logger.error(error, { additionalInfo: 'Something went wrong' }, 'AuthService');
}
```

### Using the Composable

```typescript
<script setup>
// Auto-imported, no need for explicit import
const logger = useLogger();

onMounted(() => {
  logger.info('Component mounted', { componentName: 'Dashboard' });
});

function handleSubmit() {
  logger.debug('Form submitted', { formData: '...' });
  
  try {
    // Process form
  } catch (error) {
    logger.error(error, { form: 'login' }, 'LoginForm');
  }
}
</script>
```

### Configuration

The logger can be configured through environment variables:

```
# Frontend logging configuration migrated to database (system.config_public)
# Configure via Settings UI or seed files:
# - logging.frontend.level → 'debug', 'info', 'warn', 'error'
# - logging.frontend.mode → 'console', 'api', 'both', 'none'
# API endpoint is hardcoded as /api/logs
```

## API Reference

### Log Levels

- `debug`: Detailed information for debugging purposes
- `info`: General information about application flow
- `warn`: Warnings that don't prevent the application from working
- `error`: Errors that might prevent features from working correctly

### Logger Methods

- `logger.debug(message, metadata?, context?)`
- `logger.info(message, metadata?, context?)`
- `logger.warn(message, metadata?, context?)`
- `logger.error(messageOrError, metadata?, context?)`

### Parameters

- `message`: String message or Error object (for error method)
- `metadata`: Optional object with additional data
- `context`: Optional string identifying the source (component, service, etc.)
