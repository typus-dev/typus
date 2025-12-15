# CMS Module Development Roadmap

This document outlines the evolution of the current blog and dynamic routing system into a comprehensive Content Management System (CMS). The roadmap reflects the current implementation status and future development plans.

## Current Implementation Status

### ✅ Implemented Features

- **Base CMS Model**: CmsItem with title, slug, status, content, sitePath, metadata fields
- **Dynamic Routing System**: DynamicRouterService for managing content routes
- **DSL Integration**: Universal DSL system for model operations
- **Hooks System**: Event-driven hooks for CMS operations (beforeCreate, afterCreate, afterUpdate, afterDelete)
- **Content-Route Linking**: Automatic route creation/update via hooks
- **Basic Taxonomy**: Categories and tags support
- **Public Content Access**: isPublic field for controlling content visibility
- **Frontend Module**: Complete Vue.js frontend with edit/management/view pages
- **Content Types**: Document, Download, Product, News types supported

### 🔄 Partially Implemented

- **Access Control**: Basic public/private content, needs role-based permissions
- **Media Management**: Basic media model exists, needs file upload/management
- **Content Metadata**: Flexible metadata field exists, needs structured schemas

### ❌ Not Yet Implemented

- **Navigation System**: Menu and MenuItem models for site navigation
- **Advanced Taxonomy**: Hierarchical categories with parent-child relationships
- **Content Type Handlers**: Specialized rendering logic for different content types
- **API Controllers**: Dedicated REST API endpoints for content management
- **Admin Interface**: Comprehensive admin panel for content management

## 1. Core CMS Architecture

### 1.1. Current Content Model

```typescript
// Current implementation in shared/dsl/models/cms/cms-item.model.ts
interface CmsItem {
  id: number;
  title: string;
  slug: string;
  typeId: number;
  status: 'draft' | 'published' | 'archived';
  content: string;
  sitePath: string;
  isPublic: boolean;
  metadata: Record<string, any>; // Flexible field for type-specific data
  createdAt: Date;
  updatedAt: Date;
  createdBy?: number;
  updatedBy?: number;
}
```

### 1.2. Content Type Extension via Metadata

Instead of separate tables for each content type, the current implementation uses the flexible `metadata` field:

```typescript
// Document content
const documentItem = {
  type: 'document',
  metadata: {
    summary: string;
    tableOfContents: boolean;
    downloadable: boolean;
  }
};

// Product content
const productItem = {
  type: 'product',
  metadata: {
    price: number;
    currency: string;
    inventory: number;
    images: string[];
    specifications: Record<string, any>;
  }
};

// Download content
const downloadItem = {
  type: 'download',
  metadata: {
    fileUrl: string;
    fileSize: number;
    fileType: string;
    downloadCount: number;
  }
};
```

### 1.3. Current Hooks System

```typescript
// Implemented in backend/src/modules/cms/dsl/cms.hooks.dsl.ts
export async function beforeCreateCmsItemHandler(data: any): Promise<any> {
  // Remove problematic type field
  if (data.type) delete data.type;
  return data;
}

export async function afterCreateCmsItemHandler(cmsItem: CmsItemData): Promise<CmsItemData> {
  // Auto-create dynamic route for published content
  if (cmsItem.sitePath && cmsItem.status === 'published') {
    await dynamicRouterService.createRoute({
      path: cmsItem.sitePath,
      name: cmsItem.title,
      component: 'ContentDisplay',
      meta: { cmsItemId: cmsItem.id }
    });
  }
  return cmsItem;
}
```

## 2. Frontend Architecture

### 2.1. Current Module Structure

```
frontend/src/modules/cms/
├── cms.menu.ts                    # ✅ Menu configuration
├── components/
│   └── ContentDisplay.vue         # ✅ Content rendering component
├── config.dsx/
│   └── cms-methods.dsx.ts         # ✅ DSL API methods
├── pages/
│   ├── edit/[id].vue             # ✅ Content creation/editing
│   ├── management/index.vue       # ✅ Content listing
│   └── view/[id].vue             # ✅ Content viewing
└── types/index.ts                # ✅ TypeScript definitions
```

### 2.2. Content Rendering Flow

```vue
<!-- Current implementation in ContentDisplay.vue -->
<template>
  <div class="content-display">
    <component 
      :is="getContentComponent(content.type)" 
      :content="content"
      :metadata="content.metadata"
    />
  </div>
</template>

<script setup>
// Dynamic component selection based on content type
const getContentComponent = (type: string) => {
  switch (type) {
    case 'document': return 'DocumentRenderer';
    case 'product': return 'ProductRenderer';
    case 'download': return 'DownloadRenderer';
    default: return 'DefaultRenderer';
  }
};
</script>
```

## 3. Database Schema (Current)

### 3.1. Existing Tables

```sql
-- Main content table
CREATE TABLE `cms.items` (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  type_id INT REFERENCES `cms.item_types`(id),
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  content TEXT,
  site_path VARCHAR(255),
  is_public BOOLEAN DEFAULT FALSE,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  updated_by INT,
  UNIQUE KEY unique_slug_type (slug, type_id)
);

-- Content types
CREATE TABLE `cms.item_types` (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  schema JSON -- Metadata schema for validation
);

-- Categories (hierarchical)
CREATE TABLE `cms.categories` (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  parent_id INT REFERENCES `cms.categories`(id),
  description TEXT,
  metadata JSON
);

-- Tags
CREATE TABLE `cms.tags` (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT
);

-- Dynamic routes
CREATE TABLE `system.dynamic_routes` (
  id VARCHAR(36) PRIMARY KEY,
  path VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  component VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  parent_id VARCHAR(36),
  order_index INT DEFAULT 0,
  meta JSON
);
```

## 4. Development Roadmap

### Phase 1: Core Enhancements (Next Sprint)

#### 4.1. Navigation System
```typescript
// TODO: Implement navigation models
interface Menu {
  id: number;
  name: string;
  location: 'header' | 'footer' | 'sidebar';
  isActive: boolean;
  items: MenuItem[];
}

interface MenuItem {
  id: number;
  menuId: number;
  title: string;
  type: 'link' | 'content' | 'category' | 'dropdown';
  url?: string;
  contentId?: number;
  categoryId?: number;
  parentId?: number;
  orderIndex: number;
  visibleTo: 'all' | 'authenticated' | 'guest';
  roles?: string[];
}
```

#### 4.2. Enhanced Access Control
```typescript
// TODO: Extend current access control
interface AccessRule {
  id: number;
  contentId: number;
  type: 'role' | 'user' | 'public';
  value: string;
  permission: 'read' | 'write' | 'delete';
}
```

### Phase 2: Content Type Handlers (Future)

#### 2.1. Specialized Renderers
```typescript
// TODO: Implement content type handlers
interface ContentTypeHandler {
  render(content: CmsItem, context: RenderContext): Promise<ComponentDefinition>;
  validate(metadata: any): ValidationResult;
  getSchema(): MetadataSchema;
}

class DocumentHandler implements ContentTypeHandler {
  async render(content: CmsItem) {
    return {
      component: 'DocumentRenderer',
      props: {
        content: await this.processMarkdown(content.content),
        toc: content.metadata.tableOfContents,
        downloadable: content.metadata.downloadable
      }
    };
  }
}
```

### Phase 3: Advanced Features (Future)

#### 3.1. Content Versioning
```sql
-- TODO: Add versioning support
CREATE TABLE `cms.item_versions` (
  id INT PRIMARY KEY AUTO_INCREMENT,
  item_id INT REFERENCES `cms.items`(id),
  version_number INT NOT NULL,
  title VARCHAR(255),
  content TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT,
  INDEX idx_item_version (item_id, version_number)
);
```

#### 3.2. Workflow Management
```typescript
// TODO: Implement content workflow
interface WorkflowState {
  id: number;
  name: string;
  description: string;
  isInitial: boolean;
  isFinal: boolean;
  allowedTransitions: number[];
}

interface ContentWorkflow {
  id: number;
  contentId: number;
  currentStateId: number;
  assignedTo?: number;
  dueDate?: Date;
  notes?: string;
}
```

## 5. API Enhancement Plan

### 5.1. Current DSL Integration
The system currently uses DSL methods for all CRUD operations:

```typescript
// Current implementation in cms-methods.dsx.ts
export const cmsItemMethods = {
  create: (data: Partial<ICmsItem>) => dslClient.execute('CmsItem', 'create', data),
  read: (filter?: any) => dslClient.execute('CmsItem', 'read', undefined, filter),
  update: (id: number, data: Partial<ICmsItem>) => dslClient.execute('CmsItem', 'update', data, { id }),
  delete: (id: number) => dslClient.execute('CmsItem', 'delete', undefined, { id })
};
```

### 5.2. Planned REST API Controllers
```typescript
// TODO: Add dedicated CMS controllers
@Controller('/api/cms')
export class CmsController {
  @Get('/content')
  async getContent(@Query() query: ContentQuery) {
    // Enhanced content retrieval with filtering, sorting, pagination
  }

  @Post('/content/:id/publish')
  async publishContent(@Param('id') id: number) {
    // Content publishing workflow
  }

  @Get('/content/:id/preview')
  async previewContent(@Param('id') id: number) {
    // Content preview without publishing
  }
}
```

## 6. Migration Strategy

### 6.1. Current System Strengths
- ✅ Flexible metadata-based content types
- ✅ Automatic route management via hooks
- ✅ Clean DSL integration
- ✅ Vue.js frontend with proper routing

### 6.2. Incremental Enhancement Plan

1. **Phase 1**: Add navigation system and enhanced access control
2. **Phase 2**: Implement content type handlers and specialized renderers
3. **Phase 3**: Add versioning, workflow, and advanced admin features
4. **Phase 4**: Performance optimization and caching

### 6.3. Backward Compatibility
All enhancements will maintain backward compatibility with existing content and APIs.

## 7. Content Types Roadmap

### 7.1. Currently Supported
- **Document**: Text content with markdown support
- **Download**: File downloads with metadata
- **Product**: Product listings with pricing
- **News**: News articles with publication dates

### 7.2. Planned Extensions
- **Gallery**: Image galleries with captions
- **Video**: Video content with embedding
- **Form**: Dynamic forms with validation
- **Landing Page**: Marketing landing pages
- **FAQ**: Question-answer pairs
- **Testimonial**: Customer testimonials

## 8. Performance Considerations

### 8.1. Current Optimizations
- Metadata field for flexible content storage
- Efficient DSL query system
- Component-based frontend rendering

### 8.2. Planned Optimizations
- Content caching layer
- Image optimization pipeline
- Search indexing for content discovery
- CDN integration for media files

## Conclusion

The current CMS implementation provides a solid foundation with flexible content modeling, automatic route management, and clean frontend integration. The roadmap focuses on incremental enhancements while maintaining the system's core strengths and architectural principles.

The modular approach allows for gradual feature addition without disrupting existing functionality, making it suitable for both immediate use and long-term evolution.
