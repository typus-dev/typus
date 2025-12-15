import { useApi } from '@/shared/composables/useApi'
import { logger } from '@/core/logging/logger'

export const RoleMethods = {
  async getRoles() {
    logger.debug('[RoleMethods] Fetching roles')
    const { data, error } = await useApi('/roles/search').post({})
    
    if (error) throw new Error(error)
    
    const transformedRoles = data.map((role: any) => ({
      id: role.id,
      name: role.name || '-',
      description: role.description || '-',
      permissions: role.permissions || [],
      usersCount: role.usersCount || 0,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    }))
    
    logger.debug('[RoleMethods] Roles fetched successfully', { count: transformedRoles.length })
    return transformedRoles
  },

  async createRole(roleData: any) {
    logger.debug('[RoleMethods] Creating role:', roleData)
    const { data, error } = await useApi('/roles').post(roleData)
    if (error) throw new Error(error)
    return data
  },

  async updateRole(id: string, roleData: any) {
    logger.debug('[RoleMethods] Updating role:', { id, roleData })
    const { data, error } = await useApi(`/roles/${id}`).put(roleData)
    if (error) throw new Error(error)
    return data
  },

  async deleteRole(id: string) {
    logger.debug('[RoleMethods] Deleting role:', id)
    const { error } = await useApi(`/roles/${id}`).del()
    if (error) throw new Error(error)
    return true
  },

  async getRoleById(id: string) {
    logger.debug('[RoleMethods] Fetching role by ID:', id)
    const { data, error } = await useApi(`/roles/${id}`).get()
    if (error) throw new Error(error)
    return data
  },

  async getRolePermissions(id: string) {
    logger.debug('[RoleMethods] Fetching role permissions:', id)
    const { data, error } = await useApi(`/roles/${id}/permissions`).get()
    if (error) throw new Error(error)
    return data || []
  },

  async updateRolePermissions(id: string, permissions: string[]) {
    logger.debug('[RoleMethods] Updating role permissions:', { id, permissions })
    const { data, error } = await useApi(`/roles/${id}/permissions`).put({ permissions })
    if (error) throw new Error(error)
    return data
  },

  async getRoleUsers(id: string) {
    logger.debug('[RoleMethods] Fetching role users:', id)
    const { data, error } = await useApi(`/roles/${id}/users`).get()
    if (error) throw new Error(error)
    
    return (data || []).map((user: any) => ({
      ...user,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '-'
    }))
  },

  async assignRoleToUser(roleId: string, userId: string) {
    logger.debug('[RoleMethods] Assigning role to user:', { roleId, userId })
    const { error } = await useApi(`/roles/${roleId}/users/${userId}`).post()
    if (error) throw new Error(error)
    return true
  },

  async removeRoleFromUser(roleId: string, userId: string) {
    logger.debug('[RoleMethods] Removing role from user:', { roleId, userId })
    const { error } = await useApi(`/roles/${roleId}/users/${userId}`).del()
    if (error) throw new Error(error)
    return true
  },

  async getAvailablePermissions() {
    logger.debug('[RoleMethods] Fetching available permissions')
    const { data, error } = await useApi('/permissions').get()
    if (error) throw new Error(error)
    return data || []
  }
}