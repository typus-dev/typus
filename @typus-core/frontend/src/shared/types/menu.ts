// Universal menu type for static and dynamic menus

import type { Actions, Subjects } from '@/core/auth/ability'; // Import types for ability

/**
 * MenuItem - describes a single menu entry.
 * Supports nesting, icons, injectAfter, and custom fields.
 */
export interface MenuItem {
  title: string; // Display title
  path?: string; // Route path
  icon?: string; // Icon name
  items?: MenuItem[]; // Nested menu items
  children?: MenuItem[]; // Alternative nesting key for compatibility
  injectAfter?: string; // For dynamic insertion
  layout?: string; // Target layout (for dynamic)
  type?: string; // Special types, e.g. 'line'
  ability?: { // Ability check for menu item
    action: Actions; // Action to check
    subject: Subjects; // Subject to check
  };
  [key: string]: any; // For extensibility
}
