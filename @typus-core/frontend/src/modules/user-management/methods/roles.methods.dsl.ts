/* @Tags: DSL, Roles */
import { DSL } from '@/dsl/client'
import { logger } from '@/core/logging/logger'

/**
 * Role management methods using DSL
 * Uses AuthRole DSL model
 */
class RoleService {
  static async getRoles() {
    logger.debug('[RolesMethods] Fetching roles via DSL')
    const response = await DSL.AuthRole.findMany()

    // DSL returns {data: [], paginationMeta: {...}} or direct array
    const roles = Array.isArray(response) ? response : (response?.data || [])

    logger.debug('[RolesMethods] Roles fetched successfully', { count: roles.length })
    return roles
  }

  static async getRoleById(id: number) {
    logger.debug('[RolesMethods] Fetching role by ID via DSL:', id)
    const role = await DSL.AuthRole.findById(id)

    return role
  }

  static async createRole(roleData: any) {
    logger.debug('[RolesMethods] Creating role via DSL:', roleData)
    const role = await DSL.AuthRole.create(roleData)

    return role
  }

  static async updateRole(id: number, roleData: any) {
    logger.debug('[RolesMethods] Updating role via DSL:', { id, roleData })
    const role = await DSL.AuthRole.update(id, roleData)

    return role
  }

  static async deleteRole(id: number) {
    logger.debug('[RolesMethods] Deleting role via DSL:', id)
    await DSL.AuthRole.delete(id)
  }
}

export const RolesMethods = RoleService
