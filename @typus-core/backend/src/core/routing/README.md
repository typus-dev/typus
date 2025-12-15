# Routing System

This directory contains the core routing infrastructure for the application. The routing system is responsible for handling HTTP requests, routing them to the appropriate controllers, and standardizing the response format.

## Components

### Router

The `Router` class is responsible for configuring and managing Express routes at the application level. It works with the module system to register routes from all modules.

### RouterHelper

The `RouterHelper` class provides utilities for setting up routes within modules. It standardizes route handling, error management, and response formatting.

## Key Features

### Standardized Response Format

All responses follow a consistent format:

```typescript
{
  status: number,    // HTTP status code
  data: any | null,  // Response data (if successful)
  error: {           // Error information (if failed)
    message: string,
    code: string
  } | null
}
```

### Automatic Error Handling

The `RouterHelper` wraps all route handlers in a try-catch block to ensure consistent error handling. Errors are automatically formatted and returned with appropriate status codes.

### Request Logging

All requests and responses are logged with detailed information, including:
- Request method and path
- Request body
- Processing time
- Response status and size

### Safe Handler Wrapping

Route handlers are wrapped in a safe handler function that:
1. Initializes empty request bodies
2. Logs request details
3. Executes the handler
4. Formats the response
5. Handles any errors

## Usage

### In Module Classes

```typescript
protected initializeRoutes(): void {
  this.routes.get('/', [this.auth()], this.controller.getAllItems.bind(this.controller));
  
  this.routes.post('/', [
    this.auth(),
    this.roles(['admin']),
    this.controller.validate(createSchema)
  ], this.controller.createItem.bind(this.controller));
}
```

### Route Helper Methods

The `RouterHelper` provides methods for all HTTP verbs:
- `get(path, middleware[], handler)`
- `post(path, middleware[], handler)`
- `put(path, middleware[], handler)`
- `delete(path, middleware[], handler)`

Each method:
1. Accepts a path, array of middleware, and a handler
2. Wraps the handler in error handling logic
3. Registers the route with the Express router

## Integration with BaseController

The routing system works closely with `BaseController`, which provides:
- Validation utilities
- Response formatting methods
- Error handling methods

Controllers don't need to explicitly return responses - the proxy wrapper in `BaseController` and the safe handler in `RouterHelper` handle response formatting automatically.
