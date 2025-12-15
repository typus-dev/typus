# HTML Cache Module

The HTML Cache module provides server-side HTML caching functionality for SEO optimization and performance improvement. It uses Puppeteer to generate static HTML files from your Vue.js SPA routes.

## Features

- **Static HTML Generation**: Uses Puppeteer to render complete HTML pages
- **Cache Management**: Generate, invalidate, and manage cache files
- **SEO Optimization**: Provides crawlable HTML for search engines
- **Performance**: Serves cached HTML for faster page loads
- **Admin Interface**: RESTful API for cache management
- **Batch Operations**: Warm cache for multiple URLs at once
- **Health Monitoring**: Track cache usage and performance

## API Endpoints

### Generate Cache
```http
POST /api/html-cache/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "/blog/post-1",
  "priority": "high",
  "force": true
}
```

### Invalidate Cache
```http
DELETE /api/html-cache/invalidate
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "/blog/post-1"
}
```

### Get Statistics
```http
GET /api/html-cache/stats?detailed=true
Authorization: Bearer <token>
```

### Clear All Cache
```http
DELETE /api/html-cache/clear
Authorization: Bearer <token>
```

### Warm Cache
```http
POST /api/html-cache/warm
Authorization: Bearer <token>
Content-Type: application/json

{
  "urls": ["/", "/about", "/blog"],
  "priority": "normal"
}
```

### Check Cache Status
```http
GET /api/html-cache/check/blog%2Fpost-1
Authorization: Bearer <token>
```

### Health Status
```http
GET /api/html-cache/health
Authorization: Bearer <token>
```

## Environment Variables

```bash
# Enable/disable HTML caching
HTML_CACHE_ENABLED=true

# Cache TTL in seconds
HTML_CACHE_TTL=3600

# Maximum cache size in MB
HTML_CACHE_MAX_SIZE_MB=500

# Puppeteer timeout in milliseconds
PUPPETEER_TIMEOUT=30000

# Viewport dimensions for rendering
PUPPETEER_VIEWPORT_WIDTH=1200
PUPPETEER_VIEWPORT_HEIGHT=800

# Frontend URL for rendering
FRONTEND_URL=http://localhost:5173
```

## Cache Storage

Cache files are stored in the following structure:
```
storage/cache/html/
├── index/
│   └── index.html
├── blog/
│   └── index.html
└── blog/
    └── post-1/
        └── index.html
```

## Usage Examples

### Generate cache for a specific URL
```typescript
import { HtmlCacheService } from '@/modules/html-cache';

const cacheService = container.resolve(HtmlCacheService);
await cacheService.generateCacheForUrl('/blog/post-1', 'high', true);
```

### Invalidate cache when content changes
```typescript
// In your content update handler
await cacheService.invalidateUrl('/blog/post-1');
```

### Warm cache for all routes
```typescript
await cacheService.warmCache();
```

## Integration with Dynamic Router

The HTML Cache module can be integrated with the Dynamic Router to automatically:
- Generate cache when new routes are created
- Invalidate cache when routes are updated
- Remove cache when routes are deleted

## Performance Considerations

- Cache generation is CPU intensive due to Puppeteer rendering
- Use priority levels to manage resource usage
- Monitor cache size to prevent disk space issues
- Consider using a queue system for batch operations

## Security

- All endpoints require admin authentication
- Cache files are stored outside the web root
- Input validation prevents path traversal attacks
- Rate limiting recommended for cache operations

## Troubleshooting

### Common Issues

1. **Puppeteer fails to launch**
   - Ensure Chrome/Chromium dependencies are installed
   - Check Docker container has necessary permissions

2. **Cache generation timeout**
   - Increase `PUPPETEER_TIMEOUT` value
   - Check frontend application startup time

3. **High memory usage**
   - Reduce batch size for warm cache operations
   - Monitor Puppeteer browser instances

### Debug Logging

Enable debug logging to troubleshoot issues:
```bash
LOG_LEVEL=debug
```

## Future Enhancements

- [ ] Redis-based cache invalidation
- [ ] CDN integration
- [ ] Automatic cache warming schedules
- [ ] Cache compression
- [ ] Multi-language support
- [ ] Cache versioning
