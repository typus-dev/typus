/**
 * Types for routes module
 */

// Route data structure
export interface Route {
  id: string;
  path: string;
  name: string;
  component?: string;
  parentId?: string | null;
  orderIndex: number;
  isActive: boolean;
  meta?: Record<string, any>;
  children?: Route[];
  createdAt?: string;
  updatedAt?: string;
}

// Route form data
export interface RouteFormData {
  name: string;
  path: string;
  component?: string;
  parentId?: string | null;
  orderIndex: number;
  isActive: boolean;
  meta: Record<string, any>;
}

// Route reorder item
export interface RouteReorderItem {
  id: string;
  parentId: string | null;
  orderIndex: number;
}
