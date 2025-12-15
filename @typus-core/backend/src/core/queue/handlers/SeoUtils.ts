import { ILogger } from '@/core/logger/ILogger';
import { executeWithRetry, RetryableError } from '@/core/utils/RetryHandler';
import { prisma } from '@/core/database/prisma';

/**
 * SEO Data structure
 */
export interface SeoData {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  robots?: string;
  og?: {
    title?: string;
    description?: string;
    url?: string;
    type?: string;
    image?: string;
  };
  schema?: {
    type: string;
    data: any;
  };
}

/**
 * Fetch SEO data for a page from CMS
 *
 * @param sitePath - Site path (e.g., "/blog/post-1")
 * @param logger - Logger instance
 * @returns SEO data or null
 */
export async function fetchSeoData(
  sitePath: string,
  logger: ILogger
): Promise<SeoData | null> {
  try {
    logger.info('[SeoUtils] Fetching SEO data', { sitePath });

    return await executeWithRetry(
      async () => {
        // FIXED: Use Prisma directly instead of HTTP request
        const item = await prisma.cmsItem.findFirst({
          where: {
            sitePath,
            status: 'published'
          },
          select: {
            id: true,
            title: true,
            metaDescription: true,
            metaKeywords: true,
            canonicalUrl: true,
            robotsMeta: true,
            ogTitle: true,
            ogDescription: true,
            ogImage: {
              select: {
                path: true
              }
            },
            schemaType: true,
            structuredData: true
          }
        });

        if (!item) {
          logger.warn('[SeoUtils] No CMS item found', { sitePath });
          return null;
        }

        // Prepare SEO data
        const seoData: SeoData = {
          title: item.title,
          description: item.metaDescription,
          keywords: item.metaKeywords,
          canonical: item.canonicalUrl,
          robots: item.robotsMeta
        };

        // Add Open Graph data if present
        if (item.ogTitle || item.ogDescription || item.ogImage) {
          seoData.og = {
            title: item.ogTitle,
            description: item.ogDescription,
            url: undefined, // No ogUrl field in CmsItem
            type: 'website',
            image: item.ogImage?.path
          };
        }

        // Add Schema.org data if present
        if (item.schemaType && item.structuredData) {
          seoData.schema = {
            type: item.schemaType,
            data: item.structuredData
          };
        }

        logger.info('[SeoUtils] SEO data fetched successfully', {
          sitePath,
          hasTitle: !!seoData.title,
          hasOg: !!seoData.og,
          hasSchema: !!seoData.schema
        });

        return seoData;
      },
      { maxRetries: 3 }
    );
  } catch (error) {
    logger.error('[SeoUtils] Failed to fetch SEO data', {
      sitePath,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Inject SEO data into HTML
 *
 * @param html - HTML content
 * @param seoData - SEO data to inject
 * @returns Modified HTML
 */
export function injectSeoData(html: string, seoData: SeoData): string {
  let metaTags = '';

  // Basic meta tags
  if (seoData.title) {
    metaTags += `\n  <title>${escapeHtml(seoData.title)}</title>`;
  }

  if (seoData.description) {
    metaTags += `\n  <meta name="description" content="${escapeHtml(seoData.description)}">`;
  }

  if (seoData.keywords) {
    metaTags += `\n  <meta name="keywords" content="${escapeHtml(seoData.keywords)}">`;
  }

  // FIXED: Validate URLs before injecting
  if (seoData.canonical) {
    const validatedCanonical = validateUrl(seoData.canonical);
    if (validatedCanonical) {
      metaTags += `\n  <link rel="canonical" href="${escapeHtml(validatedCanonical)}">`;
    }
  }

  if (seoData.robots) {
    metaTags += `\n  <meta name="robots" content="${escapeHtml(seoData.robots)}">`;
  }

  // Open Graph tags with URL validation
  if (seoData.og) {
    if (seoData.og.title) {
      metaTags += `\n  <meta property="og:title" content="${escapeHtml(seoData.og.title)}">`;
    }
    if (seoData.og.description) {
      metaTags += `\n  <meta property="og:description" content="${escapeHtml(seoData.og.description)}">`;
    }
    if (seoData.og.url) {
      const validatedUrl = validateUrl(seoData.og.url);
      if (validatedUrl) {
        metaTags += `\n  <meta property="og:url" content="${escapeHtml(validatedUrl)}">`;
      }
    }
    if (seoData.og.type) {
      metaTags += `\n  <meta property="og:type" content="${escapeHtml(seoData.og.type)}">`;
    }
    if (seoData.og.image) {
      const validatedImage = validateUrl(seoData.og.image);
      if (validatedImage) {
        metaTags += `\n  <meta property="og:image" content="${escapeHtml(validatedImage)}">`;
      }
    }
  }

  // FIXED: Schema.org JSON-LD with proper escaping
  if (seoData.schema && seoData.schema.data) {
    const safeSchemaJson = escapeJsonForScript(seoData.schema.data);
    metaTags += `\n  <script type="application/ld+json">${safeSchemaJson}</script>`;
  }

  // Inject before </head>
  return html.replace('</head>', `${metaTags}\n</head>`);
}

/**
 * Inject cache metadata into HTML
 * Creates window.__CACHED_ROUTE__ from window.__ROUTE_DATA__
 *
 * SECURITY: Properly escapes all user-controlled data to prevent XSS
 *
 * @param html - HTML content
 * @param metadata - Metadata extracted from page (window.__ROUTE_DATA__)
 * @param sitePath - Site path
 * @param renderTime - Render time in milliseconds
 * @param configPublic - ConfigPublic data for cached pages
 * @returns Modified HTML
 */
export function injectCacheMetadata(
  html: string,
  metadata: any,
  sitePath: string,
  renderTime: number,
  configPublic?: Record<string, any>
): string {
  // Ensure path starts with / for route matching
  const normalizedPath = sitePath.startsWith('/') ? sitePath : `/${sitePath}`;
  // FIXED: Escape sitePath for JavaScript context
  const safeSitePath = escapeJavaScriptString(normalizedPath);

  // Generate safe route name (alphanumeric only)
  const routeName = `cached-${sitePath.replace(/[^a-zA-Z0-9]/g, '-')}`;
  const safeRouteName = escapeJavaScriptString(routeName);

  // FIXED: Merge metadata safely and escape for script injection
  const metaObject = {
    ...(metadata?.meta || {}),
    component: "CachedComponent",
    cached: true,
    cachedAt: new Date().toISOString(),
    generatedMs: renderTime,
    configPublic: configPublic || {} // Include ConfigPublic for cached pages
  };

  const safeMetaJson = escapeJsonForScript(metaObject);

  // FIXED: Use properly escaped values in template
  const routeScript = `
<script>
window.__CACHED_ROUTE__ = {
  path: "${safeSitePath}",
  name: "${safeRouteName}",
  meta: ${safeMetaJson}
};
</script>`;

  // Inject before </head>
  return html.replace('</head>', `${routeScript}\n</head>`);
}

/**
 * Escape HTML special characters for use in HTML attributes
 *
 * Prevents XSS in HTML context (attributes, text nodes)
 */
function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return str.replace(/[&<>"']/g, char => htmlEntities[char]);
}

/**
 * Escape string for use in JavaScript string literals
 *
 * Prevents XSS when injecting strings into <script> tags
 * Handles quotes, newlines, and backslashes
 */
function escapeJavaScriptString(str: string): string {
  const jsEscapes: Record<string, string> = {
    '\\': '\\\\',
    '"': '\\"',
    "'": "\\'",
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\b': '\\b',
    '\f': '\\f',
    '\v': '\\v',
    '\0': '\\0'
  };

  return str.replace(/[\\"'\n\r\t\b\f\v\0]/g, char => jsEscapes[char] || char)
    // Also escape </script> to prevent script tag breaking
    .replace(/<\/(script)/gi, '<\\/$1');
}

/**
 * Safely escape JSON for injection into <script> tags
 *
 * CRITICAL: Prevents XSS from malicious JSON containing </script> tags
 *
 * @param obj - Object to serialize
 * @returns Safe JSON string for script injection
 */
function escapeJsonForScript(obj: any): string {
  // Serialize to JSON
  let json = JSON.stringify(obj, null, 2);

  // CRITICAL: Escape </script> tag to prevent breaking out of script context
  // This prevents: {"evil": "</script><script>alert('XSS')</script>"}
  json = json.replace(/<\/(script)/gi, '<\\/$1');

  // Also escape <!-- to prevent HTML comment injection
  json = json.replace(/<!--/g, '<\\!--');

  // Escape line/paragraph separators (U+2028, U+2029) which can break JavaScript
  json = json.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

  return json;
}

/**
 * Validate URL to prevent XSS and open redirects
 *
 * Blocks dangerous protocols: javascript:, data:, file:, vbscript:
 * Allows: http:, https:, /relative/paths, //protocol-relative
 *
 * @param url - URL to validate
 * @returns Validated URL or null if invalid
 */
function validateUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Trim whitespace
  const trimmedUrl = url.trim();

  // Empty URL
  if (trimmedUrl.length === 0) {
    return null;
  }

  // Check for dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:'
  ];

  const lowerUrl = trimmedUrl.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return null; // Reject dangerous URL
    }
  }

  // Allow relative URLs (/path, ./path, ../path)
  if (trimmedUrl.startsWith('/')) {
    return trimmedUrl;
  }

  // Allow protocol-relative URLs (//example.com)
  if (trimmedUrl.startsWith('//')) {
    return trimmedUrl;
  }

  // Allow http(s) absolute URLs
  if (lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://')) {
    // Additional validation: Check for @ in URL (potential phishing)
    const urlWithoutProtocol = trimmedUrl.substring(trimmedUrl.indexOf('://') + 3);
    const atIndex = urlWithoutProtocol.indexOf('@');
    const slashIndex = urlWithoutProtocol.indexOf('/');

    // Reject URLs with @ before first / (e.g., http://user@evil.com)
    if (atIndex !== -1 && (slashIndex === -1 || atIndex < slashIndex)) {
      return null;
    }

    return trimmedUrl;
  }

  // Reject anything else (could be malformed or dangerous)
  return null;
}
