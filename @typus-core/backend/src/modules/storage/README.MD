# File Manager Module Documentation

The File Manager module provides comprehensive file management capabilities for the Typus platform, including both legacy file operations and the new universal storage system with GUID-based file access and rich metadata management.

## Architecture Overview

### File Structure
```
@typus-core/backend/src/modules/file-manager/
├── services/
│   ├── FileSystemService.ts     # Legacy file operations (avatar uploads, basic file management)
│   └── StorageService.ts        # Universal storage with DSL integration and metadata
├── controllers/
│   └── FileManagerController.ts # Combined endpoints for both legacy and new storage
└── FileManagerModule.ts         # Module configuration and dependency registration
```

### Storage Organization
```
/uploads
  /users
    /{user_id}
      /{year}
        /{month}
          /{timestamp}_{uuid}.{extension}
```

---

## Universal Storage System

### DSL Model: StorageFile

Located in `@typus-core/shared/dsl/models/storage/storage-file.model.ts`

#### Core Fields
- **id**: string (GUID) - Unique file identifier
- **originalName**: string - Original filename from upload
- **fileName**: string - Stored filename (with timestamp and UUID)
- **mimeType**: string - File MIME type
- **size**: number - File size in bytes

#### Storage Fields
- **storageProvider**: string - Storage backend ('LOCAL', 'GOOGLE_DRIVE', 'GCS', etc.)
- **storagePath**: string - Relative path in storage system
- **url**: string - Public URL for external access
- **checksum**: string - File integrity verification

#### Access Control
- **visibility**: string - 'PRIVATE' or 'PUBLIC'
- **userId**: number - File owner (relation to AuthUser)

#### Module Context
- **moduleContext**: string - Originating module ('blog', 'cms', 'context', etc.)
- **contextId**: string - Specific context within module

#### Metadata
- **tags**: string[] - Searchable tags
- **description**: string - File description
- **status**: string - 'ACTIVE', 'DELETED', 'EXPIRED'

#### Lifecycle
- **uploadedAt**: Date - Upload timestamp
- **deletedAt**: Date - Soft deletion timestamp
- **expiresAt**: Date - Optional expiration date

---

## Services

### StorageService (New Universal System)

#### Core Methods

##### File Upload with Metadata
```typescript
async saveFileWithMetadata(
    file: UploadedFile, 
    userId: number, 
    context?: FileUploadContext
): Promise<StorageFile>
```

**Usage Example:**
```typescript
const storageFile = await storageService.saveFileWithMetadata(file, userId, {
    moduleContext: 'blog',
    contextId: 'post-123',
    visibility: 'PUBLIC',
    tags: ['featured', 'image'],
    description: 'Blog post featured image',
    expiresAt: new Date('2025-12-31')
});
```

##### Get User Files with Filtering
```typescript
async getUserFiles(
    userId: number, 
    filters?: {
        moduleContext?: string;
        contextId?: string;
        visibility?: string;
        mimeType?: string;
    }
): Promise<StorageFile[]>
```

**Usage Example:**
```typescript
// Get all blog images for user
const blogImages = await storageService.getUserFiles(userId, {
    moduleContext: 'blog',
    mimeType: 'image'
});

// Get all public files
const publicFiles = await storageService.getUserFiles(userId, {
    visibility: 'PUBLIC'
});
```

##### Secure File Access by GUID
```typescript
async getFileById(fileId: string, requestUserId: number): Promise<{
    file: StorageFile;
    buffer: Buffer;
    mimeType: string;
}>
```

##### Update File Metadata
```typescript
async updateFileMetadata(
    fileId: string, 
    userId: number, 
    updates: Partial<FileUploadContext>
): Promise<StorageFile>
```

##### Soft Delete File
```typescript
async deleteFileById(fileId: string, userId: number): Promise<boolean>
```

##### Generate Public URL
```typescript
async generatePublicUrl(fileId: string): Promise<string>
```

### FileSystemService (Legacy System)

Maintains backward compatibility for existing avatar upload functionality and basic file operations.

#### Methods
- `saveFile()` - Basic file saving with structured path
- `getFile()` - File retrieval with access validation
- `deleteFile()` - File deletion

---

## API Endpoints

### New Storage Endpoints (GUID-based)

#### Upload File with Metadata
```http
POST /api/storage/storage
Content-Type: multipart/form-data

Body:
- file: [file]
- moduleContext: 'blog'
- contextId: 'post-123'
- visibility: 'PUBLIC'
- tags: '["featured", "image"]'
- description: 'Blog featured image'
- expiresAt: '2025-12-31T00:00:00Z'
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "featured-image.jpg",
    "fileName": "1694287200000_550e8400-e29b-41d4-a716-446655440000.jpg",
    "mimeType": "image/jpeg",
    "size": 1024000,
    "storageProvider": "LOCAL",
    "storagePath": "users/1/2025/09/1694287200000_550e8400-e29b-41d4-a716-446655440000.jpg",
    "visibility": "PUBLIC",
    "userId": 1,
    "moduleContext": "blog",
    "contextId": "post-123",
    "tags": ["featured", "image"],
    "description": "Blog featured image",
    "status": "ACTIVE",
    "uploadedAt": "2025-09-09T22:00:00Z"
  }
}
```

#### Get User Files with Filters
```http
GET /api/storage/storage?moduleContext=blog&visibility=PUBLIC&mimeType=image
```

#### Access File by GUID
```http
GET /api/storage/550e8400-e29b-41d4-a716-446655440000
```

Returns the file content with appropriate headers.

#### Update File Metadata
```http
PUT /api/storage/550e8400-e29b-41d4-a716-446655440000/metadata
Content-Type: application/json

{
  "visibility": "PRIVATE",
  "description": "Updated description",
  "tags": ["updated", "tag"]
}
```

#### Delete File
```http
DELETE /api/storage/550e8400-e29b-41d4-a716-446655440000
```

#### Generate Public URL
```http
POST /api/storage/550e8400-e29b-41d4-a716-446655440000/public-url
```

**Response:**
```json
{
  "success": true,
  "publicUrl": "/api/storage/550e8400-e29b-41d4-a716-446655440000"
}
```

### Legacy Endpoints (Maintained for Backward Compatibility)

#### Upload File (Legacy)
```http
POST /api/storage/upload
Content-Type: multipart/form-data
```

#### View File (Legacy)
```http
GET /api/storage/view/users/1/2025/09/filename.jpg
```

#### Delete File (Legacy)
```http
DELETE /api/storage/delete
Content-Type: application/json

{
  "filePath": "users/1/2025/09/filename.jpg"
}
```

---

## Module Integration Examples

### Blog Module
```typescript
// Upload featured image for blog post
const featuredImage = await storageService.saveFileWithMetadata(file, userId, {
    moduleContext: 'blog',
    contextId: `post-${postId}`,
    visibility: 'PUBLIC',
    description: 'Featured image for blog post',
    tags: ['featured', 'blog']
});

// Get all images for a specific blog post
const postImages = await storageService.getUserFiles(userId, {
    moduleContext: 'blog',
    contextId: `post-${postId}`
});
```

### CMS Module
```typescript
// Upload media to CMS library
const mediaFile = await storageService.saveFileWithMetadata(file, userId, {
    moduleContext: 'cms',
    contextId: 'media-library',
    visibility: 'PUBLIC',
    description: 'CMS media asset',
    tags: ['cms', 'media']
});

// Get all CMS media files
const cmsMedia = await storageService.getUserFiles(userId, {
    moduleContext: 'cms'
});
```

### Context Module (Temporary Files)
```typescript
// Create temporary file for processing
const tempFile = await storageService.saveFileWithMetadata(file, userId, {
    moduleContext: 'context',
    contextId: 'temp-processing',
    visibility: 'PRIVATE',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour
    description: 'Temporary file for base64 generation'
});
```

### Avatar System Integration
```typescript
// Upload user avatar
const avatar = await storageService.saveFileWithMetadata(file, userId, {
    moduleContext: 'auth',
    contextId: 'avatar',
    visibility: 'PUBLIC',
    description: 'User profile avatar'
});

// Update user profile with avatar URL
await userService.updateProfile(userId, {
    avatarUrl: `/api/storage/${avatar.id}`
});
```

---

## Security Features

### Access Control
- **User ownership validation** - Only file owners can access private files
- **Permission checking** on every file access request
- **Module context isolation** for organizational security
- **GUID-based URLs** prevent path traversal attacks

### File Validation
- **MIME type validation** with configurable allowed types
- **File size limits** (5MB default, configurable)
- **Secure filename generation** with UUID and timestamp
- **Input sanitization** for all metadata fields

### Storage Security
- **No direct path exposure** through GUID-based access
- **Structured directory organization** prevents conflicts
- **Soft deletion** maintains audit trail
- **Expiration support** for temporary files

---

## Storage Providers

### Current: LOCAL Provider
- **File system storage** in `/uploads` directory
- **Structured organization** by user, year, month
- **Unique naming** with timestamp and UUID
- **Direct file serving** through Express

### Future: Cloud Providers (Architecture Ready)
- **Google Drive** integration prepared
- **Google Cloud Storage** support ready
- **CDN integration** architecture in place
- **Configuration-based** provider selection

---

## Database Schema

### Table: `files`
Generated automatically from DSL model with Prisma.

#### Indexes
- **Primary:** `id` (GUID)
- **User files:** `userId + status`
- **Module context:** `moduleContext + contextId`
- **Visibility:** `visibility + status`

#### Relations
- **User:** Many-to-one relationship with `AuthUser`

---

## Error Handling

### Common Error Responses
```json
{
  "error": "File not found",
  "code": "NOT_FOUND"
}

{
  "error": "You do not have permission to access this file",
  "code": "UNAUTHORIZED"
}

{
  "error": "Only image files are allowed",
  "code": "BAD_REQUEST"
}
```

### Error Types
- **BadRequestError** - Invalid file type, missing file, validation errors
- **UnauthorizedError** - Permission denied, authentication required
- **NotFoundError** - File not found, invalid GUID

---

## Avatar Upload Implementation (Legacy)

### Server Side
- **FileSystemService** for structured file storage
- **AuthController integration** with `/auth/avatar` endpoint
- **User profile updates** with `avatarUrl` field

### Client Side
- **User interface updates** in `authStore`
- **Profile dropdown component** displays avatar or initials
- **Automatic fallback** to user initials when no avatar

### Security and Validation
- **Image-only validation** (JPEG, PNG, GIF, WebP)
- **5MB file size limit**
- **User authorization checks**
- **Unique filename generation**

---

## Best Practices

### For Module Developers
1. **Use StorageService** for new implementations
2. **Set appropriate moduleContext** for organization
3. **Use visibility controls** for security
4. **Add descriptive metadata** for better organization
5. **Handle expiration** for temporary files

### For File Management
1. **GUID-based access** for security
2. **Metadata enrichment** for better searchability
3. **Proper error handling** for user experience
4. **Access control validation** before operations

### For Performance
1. **Filter queries** to reduce data transfer
2. **Use appropriate indexes** for database queries
3. **Cache public URLs** where possible
4. **Stream large files** instead of loading into memory

---

## Testing and Development

### Unit Tests
- **Service method coverage** for all CRUD operations
- **Access control validation** for security scenarios
- **Error handling verification** for edge cases

### Integration Tests
- **End-to-end upload flows** with metadata
- **Multi-module file sharing** scenarios
- **File access permission validation**

### Development Tools
- **Comprehensive logging** for debugging
- **Type safety** with TypeScript interfaces
- **Error tracking** with structured error responses

This filesystem module provides a robust, secure, and scalable foundation for file management across the entire Typus platform, supporting both legacy operations and modern storage requirements with rich metadata and modular integration capabilities.
