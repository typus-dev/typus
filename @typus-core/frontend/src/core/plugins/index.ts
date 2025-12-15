import { App, Component, shallowRef, ShallowRef } from 'vue'

export interface PluginOptions {
  name: string
  [key: string]: any
}

/**
 * Registration for a plugin's global component
 * These components are rendered at the app root level (App.vue)
 */
export interface PluginGlobalComponent {
  /** Unique identifier for this global component */
  id: string
  /** The Vue component to render */
  component: Component
  /** Optional condition function - component only renders when this returns true */
  condition?: () => boolean
  /** Optional order/priority (higher = rendered later, appears on top). Default: 0 */
  order?: number
}

export class PluginSystem {
  private plugins = new Map<string, any>()
  private _globalComponents: ShallowRef<PluginGlobalComponent[]> = shallowRef([])

  register(plugin: any, options?: PluginOptions) {
    // Register a plugin
    if (!options?.name) {
      throw new Error('Plugin name is required')
    }
    this.plugins.set(options.name, plugin)
  }

  /**
   * Register a global component that will be rendered at the app root level.
   * Useful for floating buttons, global modals, notifications, etc.
   *
   * @example
   * pluginSystem.registerGlobal({
   *   id: 'ai-agent-floating',
   *   component: FloatingChatButton,
   *   condition: () => authStore.isAuthenticated,
   *   order: 100
   * })
   */
  registerGlobal(registration: PluginGlobalComponent) {
    // Prevent duplicate registrations
    const existing = this._globalComponents.value.find(g => g.id === registration.id)
    if (existing) {
      console.warn(`[PluginSystem] Global component "${registration.id}" already registered, skipping`)
      return
    }

    // Add to list (trigger reactivity)
    this._globalComponents.value = [
      ...this._globalComponents.value,
      registration
    ]

    console.log(`[PluginSystem] Global component "${registration.id}" registered`)
  }

  /**
   * Unregister a global component by ID
   */
  unregisterGlobal(id: string) {
    this._globalComponents.value = this._globalComponents.value.filter(g => g.id !== id)
    console.log(`[PluginSystem] Global component "${id}" unregistered`)
  }

  /**
   * Get all registered global components (reactive)
   */
  get globalComponents(): ShallowRef<PluginGlobalComponent[]> {
    return this._globalComponents
  }

  install(app: App) {
    // Install all registered plugins
    this.plugins.forEach((plugin, name) => {
      app.use(plugin, { name })
    })
  }
}

export const pluginSystem = new PluginSystem()
