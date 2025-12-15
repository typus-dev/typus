# Routes Module Setup and Testing Guide

## Environment Setup

### 1. Installing Dependencies

Before starting work, ensure all necessary dependencies are installed:

```bash
# In the project root directory
cd frontend
npm install

# Install drag-and-drop library (if not already installed)
npm install vuedraggable@next
```

### 2. Generating Prisma Client

For correct database interaction, generate the Prisma client:

```bash
cd shared
npm run prisma:generate
```

### 3. Checking Migrations

Ensure all database migrations are applied:

```bash
cd shared
npm run prisma:migrate:dev
```

## Running the Module

### 1. Starting the Backend

```bash
cd backend
npm run dev
```

### 2. Starting the Frontend

```bash
cd frontend
npm run dev
```

### 3. Generating Menu

To add the routes module to the navigation menu, run:

```bash
cd frontend
node scripts/generate-auto-menus.ts
```

## Testing Functionality

### 1. Creating a Route

1. Open browser and navigate to: `http://localhost:3000/routes`
2. Click the "Create Route" button
3. Fill out the form:
   - Path: `/test-route`
   - Name: `Test Route`
   - Component: `TestComponent` (if it exists)
   - Parent Route: select from list or leave empty
   - Order: `0`
   - Active: `Yes`
   - Metadata: `{}` (or add necessary metadata in JSON format)
4. Click "Save"

### 2. Editing a Route

1. In the routes list, find the created route
2. Click the "Edit" button
3. Modify the necessary fields
4. Click "Save"

### 3. Testing Route Hierarchy

1. Create several routes with different parent routes
2. Check the correct display of hierarchy in the route tree
3. If drag-and-drop functionality is implemented, try dragging routes to change their order or parent route

### 4. Checking Dynamic Routing

1. Create a route pointing to an existing component (e.g., `TestComponent`)
2. Navigate to the URL of the created route
3. Ensure the component displays correctly

## Debugging and Troubleshooting

### 1. Type Issues

If TypeScript errors occur:

1. Check the file `frontend/src/modules/routes/types.ts`
2. Ensure types match the data structure in the API
3. Use explicit type casting when necessary

### 2. API Issues

If errors occur when interacting with the API:

1. Check the browser console for detailed error information
2. Check backend logs
3. Ensure API endpoints match those expected in frontend code

### 3. Component Display Issues

If dynamic components don't display:

1. Check that the component exists at the specified path
2. Ensure the component is correctly imported
3. Check the console for component loading errors

## Security Testing

### 1. Testing Access Rights

1. Log in as a user without route management permissions
2. Try to access the `/routes` page
3. Ensure access is denied and the user is redirected to an access error page

### 2. Data Validation Testing

1. Try to create a route with incorrect data (e.g., empty path)
2. Ensure the system correctly validates data and displays error messages

## Performance

### 1. Testing with Large Number of Routes

To test performance with a large number of routes, you can create a script to generate test data:

```typescript
// scripts/generate-test-routes.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function generateTestRoutes() {
  const routesCount = 200 // Number of routes to generate
  
  for (let i = 0; i < routesCount; i++) {
    await prisma.route.create({
      data: {
        path: `/test-route-${i}`,
        name: `Test Route ${i}`,
        component: i % 5 === 0 ? 'TestComponent' : null,
        orderIndex: i,
        isActive: true,
        meta: {}
      }
    })
  }
  
  console.log(`Created ${routesCount} test routes`)
}

generateTestRoutes()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
```

Run the script and check interface performance when working with a large number of routes.

## Additional Checks

### 1. Menu Update Verification

After creating or modifying routes, check that the navigation menu updates correctly.

### 2. Mobile Version Testing

Test the route management interface on mobile devices or using browser developer tools.

### 3. Localization Testing

If the project uses a localization system, ensure all texts in the route management interface are correctly localized.

## Testing Completion

After completing testing:

1. Fix all discovered bugs
2. Update documentation if necessary
3. Create a commit with changes
4. Push changes to the repository

## Support Contacts

For questions or issues, contact the person responsible for the routes module.