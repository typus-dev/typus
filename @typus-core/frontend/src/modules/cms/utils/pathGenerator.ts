/**
 * Path generation utilities for CMS content based on category hierarchy
 */

export interface CategoryPathItem {
  id: number;
  name: string;
  slug: string;
}

/**
 * Generate site path from category hierarchy and content slug
 * @param categories - Array of selected categories in hierarchy order
 * @param contentSlug - Slug of the content item
 * @returns Generated site path starting with '/'
 */
export function generatePathFromCategories(
  categories: CategoryPathItem[],
  contentSlug: string
): string {
  if (!contentSlug) {
    contentSlug = 'untitled';
  }

  // Build path segments starting with '/'
  let pathSegments = [''];

  // Add category slugs in hierarchy order
  for (const category of categories) {
    if (category.slug) {
      pathSegments.push(category.slug);
    }
  }

  // Add content slug
  pathSegments.push(contentSlug);

  // Join with '/' and ensure it starts with single '/'
  const path = pathSegments.join('/');
  return path.replace(/\/+/g, '/'); // Remove any double slashes
}

/**
 * Generate a unique path by checking for conflicts
 * @param basePath - Base path to start with
 * @param checkAvailability - Function to check if path is available
 * @returns Promise that resolves to available unique path
 */
export async function generateUniquePath(
  basePath: string,
  checkAvailability: (path: string) => Promise<boolean>
): Promise<string> {
  let path = basePath;
  let counter = 2; // Start with -2, -3, etc.

  // Keep trying until we find an available path
  while (!(await checkAvailability(path))) {
    // Insert counter before the slug part
    const parts = basePath.split('/');
    const slug = parts.pop() || '';
    const prefix = parts.join('/');

    // Add counter suffix to slug
    const slugWithCounter = `${slug}-${counter}`;
    path = prefix ? `${prefix}/${slugWithCounter}` : `/${slugWithCounter}`;

    counter++;

    // Safety limit to prevent infinite loops
    if (counter > 1000) {
      throw new Error('Too many conflicts, cannot generate unique path');
    }
  }

  return path;
}

/**
 * Validate if a path is valid for site navigation
 * @param path - Path to validate
 * @returns Validation result with error message if invalid
 */
export function validateSitePath(path: string): { valid: boolean; error?: string } {
  // Must start with /
  if (!path.startsWith('/')) {
    return { valid: false, error: 'Path must start with /' };
  }

  // Must not be just /
  if (path === '/') {
    return { valid: false, error: 'Path cannot be just /' };
  }

  // Check for valid characters (alphanumeric, hyphens, slashes)
  const invalidChars = /[^a-zA-Z0-9\-\/]/;
  if (invalidChars.test(path)) {
    return { valid: false, error: 'Path can only contain letters, numbers, hyphens, and slashes' };
  }

  // Check for consecutive slashes
  if (/\/\/+/.test(path)) {
    return { valid: false, error: 'Path cannot contain consecutive slashes' };
  }

  // Check for trailing slash (except for root)
  if (path.length > 1 && path.endsWith('/')) {
    return { valid: false, error: 'Path cannot end with a trailing slash' };
  }

  return { valid: true };
}

/**
 * Clean and normalize a slug for URL usage
 * @param slug - Slug to clean
 * @returns Cleaned slug
 */

export const cleanSlug = (slug: string): string => {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    // .replace(/^-+|-+$/g, '') 
    .replace(/^-+/g, '') 
    .trim()
}