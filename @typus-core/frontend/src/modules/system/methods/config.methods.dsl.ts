/* @Tags: DSL, SystemConfig, Settings */
import { DSL } from '@/dsl/client'
import { logger } from '@/core/logging/logger'

export const SystemConfigMethods = {
  /**
   * Get config value by key
   */
  async get(key: string) {
    logger.debug('[SystemConfigMethods] Getting config:', key)

    const result = await DSL.SystemConfig.findMany({ key })
    return result.length > 0 ? result[0] : null
  },

  /**
   * Get all configs by category
   */
  async getByCategory(category: string) {
    logger.debug('[SystemConfigMethods] Getting configs by category:', category)

    return await DSL.SystemConfig.findMany(
      { category },
      [],
      { orderBy: { key: 'asc' } }
    )
  },

  /**
   * Get all configs grouped by category
   * Reads from both config_public and system.config tables
   */
  async getAll() {
    logger.debug('[SystemConfigMethods] Getting all configs from both tables')

    // Read both public and system configs in parallel
    const [publicConfigs, systemConfigs] = await Promise.all([
      DSL.ConfigPublic.findMany(
        {},
        [],
        { orderBy: [{ category: 'asc' }, { id: 'asc' }] }
      ),
      DSL.SystemConfig.findMany(
        {},
        [],
        { orderBy: [{ category: 'asc' }, { id: 'asc' }] }
      )
    ])

    // Debug: Log logo and favicon values from database
    const logoConfig = publicConfigs.find(c => c.key === 'site.logo_url')
    const faviconConfig = publicConfigs.find(c => c.key === 'site.favicon_url')
    logger.debug('[SystemConfigMethods] Logo/Favicon from DB:', {
      logo: logoConfig ? { id: logoConfig.id, value: logoConfig.value } : 'not found',
      favicon: faviconConfig ? { id: faviconConfig.id, value: faviconConfig.value } : 'not found'
    })

    // Add table metadata to each config for correct save routing
    const publicWithMeta = publicConfigs.map(c => ({ ...c, _tableName: 'ConfigPublic' }))
    const systemWithMeta = systemConfigs.map(c => ({ ...c, _tableName: 'SystemConfig' }))

    // Merge both arrays
    const allConfigs = [...publicWithMeta, ...systemWithMeta]

    logger.debug('[SystemConfigMethods] Loaded configs:', {
      public: publicConfigs.length,
      system: systemConfigs.length,
      total: allConfigs.length
    })

    // Group by category
    const grouped = allConfigs.reduce((acc, config) => {
      if (!acc[config.category]) {
        acc[config.category] = []
      }
      acc[config.category].push(config)
      return acc
    }, {} as Record<string, any[]>)

    return grouped
  },

  /**
   * Update config value
   * Routes to correct table (ConfigPublic or SystemConfig) based on tableName
   */
  async update(id: number, value: any, tableName: 'ConfigPublic' | 'SystemConfig' = 'SystemConfig') {
    logger.debug('[SystemConfigMethods] Updating config:', { id, value, tableName })

    // Route to correct table
    if (tableName === 'ConfigPublic') {
      await DSL.ConfigPublic.update(id, {
        value: String(value)
      })
    } else {
      await DSL.SystemConfig.update(id, {
        value: String(value)
      })
    }

    logger.info('[SystemConfigMethods] Config updated successfully in', tableName)
  },

  /**
   * Parse value based on data type
   */
  parseValue(value: string, dataType?: string): any {
    if (value === null || value === undefined) {
      return value
    }

    switch (dataType) {
      case 'boolean':
        return value === 'true' || value === '1' || value === 'yes'

      case 'number':
        const num = Number(value)
        return isNaN(num) ? value : num

      case 'json':
        try {
          return JSON.parse(value)
        } catch {
          return value
        }

      default:
        return value
    }
  }
}
