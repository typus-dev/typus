# API Usage Examples for Dynamic Routes

This document provides examples of using the API for working with dynamic routes. The examples include both backend requests and frontend API usage.

## Backend API

### Getting List of Routes

#### Request

```http
GET /api/dynamic-routes
```

#### Response

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "path": "/dashboard",
      "name": "Dashboard",
      "component": "DashboardComponent",
      "parentId": null,
      "orderIndex": 0,
      "isActive": true,
      "meta": {
        "icon": "dashboard",
        "permissions": ["dashboard.view"]
      },
      "createdAt": "2025-05-15T12:00:00.000Z",
      "updatedAt": "2025-05-15T12:00:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "path": "/users",
      "name": "Users",
      "component": "UsersListComponent",
      "parentId": null,
      "orderIndex": 1,
      "isActive": true,
      "meta": {
        "icon": "users",
        "permissions": ["users.view"]
      },
      "createdAt": "2025-05-15T12:00:00.000Z",
      "updatedAt": "2025-05-15T12:00:00.000Z"
    }
  ],
  "total": 2
}
```

### Getting Tree Structure of Routes

#### Request

```http
GET /api/dynamic-routes/tree
```

#### Response

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "path": "/dashboard",
      "name": "Dashboard",
      "component": "DashboardComponent",
      "parentId": null,
      "orderIndex": 0,
      "isActive": true,
      "meta": {
        "icon": "dashboard",
        "permissions": ["dashboard.view"]
      },
      "children": []
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "path": "/users",
      "name": "Users",
      "component": "UsersListComponent",
      "parentId": null,
      "orderIndex": 1,
      "isActive": true,
      "meta": {
        "icon": "users",
        "permissions": ["users.view"]
      },
      "children": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440002",
          "path": "/users/create",
          "name": "Create User",
          "component": "UserCreateComponent",
          "parentId": "550e8400-e29b-41d4-a716-446655440001",
          "orderIndex": 0,
          "isActive": true,
          "meta": {
            "icon": "user-plus",
            "permissions": ["users.create"]
          },
          "children": []
        }
      ]
    }
  ]
}
```

### Creating a Route

#### Request

```http
POST /api/dynamic-routes
Content-Type: application/json

{
  "path": "/reports",
  "name": "Reports",
  "component": "ReportsComponent",
  "parentId": null,
  "orderIndex": 2,
  "isActive": true,
  "meta": {
    "icon": "chart-bar",
    "permissions": ["reports.view"]
  }
}
```

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "path": "/reports",
  "name": "Reports",
  "component": "ReportsComponent",
  "parentId": null,
  "orderIndex": 2,
  "isActive": true,
  "meta": {
    "icon": "chart-bar",
    "permissions": ["reports.view"]
  },
  "createdAt": "2025-05-17T12:00:00.000Z",
  "updatedAt": "2025-05-17T12:00:00.000Z"
}
```

### Updating a Route

#### Request

```http
PUT /api/dynamic-routes/550e8400-e29b-41d4-a716-446655440003
Content-Type: application/json

{
  "path": "/reports",
  "name": "Analytics and Reports",
  "component": "ReportsComponent",
  "parentId": null,
  "orderIndex": 2,
  "isActive": true,
  "meta": {
    "icon": "chart-line",
    "permissions": ["reports.view"]
  }
}
```

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "path": "/reports",
  "name": "Analytics and Reports",
  "component": "ReportsComponent",
  "parentId": null,
  "orderIndex": 2,
  "isActive": true,
  "meta": {
    "icon": "chart-line",
    "permissions": ["reports.view"]
  },
  "createdAt": "2025-05-17T12:00:00.000Z",
  "updatedAt": "2025-05-17T12:30:00.000Z"
}
```

### Deleting a Route

#### Request

```http
DELETE /api/dynamic-routes/550e8400-e29b-41d4-a716-446655440003
```

#### Response

```json
{
  "success": true,
  "message": "Route successfully deleted"
}
```

### Reordering Routes

#### Request

```http
POST /api/dynamic-routes/reorder
Content-Type: application/json

{
  "routes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "parentId": null,
      "orderIndex": 0
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "parentId": null,
      "orderIndex": 1
    }
  ]
}
```

#### Response

```json
{
  "success": true,
  "message": "Routes order successfully updated"
}
```

## Frontend API

### Getting List of Routes

```typescript
import { useApi } from '@/shared/composables/useApi'
import { Route } from '@/modules/routes/types'

const routesApi = useApi('/dynamic-routes')

async function fetchRoutes() {
  const { data, error } = await routesApi.get<Route[]>()
  
  if (error) {
    console.error('Error loading routes:', error)
    return []
  }
  
  return data || []
}
```

### Getting Tree Structure of Routes

```typescript
import { useApi } from '@/shared/composables/useApi'
import { Route } from '@/modules/routes/types'

const routesApi = useApi('/dynamic-routes')

async function fetchRouteTree() {
  const { data, error } = await routesApi.get<Route[]>('/tree')
  
  if (error) {
    console.error('Error loading route tree:', error)
    return []
  }
  
  return data || []
}
```

### Creating a Route

```typescript
import { useApi } from '@/shared/composables/useApi'
import { Route, RouteFormData } from '@/modules/routes/types'

const routesApi = useApi('/dynamic-routes')

async function createRoute(routeData: RouteFormData) {
  const { data, error } = await routesApi.post<Route>(routeData)
  
  if (error) {
    console.error('Error creating route:', error)
    return null
  }
  
  return data
}
```

### Updating a Route

```typescript
import { useApi } from '@/shared/composables/useApi'
import { Route, RouteFormData } from '@/modules/routes/types'

const routesApi = useApi('/dynamic-routes')

async function updateRoute(id: string, routeData: RouteFormData) {
  const { data, error } = await routesApi.put<Route>({ id }, routeData)
  
  if (error) {
    console.error('Error updating route:', error)
    return null
  }
  
  return data
}
```

### Deleting a Route

```typescript
import { useApi } from '@/shared/composables/useApi'

const routesApi = useApi('/dynamic-routes')

async function deleteRoute(id: string) {
  const { data, error } = await routesApi.delete({ id })
  
  if (error) {
    console.error('Error deleting route:', error)
    return false
  }
  
  return true
}
```

### Reordering Routes

```typescript
import { useApi } from '@/shared/composables/useApi'
import { RouteReorderItem } from '@/modules/routes/types'

const routesApi = useApi('/dynamic-routes')

async function reorderRoutes(routes: RouteReorderItem[]) {
  const { data, error } = await routesApi.post('/reorder', { routes })
  
  if (error) {
    console.error('Error reordering routes:', error)
    return false
  }
  
  return true
}
```

## Component Usage Examples

### Loading and Displaying Routes List

```vue
<template>
  <div class="routes-list">
    <div v-if="loading" class="loading">
      Loading routes...
    </div>
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    <div v-else>
      <route-tree 
        :routes="routes" 
        @edit="editRoute" 
        @delete="deleteRoute"
        @reorder="handleReorder"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useApi } from '@/shared/composables/useApi'
import RouteTree from '@/modules/routes/components/RouteTree.vue'
import { Route } from '@/modules/routes/types'

const routesApi = useApi('/dynamic-routes')
const routes = ref([])
const loading = ref(false)
const error = ref(null)

onMounted(async () => {
  await loadRoutes()
})

async function loadRoutes() {
  loading.value = true
  error.value = null
  
  try {
    const { data, error: apiError } = await routesApi.get<Route[]>('/tree')
    
    if (apiError) {
      error.value = apiError
      return
    }
    
    routes.value = data || []
  } catch (err) {
    error.value = err.message || 'Error loading routes'
  } finally {
    loading.value = false
  }
}

function editRoute(route) {
  // Route editing logic
}

async function deleteRoute(id) {
  // Route deletion logic
  try {
    const { error: apiError } = await routesApi.delete({ id })
    
    if (apiError) {
      error.value = apiError
      return false
    }
    
    // Reload routes after deletion
    await loadRoutes()
    return true
  } catch (err) {
    error.value = err.message || 'Error deleting route'
    return false
  }
}

async function handleReorder(reorderData) {
  try {
    const { error: apiError } = await routesApi.post('/reorder', { routes: reorderData })
    
    if (apiError) {
      error.value = apiError
      return false
    }
    
    // Reload routes after reordering
    await loadRoutes()
    return true
  } catch (err) {
    error.value = err.message || 'Error reordering routes'
    return false
  }
}
</script>
```

### Route Create/Edit Form

```vue
<template>
  <form @submit.prevent="saveRoute" class="route-form">
    <div class="form-group">
      <label for="path">Path</label>
      <input 
        id="path" 
        v-model="formData.path" 
        type="text" 
        required
        placeholder="/example-path"
      />
      <div v-if="errors.path" class="error">{{ errors.path }}</div>
    </div>
    
    <div class="form-group">
      <label for="name">Name</label>
      <input 
        id="name" 
        v-model="formData.name" 
        type="text" 
        required
        placeholder="Route name"
      />
      <div v-if="errors.name" class="error">{{ errors.name }}</div>
    </div>
    
    <div class="form-group">
      <label for="component">Component</label>
      <input 
        id="component" 
        v-model="formData.component" 
        type="text"
        placeholder="ComponentName"
      />
      <div v-if="errors.component" class="error">{{ errors.component }}</div>
    </div>
    
    <div class="form-group">
      <label for="parentId">Parent Route</label>
      <select id="parentId" v-model="formData.parentId">
        <option :value="null">No parent</option>
        <option 
          v-for="route in availableParents" 
          :key="route.id" 
          :value="route.id"
        >
          {{ route.name }} ({{ route.path }})
        </option>
      </select>
    </div>
    
    <div class="form-group">
      <label for="orderIndex">Order</label>
      <input 
        id="orderIndex" 
        v-model.number="formData.orderIndex" 
        type="number" 
        min="0"
      />
    </div>
    
    <div class="form-group">
      <label for="isActive">Active</label>
      <input 
        id="isActive" 
        v-model="formData.isActive" 
        type="checkbox"
      />
    </div>
    
    <div class="form-group">
      <label for="meta">Metadata (JSON)</label>
      <textarea 
        id="meta" 
        v-model="metaJson" 
        rows="5"
        placeholder="{}"
      ></textarea>
      <div v-if="errors.meta" class="error">{{ errors.meta }}</div>
    </div>
    
    <div class="form-actions">
      <button type="button" @click="$emit('cancel')" class="btn-cancel">
        Cancel
      </button>
      <button type="submit" class="btn-save" :disabled="loading">
        {{ loading ? 'Saving...' : 'Save' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '@/shared/composables/useApi'
import { Route, RouteFormData } from '@/modules/routes/types'

const props = defineProps({
  routeId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['saved', 'cancel'])

const routesApi = useApi('/dynamic-routes')
const loading = ref(false)
const errors = ref({})
const availableParents = ref([])

// Initial form data
const formData = ref({
  path: '',
  name: '',
  component: '',
  parentId: null,
  orderIndex: 0,
  isActive: true,
  meta: {}
})

// JSON representation of metadata
const metaJson = computed({
  get: () => JSON.stringify(formData.value.meta || {}, null, 2),
  set: (val) => {
    try {
      formData.value.meta = JSON.parse(val)
      errors.value.meta = null
    } catch (err) {
      errors.value.meta = 'Invalid JSON format'
    }
  }
})

// Load data on component mount
onMounted(async () => {
  await loadParents()
  
  if (props.routeId) {
    await loadRoute(props.routeId)
  }
})

// Load available parent routes
async function loadParents() {
  try {
    const { data, error: apiError } = await routesApi.get<Route[]>()
    
    if (apiError) {
      console.error('Error loading parent routes:', apiError)
      return
    }
    
    // Filter current route from parent list
    availableParents.value = (data || []).filter(route => 
      route.id !== props.routeId
    )
  } catch (err) {
    console.error('Error loading parent routes:', err)
  }
}

// Load route data for editing
async function loadRoute(id) {
  loading.value = true
  
  try {
    const { data, error: apiError } = await routesApi.get<Route>({ id })
    
    if (apiError) {
      console.error('Error loading route:', apiError)
      return
    }
    
    if (data) {
      // Fill form with API data
      formData.value = {
        path: data.path,
        name: data.name,
        component: data.component || '',
        parentId: data.parentId,
        orderIndex: data.orderIndex,
        isActive: data.isActive,
        meta: data.meta || {}
      }
    }
  } catch (err) {
    console.error('Error loading route:', err)
  } finally {
    loading.value = false
  }
}

// Save route
async function saveRoute() {
  if (!validateForm()) {
    return
  }
  
  loading.value = true
  
  try {
    let result
    
    if (props.routeId) {
      // Update existing route
      result = await routesApi.put<Route>({ id: props.routeId }, formData.value)
    } else {
      // Create new route
      result = await routesApi.post<Route>(formData.value)
    }
    
    const { data, error: apiError } = result
    
    if (apiError) {
      handleApiError(apiError)
      return
    }
    
    if (data) {
      emit('saved', data)
    }
  } catch (err) {
    console.error('Error saving route:', err)
    errors.value._general = err.message || 'Error saving route'
  } finally {
    loading.value = false
  }
}

// Form validation before submission
function validateForm() {
  errors.value = {}
  
  if (!formData.value.path) {
    errors.value.path = 'Path is required'
  } else if (!formData.value.path.startsWith('/')) {
    errors.value.path = 'Path must start with /'
  }
  
  if (!formData.value.name) {
    errors.value.name = 'Name is required'
  }
  
  return Object.keys(errors.value).length === 0
}

// Handle API errors
function handleApiError(apiError) {
  if (typeof apiError === 'string') {
    errors.value._general = apiError
  } else if (apiError.validationErrors) {
    // Handle validation errors
    for (const field in apiError.validationErrors) {
      errors.value[field] = apiError.validationErrors[field].join(', ')
    }
  } else {
    errors.value._general = apiError.message || 'Error saving route'
  }
}
</script>
```

## Vue Router Integration

Example of integrating dynamic routes with Vue Router:

```typescript
// frontend/src/core/router/dynamic-routes.ts
import { RouteRecordRaw } from 'vue-router'
import { useApi } from '@/shared/composables/useApi'
import { Route } from '@/modules/routes/types'
import DefaultDynamicPage from '@/layouts/system/DefaultDynamicPage.vue'

// Function to load dynamic routes from API
export async function loadDynamicRoutes(): Promise<RouteRecordRaw[]> {
  const routesApi = useApi('/dynamic-routes')
  
  try {
    const { data, error } = await routesApi.get<Route[]>()
    
    if (error) {
      console.error('Error loading dynamic routes:', error)
      return []
    }
    
    if (!data || !Array.isArray(data)) {
      return []
    }
    
    // Convert database routes to Vue Router format
    return data
      .filter(route => route.isActive)
      .map(route => convertToVueRoute(route))
  } catch (err) {
    console.error('Error loading dynamic routes:', err)
    return []
  }
}

// Function to convert database route to Vue Router format
function convertToVueRoute(route: Route): RouteRecordRaw {
  return {
    path: route.path,
    name: `dynamic-${route.id}`,
    component: DefaultDynamicPage,
    meta: {
      ...route.meta,
      dynamicRouteId: route.id,
      component: route.component,
      dynamicRouteName: route.name
    }
  }
}

// Function to add dynamic routes to Vue Router
export async function registerDynamicRoutes(router: any) {
  const routes = await loadDynamicRoutes()
  
  for (const route of routes) {
    // Check if route with this path is not already registered
    if (!router.hasRoute(route.name)) {
      router.addRoute(route)
    }
  }
  
  return routes.length
}
```

Usage in main router file:

```typescript
// frontend/src/core/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { registerDynamicRoutes } from './dynamic-routes'
import staticRoutes from './routes'

const router = createRouter({
  history: createWebHistory(),
  routes: staticRoutes
})

// Register dynamic routes on initialization
registerDynamicRoutes(router).then(count => {
  console.log(`Registered ${count} dynamic routes`)
})

// Middleware to update dynamic routes
router.beforeEach(async (to, from, next) => {
  // If route not found, try to update dynamic routes
  if (to.name === 'not-found') {
    await registerDynamicRoutes(router)
    
    // Check if route appeared after update
    const matchedRoute = router.resolve(to.fullPath)
    if (matchedRoute.name !== 'not-found') {
      return next(to.fullPath) // Redirect to found route
    }
  }
  
  next()
})

export default router
```

## Conclusion

The provided examples demonstrate the main ways to interact with the dynamic routes API. You can adapt them to the specific requirements of your project.

When using the API, pay attention to:
1. Error handling
2. Data typing
3. Input data validation
4. Route cache updating after changes

For more complex usage scenarios, it is recommended to create a separate service for working with routes that will encapsulate the logic of interacting with the API and data processing.