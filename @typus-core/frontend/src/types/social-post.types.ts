export interface ISocialPostFull {
  id: number
  platformId: string
  accountId: number
  userId: number
  content: string
  mediaIds?: number[]
  hashtags?: string[]
  status: 'draft' | 'scheduled' | 'queued' | 'published' | 'failed' | 'cancelled' | 'expired'
  scheduledAt?: Date | null
  publishedAt?: Date | null
  externalPostId?: string
  externalUrl?: string
  metadata?: Record<string, any>
  errorMessage?: string
  retryCount?: number
  createdAt: Date
  updatedAt: Date
  createdBy?: number
  updatedBy?: number
}

export interface IBulkPostImport {
  date: string
  text: string
  tags?: string[]
  status?: string
  platform?: string
  account?: string
}
