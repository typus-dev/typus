/* @Tags: routing */
import { registerModuleLayout } from '@/core/layouts/layouts-loader'
import CmsLayout from './CmsLayout.vue'
import CmsEditorLayout from './CmsEditorLayout.vue'
import { logger } from '@/core/logging/logger'

/**
 * Register CMS module layouts
 */
export function registerLayouts(): void {
  logger.debug('[cms/layouts] Registering CMS layouts', {})
  
  // Register default CMS layout
  registerModuleLayout('cms', 'default', CmsLayout, {
    description: 'Default CMS layout with sidebar navigation'
  })
  
  // Register CMS editor layout
  registerModuleLayout('cms', 'editor', CmsEditorLayout, {
    description: 'CMS layout for content editing'
  })
  
  logger.debug('[cms/layouts] CMS layouts registered successfully', {})
}
