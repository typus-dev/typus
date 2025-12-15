export interface Column {
  key: string
  title: string
  sortable?: boolean
  width?: string
  flex?: number
  minWidth?: string
  formatter?: (value: any, item: any) => string
}

export interface CustomAction {
  key: string
  label: string | ((item: any) => string)
  icon: string | ((item: any) => string)
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  condition?: (item: any) => boolean
  onClick?: (item: any, ctx?: any) => void | Promise<void>
}

export interface TableProps {
  columns?: Column[]
  data?: Record<string, any>[]
  loading?: boolean
  rowKey?: string | ((item: Record<string, any>) => string | number)
  itemsPerPageOptions?: number[]
  defaultItemsPerPage?: number
  noHeader?: boolean
  noPagination?: boolean
  searchPlaceholder?: string
  embedded?: boolean
  defaultActions?: boolean
  onEdit?: (item: Record<string, any>) => void
  onDelete?: (item: Record<string, any>) => Promise<void> | void
  confirmDeleteMessage?: string
  confirmDeleteTitle?: string
  compact?: boolean
  actions?: boolean
  createButtonLabel?: string
  editButtonLabel?: string
  deleteButtonLabel?: string
  showCreateButton?: boolean
  createButtonIcon?: string
  editOnRowClick?: boolean
  customActions?: CustomAction[]
  truncateText?: boolean | number
  animateChanges?: boolean
  animationDuration?: number
  showActionsColumn?: boolean
  serverSidePagination?: boolean
  paginationMeta?: {
    total: number
    currentPage: number
    limit: number
    totalPages: number
  }
}

export interface TableEmits {
  (e: 'add'): void
  (e: 'create', ctx?: any): void
  (e: 'update', item: Record<string, any>): void
  (e: 'delete', item: Record<string, any>): void
  (e: 'row-click', item: Record<string, any>): void
  (e: 'row-double-click', item: Record<string, any>): void
  (e: 'sort', payload: { sortBy: string | null; sortDesc: boolean }): void
  (e: 'refresh'): void
  (e: 'custom-action', key: string, item: Record<string, any>, ctx?: any): void
  (e: 'page-change', payload: { currentPage: number; limit: number }): void
}
