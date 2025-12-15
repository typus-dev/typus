# DSL Client

**Created:** May 4, 2025  
**Last Updated:** May 4, 2025 (v1.1.2)

Typed client for working with DSL models.

## Architecture

The DSL client is built on the following principles:
- **Abstraction**: The client contains no hardcoded models
- **Type Safety**: Complete typing at all levels
- **Automatic Generation**: Types are generated from DSL models
- **Environment-Aware**: Configuration via environment variables

## Components

1. **Interface Generator** (`shared/dsl/generators/interface-generator.ts`)
   - Generates TypeScript interfaces from DSL models
   - Creates `auto-interfaces.ts` and `auto-dsl-types.ts` files

2. **DSL Client** (`frontend/src/dsl/client/DSL.ts`)
   - Abstract Proxy object for accessing models
   - Dynamically creates model clients on demand

3. **Typed Client** (`frontend/src/dsl/client/TypedDslClient.ts`)
   - Wraps the base DSL client
   - Adds typing through generics

## Usage

### Generating Interfaces

When DSL models change, you need to generate new interfaces:

```bash
# In the shared directory
npm run generate:interfaces

# Or to generate all artifacts (Prisma + interfaces)
npm run generate:all
```

### Using in Code

```typescript
import { DSL, initDslClient } from '@/dsl/client';
import type { IBlogPost, ICategory } from '@root-shared/dsl/auto-interfaces';



// Typed usage
const post = await DSL.BlogPost.findById(1) as IBlogPost;
console.log(post.title); // TypeScript knows that post has a title field

// Creating a new record
const newPost = await DSL.BlogPost.create({
  title: 'New post',
  content: 'Post content',
  categoryId: 1
}) as IBlogPost;

// Getting a list with filtering
const posts = await DSL.BlogPost.findMany({ 
  categoryId: 1 
}) as IBlogPost[];
```

## Adding a New Model

1. Create a model file in `shared/dsl/models/`
2. Run the interface generator: `npm run generate:interfaces`
3. Use the model in code via `DSL.NewModel`

No additional changes to the client are required!

## API Communication

The DSL client communicates with the backend using a single endpoint and includes module information in the request payload:

```typescript
// Request payload
const payload = {
  model: 'BlogPost',     // Model name
  module: 'blog',        // Module name
  operation: 'read',     // Operation type
  data: { ... },         // Data for create/update
  filter: { ... },       // Filter for read/update/delete
  include: ['category'], // Relations to include
  pagination: {          // Pagination options
    page: 1,
    limit: 10
  }
};

// API request
const response = await useApi('dsl').post(payload);
```

## Environment Configuration

The DSL client relies on environment variables for configuration:

```
# .env file
VITE_API_URL=http://localhost:3000/api
```

These environment variables are used by the DSL client to determine the API endpoint:

1. **VITE_API_URL**: Base URL for API requests (e.g., `http://localhost:3000/api`)
   - Used by the `useApi` function in `frontend/src/shared/composables/useApi.ts`
   - The DSL client uses this base URL and appends the endpoint (e.g., `dsl`)

The DSL client requires the `apiEndpoint` parameter to be provided:

```typescript
// Create a DSL client with the required apiEndpoint
const client = createDslClient({
  apiEndpoint: 'dsl' // Will be prefixed with VITE_API_URL
});
```

This approach ensures:
- No hardcoded API paths in the codebase
- Configuration is centralized in environment variables
- Different environments can use different API endpoints
- Server-side templating (SST) can inject the correct values
- Module information is passed in the request payload, not in the URL

## Docker Integration

When using Docker, interface generation can be included in the build process:

```dockerfile
# In Dockerfile for frontend
COPY shared /app/shared
WORKDIR /app/shared
RUN npm run generate:interfaces

WORKDIR /app/frontend
# Continue frontend build
```

Or it can be performed as part of the CI/CD process before building containers.
