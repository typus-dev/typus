# Dynamic Routes Module

## Concept

The dynamic routes system allows storing and managing the site structure through a database. Each route is stored in a table and contains:
- URL path (`path`)
- Name (`name`)
- Component for display (`component`)
- Hierarchical relationships with other routes (`parentId`)
- Metadata (`meta`)

When the application starts, all active routes are loaded from the database, transformed into Vue Router format, and form the site's navigation structure. Administrators can add, edit, or delete routes through the management interface without changing code, and the system automatically updates the site navigation.

### How It Works

1. **Initialization:**
   - Backend loads all active routes from the database at application startup
   - Routes are converted from database format to router format
   - Vue router is initialized with dynamic routes

2. **Route Management:**
   - Administrators create/edit/delete routes through the RouteManager interface
   - Changes are saved to the database
   - Router is updated to reflect changes

3. **Performance Optimization:**
   - Route caching on server or client
   - Loading only active routes (via isActive field)
   - Lazy loading components to speed up initial loading

4. **Hierarchical Structure:**
   - parentId field creates a tree structure
   - Routes can be nested
   - orderIndex field controls display order in menu

### Technical Implementation

- **Backend:** CRUD operations for routes with tree API
- **Database:** Prisma ORM with self-referencing relationships for hierarchy
- **Frontend:** Vue router configuration populated with dynamic data

## Implementation Roadmap

### 1. Data Model ✅
- Created Route model in Prisma with fields: id, path, name, component, parentId, orderIndex, meta, isActive

### 2. Backend Components ✅
- Created dynamic-router module in backend/src/core
- Implemented DynamicRouterService with methods: getRoutes, getRouteTree, createRoute, updateRoute, deleteRoute, reorderRoutes
- Implemented DynamicRouterController with corresponding endpoints
- Created validation schemas for incoming data

### 3. Frontend Components ✅
- Created routes module in frontend/src/modules
- Implemented components: RouteForm, RouteItem, RouteTree, RoutesManager
- Created pages: list/index.vue, create/index.vue, edit/[id].vue
- Created types file: types.ts
- Created menu file: routes.menu.ts

### 4. Remaining Implementation Tasks

#### 4.1. Fix Type Errors
- Fix type errors in components (especially in edit/[id].vue)
- Update types in RouteForm.vue for correct data handling

#### 4.2. DefaultDynamicPage Component
- Create/improve DefaultDynamicPage.vue for displaying dynamic pages
- Integrate it with the routing system

#### 4.3. Authentication System Integration
- Add middleware for checking access rights to the routes API
- Configure access rights checks in the controller

#### 4.4. Notification System and Error Handling
- Integrate notification system to display operation results
- Implement error handling at all levels

#### 4.5. Drag-and-Drop Functionality
- Add vuedraggable library for drag-and-drop support in RouteTree component
- Implement logic for dragging and changing route order

#### 4.6. Menu Generation
- Run menu generation script to add module to navigation
- Verify correct display in sidebar menu

## Instructions for Developers

### Fixing Type Errors

1. In `frontend/src/modules/routes/pages/edit/[id].vue`, fix the type error:
   ```typescript
   // Replace
   const { data, error: apiError } = await routesApi.get({ id: routeId })
   
   // With
   const { data, error: apiError } = await routesApi.get<Route>({ id: routeId })
   ```

2. Update data handling:
   ```typescript
   if (!data) {
     error.value = 'Route not found'
     return
   }
   
   logger.debug('[RouteEditPage] Route loaded', { id: data.id })
   ```

### Implementing DefaultDynamicPage

1. Check existing component `frontend/src/layouts/system/DefaultDynamicPage.vue`
2. If necessary, enhance it to support dynamic routes:
   ```vue
   <template>
     <div class="dynamic-page">
       <component :is="dynamicComponent" v-if="dynamicComponent" />
       <div v-else class="dynamic-page-error">
         <h2>Component not found</h2>
         <p>Component "{{ componentName }}" is not registered in the system</p>
       </div>
     </div>
   </template>
   
   <script setup>
   import { ref, computed, onMounted } from 'vue'
   import { useRoute } from 'vue-router'
   
   const route = useRoute()
   const componentName = computed(() => route.meta.component || '')
   const dynamicComponent = ref(null)
   
   onMounted(async () => {
     if (componentName.value) {
       try {
         // Attempt to load component dynamically
         const module = await import(`@/components/${componentName.value}.vue`)
         dynamicComponent.value = module.default
       } catch (err) {
         console.error(`Failed to load component ${componentName.value}`, err)
       }
     }
   })
   </script>
   ```

### Authentication System Integration

1. Add middleware in `frontend/src/core/middleware/dynamic-router/index.ts`:
   ```typescript
   import { useAuthStore } from '@/core/store/authStore'
   import { useAbilityStore } from '@/core/store/abilityStore'
   
   export async function checkRouteAccess(to, from, next) {
     const authStore = useAuthStore()
     const abilityStore = useAbilityStore()
     
     // Check authentication
     if (!authStore.isAuthenticated) {
       return next({ name: 'login' })
     }
     
     // Check access rights
     if (to.meta.permissions) {
       const hasPermission = abilityStore.can(to.meta.permissions)
       if (!hasPermission) {
         return next({ name: 'access-denied' })
       }
     }
     
     return next()
   }
   ```

2. Add check in controller `backend/src/core/dynamic-router/controllers/DynamicRouterController.ts`:
   ```typescript
   @UseGuards(JwtAuthGuard, PermissionsGuard)
   @Permissions('routes.manage')
   @Post()
   async createRoute(@Body() dto: CreateRouteDto) {
     return this.dynamicRouterService.createRoute(dto)
   }
   ```

### Adding Drag-and-Drop Functionality

1. Install vuedraggable library:
   ```bash
   npm install vuedraggable@next
   ```

2. Update RouteTree.vue component:
   ```vue
   <template>
     <div class="route-tree">
       <draggable
         v-model="routes"
         group="routes"
         item-key="id"
         @end="onDragEnd"
         ghost-class="ghost-route"
         handle=".drag-handle"
       >
         <template #item="{ element }">
           <route-item
             :route="element"
             @edit="$emit('edit', $event)"
             @delete="$emit('delete', $event)"
           />
         </template>
       </draggable>
     </div>
   </template>
   
   <script setup>
   import { ref, defineProps, defineEmits } from 'vue'
   import draggable from 'vuedraggable'
   import RouteItem from './RouteItem.vue'
   import { useApi } from '@/shared/composables/useApi'
   
   const props = defineProps({
     routes: {
       type: Array,
       default: () => []
     }
   })
   
   const emit = defineEmits(['edit', 'delete', 'reorder'])
   const routesApi = useApi('/dynamic-routes')
   
   const routes = ref(props.routes)
   
   async function onDragEnd(evt) {
     const reorderData = routes.value.map((route, index) => ({
       id: route.id,
       parentId: route.parentId,
       orderIndex: index
     }))
     
     emit('reorder', reorderData)
     
     try {
       await routesApi.post('/reorder', { routes: reorderData })
     } catch (err) {
       console.error('Failed to reorder routes', err)
     }
   }
   </script>
   ```

### Running Menu Generation Script

1. Ensure `frontend/src/modules/routes/routes.menu.ts` is correctly configured
2. Run the menu generation script:
   ```bash
   cd frontend
   npm run generate-menus
   ```
   or
   ```bash
   node scripts/generate-auto-menus.ts
   ```

3. Verify menu appears in sidebar

## Potential Challenges and Solutions

### 1. Handling Nested Routes When Deleting a Parent Route

**Problem:** When deleting a parent route, need to properly handle its child routes.

**Solution:**
- Implement cascade deletion (delete all child routes)
- Or move child routes up a level (to the parent of the deleted route)
- Add warning to user about existence of child routes

### 2. Properly Updating Frontend Routing When Routes Change

**Problem:** After changing routes in DB, need to update routes in Vue Router.

**Solution:**
- Use WebSocket for notifying clients about changes
- Periodically poll API for updates
- Update routes on page reload or user login

### 3. Performance with Large Number of Routes

**Problem:** Performance issues may arise with many routes (200+).

**Solution:**
- Implement pagination when loading routes
- Use list virtualization for displaying many items
- Optimize DB queries (selective field loading, indexes)

### 4. Synchronizing DSL Description with Database

**Problem:** Need to synchronize DSL route descriptions with DB data.

**Solution:**
- Create utility for importing/exporting routes between DSL and DB
- Implement migration mechanism for updating route structure
- Add route versioning for tracking changes

## Conclusion

The dynamic routes module provides a flexible system for managing site structure without code changes. It integrates with the existing project architecture and uses standard Vue Router components for routing.

To complete implementation, fix type errors, add drag-and-drop support, integrate with authentication system, and implement error handling. After that, the module will be fully functional and ready for use.