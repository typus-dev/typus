# Sitemap Module

Module for generating XML sitemaps with support for static and dynamic routes.

## Features

- ✅ XML sitemap generation according to sitemaps.org standard
- ✅ Static routes support from frontend
- ✅ Dynamic routes support from database
- ✅ Automatic URL deduplication by priority
- ✅ HTML Cache Generator integration
- ✅ Input validation using Zod
- ✅ Error handling and service unavailability management
- ✅ Sitemap statistics

## API Endpoints

### POST /api/sitemap/generate

Generates XML sitemap and saves it to `/public/sitemap.xml`.

**Request parameters:**
```json
{
  "options": {
    "includeStaticRoutes": true,    // include static routes
    "includeDynamicRoutes": true,   // include dynamic routes
    "generateCache": false,         // generate HTML cache for all URLs
    "baseUrl": "https://example.com"  // site base URL
  }
}
```

**Example response:**
```json
{
  "success": true,
  "stats": {
    "totalUrls": 25,
    "staticRoutes": 15,
    "dynamicRoutes": 10,
    "lastGenerated": "2023-12-01T10:30:00.000Z",
    "generationTime": 1250
  },
  "sitemapUrl": "https://example.com/sitemap.xml",
  "cacheGenerated": false
}
```

### GET /api/sitemap/stats

Gets current sitemap statistics.

**Example response:**
```json
{
  "totalUrls": 25,
  "staticRoutes": 0,
  "dynamicRoutes": 0,
  "lastGenerated": "2023-12-01T10:30:00.000Z"
}
```

## Usage

### Generate sitemap with default settings

```bash
curl -X POST https://example.com/api/sitemap/generate \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Generate sitemap with static routes only

```bash
curl -X POST https://example.com/api/sitemap/generate \
  -H "Content-Type: application/json" \
  -d '{
    "options": {
      "includeStaticRoutes": true,
      "includeDynamicRoutes": false
    }
  }'
```

### Generate sitemap with HTML caching

```bash
curl -X POST https://example.com/api/sitemap/generate \
  -H "Content-Type: application/json" \
  -d '{
    "options": {
      "generateCache": true
    }
  }'
```

### Get statistics

```bash
curl https://example.com/api/sitemap/stats
```

## Configuration

The module uses the following environment variables:

- `FRONTEND_URL` - frontend service URL (default: `http://service_frontend:3000`)
- `SITE_BASE_URL` - site base URL (default: `https://example.com`)
- `PROJECT_PATH` - project path (default: `/app`)
- `HTML_CACHE_GENERATOR_URL` - HTML cache generator service URL

## XML Sitemap Structure

The generated sitemap follows the sitemaps.org standard:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2023-12-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2023-12-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

## Data Sources

### Static Routes

Retrieved from `{FRONTEND_URL}/routes.json` in the format:
```json
[
  {
    "name": "Home",
    "path": "/",
    "priority": 1.0,
    "changefreq": "daily"
  }
]
```

### Dynamic Routes

Retrieved from database via DynamicRouterService. Only active routes are used (`isActive: true`).

## Error Handling

The module gracefully handles the following situations:

- ❌ Frontend service unavailable
- ❌ routes.json file not found
- ❌ Database errors
- ❌ File system errors
- ❌ HTML Cache Generator unavailability

In case of errors, the sitemap is still generated with available data, and errors are returned in the `errors` field.

## Automatic Registration

The module is automatically registered in the system thanks to the automatic module discovery mechanism. No additional configuration is required.