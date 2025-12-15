import { DSL, initDslClient } from '@/dsl/client'
import { logger } from '@/core/logging/logger'

// Real data source using DSL instead of API
export const Data = {
  Users: {
    totalCount: async () => {
      const users = await DSL.AuthUser.findMany()
      return users.length
    },
    roles: () => [
      { label: 'Admin', value: 'admin' },
      { label: 'Editor', value: 'editor' },
      { label: 'Viewer', value: 'viewer' }
    ],
    statuses: () => [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
      { label: 'Banned', value: 'banned' }
    ],
    sessions: async () => {
      const sessions = await DSL.AuthRefreshToken.findMany(
        { expiresAt: { gt: new Date() } },  // filter
        ['user']                           // include
      )
      
      return sessions.map(session => ({
        name: session.user?.userName || session.user?.email || 'Unknown',
        email: session.user?.email || 'Unknown',
        role: session.user?.role || 'User',
        lastLogin: new Date(session.createdAt).toLocaleDateString(),
        status: new Date(session.expiresAt) > new Date() ? 'Active' : 'Expired'
      }))
    }
  },

  Auth: {
    loginStats: async () => {
      const history = await DSL.AuthHistory.findMany()
      const success = history.filter(h => h.result === 'success').length
      const failed = history.filter(h => h.result === 'failure').length
      return { success, failed }
    }
  },

  Stats: {
    bounceRate: () => '38%',
    conversions: () => 97,
    errors: () => 12
  },

  Analytics: {
    siteTrafficByDay: () => [
      { date: '2025-04-24', visits: 120 },
      { date: '2025-04-25', visits: 150 },
      { date: '2025-04-26', visits: 170 }
    ],
    visitsByDay: () => [
      { date: '2025-04-24', count: 45 },
      { date: '2025-04-25', count: 60 },
      { date: '2025-04-26', count: 78 }
    ]
  },

  Filters: {
    periods: () => [
      { label: 'Last 7 Days', value: 'last7days' },
      { label: 'Last 30 Days', value: 'last30days' },
      { label: 'This Year', value: 'thisYear' }
    ]
  }
}

export namespace AuthHistory {
  export async function loginsHistoryByDateAndResult() {
    const history = await DSL.AuthHistory.findMany({}, [], {
      orderBy: { attemptTime: 'desc' }
    })
    
    const grouped = {}
    history.forEach(login => {
      const date = new Date(login.attemptTime).toLocaleDateString()
      if (!grouped[date]) {
        grouped[date] = { date, success: 0, failure: 0 }
      }
      if (login.result === 'success') {
        grouped[date].success++
      } else {
        grouped[date].failure++
      }
    })
    
    return Object.values(grouped)
  }
export async function findRecent(page: number = 1, limit: number = 20) {
  const response = await DSL.AuthHistory.findMany({}, ['user'], {
    page,
    limit,
    orderBy: { attemptTime: 'desc' }
  })

  const history = response?.data || response || []
  const paginationMeta = response?.paginationMeta || {
    total: history.length,
    page,
    limit,
    totalPages: 1
  }

  const data = history.map(log => {
    // Parse ispData - could be string or object
    let ispData: any = {}
    if (log.ispData) {
      if (typeof log.ispData === 'string') {
        try {
          ispData = JSON.parse(log.ispData)
        } catch (e) {
          console.warn('Failed to parse ispData:', e)
        }
      } else {
        ispData = log.ispData
      }
    }

    // Parse deviceData - could be string or object
    let deviceData: any = {}
    if (log.deviceData) {
      if (typeof log.deviceData === 'string') {
        try {
          deviceData = JSON.parse(log.deviceData)
        } catch (e) {
          console.warn('Failed to parse deviceData:', e)
        }
      } else {
        deviceData = log.deviceData
      }
    }

    // Parse user agent
    const userAgent = deviceData.user_agent || ''
    const device = parseUserAgent(userAgent)

    // Build location string
    const city = ispData.city || ''
    const country = ispData.countryName || ispData.country || ''
    const location = city && country ? `${city}, ${country}` : (city || country || 'Unknown')

    return {
      id: log.id,
      timestamp: log.attemptTime ? new Date(log.attemptTime).toLocaleString() : 'Unknown',
      email: log.email || 'Unknown',
      ip: deviceData.ip || ispData.clientIp || 'Unknown',
      device: device,
      location: location,
      status: log.result || 'Unknown',
      method: log.googleId ? 'Google' : 'Password'
    }
  })

  return { data, paginationMeta }
}

export async function loginsByDevice() {
  const history = await DSL.AuthHistory.findMany()
  const deviceCounts: Record<string, number> = {}

  history.forEach((login: any) => {
    let deviceData: any = {}
    if (login.deviceData) {
      if (typeof login.deviceData === 'string') {
        try { deviceData = JSON.parse(login.deviceData) } catch {}
      } else {
        deviceData = login.deviceData
      }
    }

    // Use device field directly if available, otherwise parse user agent
    let device = deviceData.device || 'Unknown'
    if (device === 'Unknown' && deviceData.user_agent) {
      const ua = deviceData.user_agent
      if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) device = 'Mobile'
      else if (ua.includes('iPad') || ua.includes('Tablet')) device = 'Tablet'
      else device = 'Desktop'
    }

    deviceCounts[device] = (deviceCounts[device] || 0) + 1
  })

  return Object.keys(deviceCounts).map(device => ({
    device, count: deviceCounts[device]
  }))
}

export async function loginsByCountry() {
  const history = await DSL.AuthHistory.findMany()
  const countryCounts: Record<string, number> = {}

  history.forEach((login: any) => {
    let ispData: any = {}
    if (login.ispData) {
      if (typeof login.ispData === 'string') {
        try { ispData = JSON.parse(login.ispData) } catch {}
      } else {
        ispData = login.ispData
      }
    }

    const country = ispData.countryName || ispData.country || 'Unknown'
    countryCounts[country] = (countryCounts[country] || 0) + 1
  })

  return Object.keys(countryCounts)
    .map(country => ({ country, count: countryCounts[country] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)  // Top 6 countries
}

export async function loginsByHour() {
  const history = await DSL.AuthHistory.findMany()
  const hourCounts = Array.from({length: 24}, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    count: 0
  }))
  
  history.forEach(login => {
    const hour = new Date(login.attemptTime).getHours()
    hourCounts[hour].count++
  })
  
  return hourCounts
}

function parseUserAgent(userAgent) {
  if (!userAgent) return 'Unknown Device'
  
  const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/?([\d.]+)/)
  const osMatch = userAgent.match(/(Windows NT [\d.]+|Mac OS X|Linux|Android|iOS)/)
  
  const browser = browserMatch ? `${browserMatch[1]} ${browserMatch[2].split('.')[0]}` : 'Unknown'
  const os = osMatch ? osMatch[1].replace('Windows NT 10.0', 'Windows 10') : 'Unknown'
  
  return `${browser} on ${os}`
}
  export async function loginsByAuthMethod() {
    const logins = await DSL.AuthHistory.findMany()
    const methodCounts = {}
    
    logins.forEach(login => {
      const method = login.googleId ? 'google' : 'password'
      methodCounts[method] = (methodCounts[method] || 0) + 1
    })
    
    return Object.keys(methodCounts).map(method => ({
      method: method,
      count: methodCounts[method]
    }))
  }
  
  export async function loginsByStatus() {
    const logins = await DSL.AuthHistory.findMany()
    const statusCounts = {}
    
    logins.forEach(login => {
      const status = login.result || 'unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })
    
    return Object.keys(statusCounts).map(status => ({
      status: status,
      count: statusCounts[status]
    }))
  }
}

export namespace UserSessions {
  export async function getUserSessions() {
    const sessions = await DSL.AuthRefreshToken.findMany(
      {},       // filter (empty)
      ['user']  // include
    )
    
    return sessions.map(session => ({
      user: session.user?.userName || session.user?.email || 'Unknown',
      ip: session.user?.lastActivity ? '192.168.1.1' : 'Unknown', // Mock IP
      device: 'Unknown Device', // Add device tracking to model if needed
      location: 'Unknown Location', // Add location tracking if needed
      loginTime: new Date(session.createdAt).toLocaleString(),
      logoutTime: new Date(session.expiresAt) < new Date() ? new Date(session.expiresAt).toLocaleString() : null,
      status: new Date(session.expiresAt) > new Date() ? 'Active' : 'Expired'
    }))
  }
  
  export async function sessionsByDeviceType() {
    // Mock data - extend model for real device tracking
    return [
      { device: 'Desktop', count: 25 },
      { device: 'Mobile', count: 15 },
      { device: 'Tablet', count: 10 }
    ]
  }

  export async function getActiveSessions() {
    const response = await DSL.AuthRefreshToken.findMany(
      { expiresAt: { gt: new Date() } },  // filter
      ['user']                           // include
    )

    const sessions = Array.isArray(response) ? response : (response?.data || [])

    return sessions.map(session => ({
      id: session.id,
      user: {
        email: session.user?.email || 'Unknown'
      },
      createdAt: session.createdAt,
      expiresAt: session.expiresAt
    }))
  }

  export async function terminateSession(sessionId) {
    await DSL.AuthRefreshToken.delete(sessionId)
    return { success: true }
  }

  export async function terminateUserSessions(userId) {
    const sessions = await DSL.AuthRefreshToken.findMany(
      { userId: userId }  // filter
    )
    
    for (const session of sessions) {
      await DSL.AuthRefreshToken.delete(session.id)
    }
    
    return { terminated: sessions.length }
  }

  export async function terminateAllSessions() {
    const sessions = await DSL.AuthRefreshToken.findMany()
    
    for (const session of sessions) {
      await DSL.AuthRefreshToken.delete(session.id)
    }
    
    return { terminated: sessions.length }
  }

  export async function getCurrentUser() {
    // This would need current user context from auth system
    logger.warn('getCurrentUser not implemented - needs auth context')
    return null
  }
}

export namespace AuthSessions {
  export async function sessionsCountByHours() {
    const sessions = await DSL.AuthRefreshToken.findMany()
    const hourCounts = {}
    
    sessions.forEach(session => {
      const hour = new Date(session.createdAt).getHours()
      const hourKey = `${hour.toString().padStart(2, '0')}:00`
      hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1
    })
    
    return Object.keys(hourCounts).map(hour => ({
      hour: hour,
      count: hourCounts[hour]
    }))
  }
}
