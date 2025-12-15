/* @Tags: DSL, DSX, Users */
import { DSL, initDslClient } from '@/dsl/client'
import { logger } from '@/core/logging/logger'


class UsersService {
  // Note: router should be accessed via window.location or passed as parameter
  // Cannot use useRouter() outside of setup()

  static async getUsers() {
    logger.debug('[UsersMethods] Fetching users')
    const response = await DSL.AuthUser.findMany()

    // DSL returns {data: [], paginationMeta: {...}} or direct array
    const users = Array.isArray(response) ? response : (response?.data || [])

    logger.debug('[UsersMethods] Users fetched successfully', { count: users.length })
    return users
  }

  static async createUser(userData) {
    logger.debug('[UsersMethods] Creating user:', userData)
    await DSL.AuthUser.create(userData)

    // Router navigation should be handled by the calling component
    // Component can call: router.push('/user-management/list') after createUser
  }

  static async updateUser(id, userData) {
    logger.debug('[UsersMethods] Updating user:', { id, userData })
    await DSL.AuthUser.update(parseInt(id), userData)
  }

  static async deleteUser(id) {
    logger.debug('[UsersMethods] Deleting user:', id)
    await DSL.AuthUser.delete(parseInt(id))
  }

  static async getUserById(id) {
    logger.debug('[UsersMethods] Fetching user by ID:', id)
    const user = await DSL.AuthUser.findById(parseInt(id))
    
    return user
  }

  static async toggleUserApproval(id, isApproved) {
    logger.debug('[UsersMethods] Toggling user approval:', { id, isApproved })
    await DSL.AuthUser.update(parseInt(id), { isApproved })
  }

  static async toggleUserAdmin(id, isAdmin) {
    logger.debug('[UsersMethods] Toggling user admin status:', { id, isAdmin })
    await DSL.AuthUser.update(parseInt(id), { isAdmin })
  }

  static async getActiveSessions() {
    logger.debug('[UsersMethods] Fetching active sessions')
    const sessions = await DSL.AuthRefreshToken.findMany(
      { expiresAt: { gt: new Date() } },  // filter
      ['user']                           // include
    )
    
    const transformedSessions = sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      email: session.user?.email || 'Unknown',
      createdAt: new Date(session.createdAt).toLocaleString(),
      expiresAt: new Date(session.expiresAt).toLocaleString(),
      actions: {
        terminate: `/sessions/${session.id}/terminate`
      }
    }))
    
    logger.debug('[UsersMethods] Active sessions fetched successfully', { count: transformedSessions.length })
    return transformedSessions
  }

  static async terminateSession(id) {
    logger.debug('[UsersMethods] Terminating session:', id)
    await DSL.AuthRefreshToken.delete(id)
  }

  static async terminateMySessions() {
    logger.debug('[UsersMethods] Terminating my sessions')
    // This would need current user context - implementation depends on auth system
    logger.warn('[UsersMethods] terminateMySessions not fully implemented - needs current user context')
  }

  static async terminateAllSessions() {
    logger.debug('[UsersMethods] Terminating all sessions (admin)')
    const sessions = await DSL.AuthRefreshToken.findMany()
    
    for (const session of sessions) {
      await DSL.AuthRefreshToken.delete(session.id)
    }
  }

  static async getLoginHistory() {
    logger.debug('[UsersMethods] Fetching login history')
    const history = await DSL.AuthHistory.findMany(
      {},                                 // filter (empty)
      [],                                 // include (empty)
      { orderBy: { createdAt: 'desc' } }  // pagination
    )
    
    return (history || []).map((log) => ({
      ...log,
      email: log.user?.email || 'Unknown',
      createdAt: new Date(log.createdAt).toLocaleString(),
      success: !!log.success
    }))
  }
}

export const UsersMethods = UsersService
