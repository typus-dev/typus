# Modular Layout System

This system allows modules to define and register their own layouts, which are then available globally throughout the application.

## Core Components

### LayoutRegistry

A singleton class that stores and provides access to all registered layouts.

```typescript
import { layoutRegistry } from '@/core/layouts'

// Check if a layout exists
if (layoutRegistry.has('my-layout')) {
  // Get a layout component
  const MyLayout = layoutRegistry.get('my-layout')
}
```

### LayoutWrapper

A Vue component that renders the appropriate layout based on the current route's meta.layout property.

```vue
<template>
  <LayoutWrapper>
    <router-view />
  </LayoutWrapper>
</template>
```

### useLayout

A composable for working with layouts in Vue components.

```typescript
import { useLayout } from '@/core/layouts'

const { currentLayout, hasLayout, getLayout } = useLayout()
```

## Using Layouts in Routes

Layouts are specified in route metadata:

```typescript
const routes = [
  {
    path: '/my-page',
    component: MyPage,
    meta: {
      layout: 'my-layout' // Will use the layout registered with this name
    }
  }
]
```

If no layout is specified, the auth middleware will set a default layout based on authentication status:
- For authenticated users: 'private'
- For unauthenticated users: 'default'

## Creating Module Layouts

### 1. Create Layout Components

Create your layout components in your module's `layouts` directory:

```
src/modules/my-module/
  └── layouts/
      ├── MyModuleLayout.vue
      └── MyModuleSpecialLayout.vue
```

### 2. Create a Registration File

Create an `index.ts` file in your module's layouts directory:

```typescript
// src/modules/my-module/layouts/index.ts
import { registerModuleLayout } from '@/core/layouts/module-layouts-loader'
import MyModuleLayout from './MyModuleLayout.vue'
import MyModuleSpecialLayout from './MyModuleSpecialLayout.vue'
import { logger } from '@/core/logging/logger'

export function registerLayouts(): void {
  logger.debug('[my-module/layouts] Registering layouts', {})
  
  registerModuleLayout('my-module', 'default', MyModuleLayout, {
    description: 'Default layout for My Module'
  })
  
  registerModuleLayout('my-module', 'special', MyModuleSpecialLayout, {
    description: 'Special layout for My Module'
  })
}
```

### 3. Use in Routes

In your module's routes, reference the layouts using the naming convention `{module-name}-{layout-name}`:

```typescript
const routes = [
  {
    path: '/my-module',
    component: MyModuleHome,
    meta: {
      layout: 'my-module-default'
    }
  },
  {
    path: '/my-module/special',
    component: MyModuleSpecial,
    meta: {
      layout: 'my-module-special'
    }
  }
]
```

## Layout Auto-Discovery

The system automatically discovers and registers layouts from all modules at application startup. It looks for `layouts/index.ts` files in each module directory and calls their `registerLayouts` function.

## Error Handling

If a route specifies a layout that doesn't exist, the system will fall back to the 'default' layout and log a warning.
