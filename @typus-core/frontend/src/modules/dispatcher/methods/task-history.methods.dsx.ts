// methods/dispatcher-task-history.methods.dsx.ts
import { DSL } from '@/dsl/client'
import { logger } from '@/core/logging/logger'

export const DispatcherTaskHistoryMethods = {
  async getHistory(filter?: any, options?: {
    currentPage?: number,
    limit?: number,
    orderBy?: any
  }) {
    const { currentPage = 1, limit = 10 } = options || {}

    const queryOptions = {
      orderBy: { id: 'desc' },
      page: currentPage,
      limit
    }

    // Get both data and total count in parallel
    const [history, total] = await Promise.all([
      DSL.DispatcherTaskHistory.findMany(
        filter || {},
        ['task'],
        queryOptions
      ),
      DSL.DispatcherTaskHistory.count(filter || {})
    ])

    // Return format compatible with clean table architecture
    const result = {
      data: history,
      paginationMeta: {
        total,
        currentPage,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: currentPage < Math.ceil(total / limit)
      }
    }

    logger.debug('[DispatcherTaskHistoryMethods] History fetched via DSL', {
      count: history?.length,
      total,
      currentPage,
      limit,
      totalPages: result.paginationMeta.totalPages
    })

    return result
  },

  async getHistoryById(id: string) {
    const historyItem = await DSL.DispatcherTaskHistory.findById(parseInt(id), ['task'])
    logger.debug('[DispatcherTaskHistoryMethods] History item fetched via DSL', { id, historyItem })
    return historyItem
  }
}
