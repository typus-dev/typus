/* @Tags: DSL, DSX, Roles */
import { useApi } from '@/shared/composables/useApi'
import { logger } from '@/core/logging/logger'

class RoleService {
  static async getRoles() {
    logger.debug('[RoleMethods] Fetching roles')
    const { data, error } = await useApi('/roles/search').post()

    if (error) {
      logger.error('[RoleMethods] Error fetching roles:', error)
      throw new Error(error)
    }

    logger.debug('[RoleMethods] Roles fetched successfully', { count: data?.length })
    return data || []
  }

  static async getRoleById(id: string) {
    logger.debug('[RoleMethods] Fetching role by ID:', id)
    const { data, error } = await useApi(`/roles/${id}`).get()

    if (error) {
      logger.error('[RoleMethods] Error fetching role:', error)
      return null
    }

    return data
  }

  static async createRole(roleData: any) {
    logger.debug('[RoleMethods] Creating role:', roleData)
    const { data, error } = await useApi('/roles').post(roleData)

    if (error) {
      logger.error('[RoleMethods] Error creating role:', error)
      throw new Error(error)
    }

    return data
  }

  static async updateRole(id: string, roleData: any) {
    logger.debug('[RoleMethods] Updating role:', { id, roleData })
    const { data, error } = await useApi(`/roles/${id}`).put(roleData)

    if (error) {
      logger.error('[RoleMethods] Error updating role:', error)
      throw new Error(error)
    }

    return data
  }

  static async deleteRole(id: number) {
    logger.debug('[RoleMethods] Deleting role:', id)
    const { error } = await useApi(`/roles/${id}`).delete()

    if (error) {
      logger.error('[RoleMethods] Error deleting role:', error)
      throw new Error(error)
    }
  }
}

export const RoleMethods = RoleService
