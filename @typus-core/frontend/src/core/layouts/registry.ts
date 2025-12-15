/* @Tags: routing */
import type { Component } from 'vue'
import { logger } from '@/core/logging/logger'

export interface LayoutMetadata {
  description?: string
  icon?: string
  moduleName?: string
  [key: string]: any
}

/**
 * Registry for storing and retrieving layout components
 */
class LayoutRegistry {
  private layouts = new Map<string, Component>()
  private metadata = new Map<string, LayoutMetadata>()
  
  register(name: string, component: Component, metadata?: LayoutMetadata): void {
    if (this.layouts.has(name)) {
      logger.warn(`[LayoutRegistry] Layout "${name}" already registered, overwriting`)
    }
    
    this.layouts.set(name, component)
    if (metadata) {
      this.metadata.set(name, metadata)
    }
    
    logger.debug(`[LayoutRegistry] Registered layout "${name}"`, { metadata })
  }
  
  get(name: string): Component | undefined {
    return this.layouts.get(name)
  }
  
  has(name: string): boolean {
    return this.layouts.has(name)
  }
  
  getMetadata(name: string): LayoutMetadata | undefined {
    return this.metadata.get(name)
  }
  
  getAll(): Map<string, Component> {
    return this.layouts
  }
  
  getAllWithMetadata(): Array<{ name: string, component: Component, metadata?: LayoutMetadata }> {
    return Array.from(this.layouts.entries()).map(([name, component]) => ({
      name,
      component,
      metadata: this.metadata.get(name)
    }))
  }
}

export const layoutRegistry = new LayoutRegistry()
