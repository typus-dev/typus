# DSL Routing Integration

This directory contains the DSL (Domain Specific Language) routing implementation that integrates with the core routing system. The DSL router provides a unified API endpoint for performing CRUD operations on models defined in the DSL system.

## Overview

The DSL routing system extends the base routing infrastructure to provide a dynamic API based on model definitions. Instead of creating separate endpoints for each model, it uses a single endpoint approach where the model and operation are specified in the request body.

## Integration with Base Routing

### Inheritance Structure

```
BaseController
    ↑
DslController

BaseModule
    ↑
DslModule
```

The DSL routing components inherit from the base routing components:
- `DslController` extends `BaseController`
- `DslModule` extends `BaseModule`

### Key Integration Points

1. **Proxy Wrapping**: The DSL controller leverages the proxy wrapping mechanism from `BaseController` to automatically handle responses and errors.

2. **RouterHelper Integration**: The DSL module uses `RouterHelper` to set up routes with standardized request/response handling.

3. **Validation**: The DSL controller uses the validation utilities from `BaseController` to validate incoming requests against schemas.

4. **Error Handling**: Errors are handled consistently through the base error handling mechanisms.

## Endpoint Approaches

### Main Endpoint

The DSL router provides a main endpoint for all operations:

```
POST /api/dsl
```

The request body specifies:
- The model to operate on
- The operation to perform (create, read, update, delete)
- The data, filters, and other parameters

Example request:
```json
{
  "model": "User",
  "operation": "read",
  "filter": { "status": "active" },
  "include": ["roles"],
  "pagination": { "page": 1, "limit": 10 }
}
```

### Module-Specific Endpoints

For better organization, the DSL router also provides module-specific endpoints:

```
POST /api/dsl/{module}
POST /api/dsl/{module}/{model}
```

These endpoints work the same way as the main endpoint but are scoped to specific modules or models.

### Relationship Endpoints

For handling relationships between models, the DSL router provides relationship endpoints:

```
POST /api/dsl/{module}/{model}/{id}/{relation}
```

These endpoints allow operations on related entities. For example:

```
POST /api/dsl/auth/user/123/roles
```

This would operate on the roles related to the user with ID 123.

## Benefits of Integration

1. **Consistency**: All responses follow the same format defined by the base routing system.

2. **Reduced Boilerplate**: No need to create separate controllers and routes for each model.

3. **Dynamic API**: The API automatically adapts to changes in model definitions.

4. **Centralized Logic**: Authentication, validation, and error handling are centralized.

5. **Standardized Logging**: All requests and responses are logged using the same logging infrastructure.

## Implementation Details

### DslController

The `DslController` extends `BaseController` and provides a single method for handling all operations:

```typescript
async handleOperation(req: Request, res: Response) {
  const { model, operation, data, filter, include, pagination } = this.getValidatedData(req);
  
  // Use the DSL service to execute the operation
  return await this.dslService.executeOperation(model, operation, data, filter, include, pagination, req.user);
}
```

### DslModule

The `DslModule` extends `BaseModule` and sets up a single route:

```typescript
protected initializeRoutes(): void {
  this.routes.post('/', [
    this.auth(),
    this.controller.validate(dslOperationSchema)
  ], this.controller.handleOperation.bind(this.controller));
}
```

### DslService

The `DslService` interacts with the DSL registry and Prisma to execute operations on models:

```typescript
async executeOperation(modelName, operation, data, filter, include, pagination, user) {
  // 1. Get model from registry
  // 2. Check access permissions
  // 3. Apply hooks
  // 4. Execute operation using Prisma
  // 5. Format and return result
}
```

## Extension Points

The DSL routing system provides several extension points:

1. **Hooks**: Pre and post operation hooks for customizing behavior.

2. **Access Control**: Model-level and operation-level access control.

3. **Custom Operations**: Support for operations beyond basic CRUD.

4. **Validation**: Custom validation rules for specific models and operations.
