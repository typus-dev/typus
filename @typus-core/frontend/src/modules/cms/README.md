# CMS Module

## Overview

The CMS (Content Management System) module provides a flexible and extensible system for managing various types of content within the application. It allows administrators to create, edit, publish, and organize content that can be displayed on the website through dynamic routing.

## Architecture

The CMS module follows a modular architecture that integrates with the core application framework. It is designed to be extensible, allowing for the addition of new content types and display components.

### Key Components

```
frontend/src/modules/cms/
├── cms.menu.ts           # Menu configuration for the CMS module
├── components/           # Reusable UI components
│   └── ContentDisplay.vue # Component for rendering content
├── config.dsx/           # API integration
│   └── cms-methods.dsx.ts # DSL methods for CMS operations
├── pages/                # Vue pages for the CMS module
│   ├── edit/             # Content editing pages
│   │   └── [id].vue      # Dynamic page for creating/editing content
│   ├── management/       # Content management pages
│   │   └── index.vue     # Content listing and management
│   └── view/             # Content viewing pages
│       └── [id].vue      # Dynamic page for viewing content
└── types/                # TypeScript type definitions
    └── index.ts          # CMS data models and interfaces
```

## Data Model

The CMS is built around a flexible content model that can accommodate various types of content:

- **Content Items**: The base entity representing any piece of content (documents, products, downloads, etc.)
- **Categories**: For organizing content hierarchically
- **Tags**: For flexible content classification
- **Media**: For managing images, documents, and other media files
- **Menus**: For creating navigation structures

## Component Interaction

### Content Flow

1. **Creation/Editing**: Content is created or edited through the `/cms/edit/[id]` page
2. **Storage**: Content is stored via the DSL API methods in `cms-methods.dsx.ts`
3. **Management**: Content is listed and managed through the `/cms/management` page
4. **Display**: Content is rendered using the `ContentDisplay.vue` component
5. **Routing**: Content is accessible via dynamic routes based on the content's `sitePath`

### Data Flow

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Edit Page      │─────▶│  DSL Methods    │─────▶│  Backend API    │
│  [id].vue       │      │  cms-methods.dsx│      │                 │
│                 │◀─────│                 │◀─────│                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                                                  │
        │                                                  │
        ▼                                                  ▼
┌─────────────────┐                              ┌─────────────────┐
│                 │                              │                 │
│  Management     │                              │  Database       │
│  index.vue      │                              │                 │
│                 │                              │                 │
└─────────────────┘                              └─────────────────┘
        │                                                  ▲
        │                                                  │
        ▼                                                  │
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  View Page      │─────▶│  ContentDisplay │─────▶│  Dynamic Router │
│  [id].vue       │      │  Component      │      │                 │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Integration Points

### Menu Integration

The CMS module integrates with the application's menu system through `cms.menu.ts`, which defines the navigation structure for the CMS module.

### Dynamic Routing

Content created in the CMS can be accessed through dynamic routes based on the content's `sitePath` property. The application's router automatically maps these paths to the appropriate content.

### DSL Integration

The CMS module uses the DSL (Domain-Specific Language) client to communicate with the backend API. This is implemented in `cms-methods.dsx.ts`, which provides methods for CRUD operations on CMS entities.

## Content Types

The CMS supports various content types, each with its own schema and rendering logic:

- **Document**: Text-based content with rich formatting
- **Download**: Files available for download
- **Product**: Products with descriptions, images, and pricing
- **News**: News articles with publication dates

## Usage Examples

### Creating a New Content Item

1. Navigate to `/cms/create`
2. Fill in the content details (title, slug, content, etc.)
3. Select the content type and status
4. Save the content

### Viewing Content

1. Navigate to `/cms/content` to see all content items
2. Click on a content item to view its details
3. The content is rendered using the appropriate component based on its type

### Publishing Content

1. Edit a content item
2. Change its status to "published"
3. The content becomes available on its designated site path

## Extending the CMS

### Adding a New Content Type

1. Update the `ICmsItemType` interface in `types/index.ts`
2. Add the new type to the `typeOptions` array in the edit page
3. Implement any specific rendering logic in `ContentDisplay.vue`

### Adding Custom Fields

1. Extend the appropriate interface in `types/index.ts`
2. Update the edit form in `pages/edit/[id].vue`
3. Update the DSL methods in `cms-methods.dsx.ts` to handle the new fields

## Best Practices

1. **Content Organization**: Use categories and tags to organize content effectively
2. **SEO Optimization**: Fill in metadata fields for better search engine visibility
3. **Content Reuse**: Create reusable content blocks that can be embedded in multiple places
4. **Performance**: Optimize media files before uploading them to the CMS
5. **Security**: Follow the principle of least privilege when setting content access rules
