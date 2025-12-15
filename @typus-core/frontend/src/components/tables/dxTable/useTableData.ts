import { ref, computed, watch, useAttrs } from 'vue'
import type { TableProps, TableEmits, Column } from './tableTypes'

export function useTableData(props: TableProps, emit: TableEmits) {
  const { confirmModal } = useModals()
  const attrs = useAttrs()
  
  // State
  const searchQuery = ref('')
  const currentPage = ref(props.paginationMeta?.currentPage || 1)
  const itemsPerPage = ref(props.defaultItemsPerPage)
  const sortBy = ref<string | null>(null)
  const sortDesc = ref(false)
  const safeData = ref([...(Array.isArray(props.data) ? props.data : [])])
  
  // Animation state
  const deletingItems = ref(new Set<string | number>())
  const pendingDeletes = ref(new Set<string | number>())
  
  // Flags
  let updatingFromProps = false

  // Computed
  const hasRowClickListener = computed(() => !!attrs.onRowClick || !!attrs['onRow-click'])

  const sortedData = computed(() => {
    if (!sortBy.value || safeData.value.length === 0) return [...safeData.value]

    return [...safeData.value].sort((a, b) => {
      let valA = a[sortBy.value!]
      let valB = b[sortBy.value!]
      if (valA < valB) return sortDesc.value ? 1 : -1
      if (valA > valB) return sortDesc.value ? -1 : 1
      return 0
    })
  })

  const filteredData = computed(() => {
    if (!searchQuery.value) return sortedData.value

    const query = searchQuery.value.toLowerCase()
    return sortedData.value.filter(item =>
      Object.values(item).some(val => String(val).toLowerCase().includes(query))
    )
  })

  const totalPages = computed(() => {
    if (props.serverSidePagination) {
      if (!props.paginationMeta?.total) {
        console.error('[dxTable] serverSidePagination requires paginationMeta.total')
        return 1
      }
      return props.paginationMeta.totalPages || 
             Math.ceil(props.paginationMeta.total / (props.paginationMeta.limit || itemsPerPage.value))
    }
    return Math.max(1, Math.ceil(filteredData.value.length / itemsPerPage.value))
  })

  const paginatedData = computed(() => {
    if (props.serverSidePagination) {
      return safeData.value
    }
    
    if (itemsPerPage.value <= 0 || filteredData.value.length === 0) {
      return filteredData.value
    }
    
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value
    }
    
    const start = (currentPage.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return filteredData.value.slice(start, end)
  })

  const tableContext = computed(() => ({
    refreshDataSource: () => emit('refresh')
  }))

  // Watchers
  watch(
    () => props.data,
    (newData) => {
      safeData.value = Array.isArray(newData) ? [...newData] : []
    },
    { deep: true }
  )

  watch(
    () => props.paginationMeta,
    (newMeta) => {
      if (props.serverSidePagination && newMeta) {
        updatingFromProps = true
        
        if (newMeta.currentPage && newMeta.currentPage !== currentPage.value) {
          currentPage.value = newMeta.currentPage
        }
        
        if (newMeta.limit && newMeta.limit !== itemsPerPage.value) {
          itemsPerPage.value = newMeta.limit
        }
        
        updatingFromProps = false
      }
    },
    { immediate: true }
  )

  watch(currentPage, (newValue, oldValue) => {
    if (updatingFromProps) return
    
    if (props.serverSidePagination) {
      emit('page-change', { currentPage: currentPage.value, limit: itemsPerPage.value })
    }
  })

  watch(itemsPerPage, (newValue, oldValue) => {
    if (updatingFromProps) return
    
    currentPage.value = 1
    if (props.serverSidePagination) {
      emit('page-change', { currentPage: currentPage.value, limit: itemsPerPage.value })
    }
  })

  watch(searchQuery, () => {
    currentPage.value = 1
  })

  // Utility functions
  const getRowKey = (item: Record<string, any>, index: number): string | number => {
    if (typeof props.rowKey === 'function') {
      const result = props.rowKey(item)
      if (result !== null && result !== undefined && !Number.isNaN(result)) {
        return result
      }
    }
    
    if (typeof props.rowKey === 'string' && item[props.rowKey] !== undefined) {
      const value = item[props.rowKey]
      if (value !== null && value !== undefined && !Number.isNaN(value)) {
        return value
      }
    }
    
    return index
  }

  const isItemDeleting = (item: Record<string, any>, index: number): boolean => {
    const key = getRowKey(item, index)
    return deletingItems.value.has(key)
  }

  const isItemPendingDelete = (item: Record<string, any>, index: number): boolean => {
    const key = getRowKey(item, index)
    return pendingDeletes.value.has(key)
  }

  // Event handlers
  const handleEdit = (item: any, event: Event) => {
    event.stopPropagation()
    emit('update', item)
    
    if (props.onEdit) {
      props.onEdit(item)
    }
  }

  const handleDelete = async (item: Record<string, any>, event: Event, index: number) => {
    event.stopPropagation()
    
    const rowKey = getRowKey(item, index)
    
    if (deletingItems.value.has(rowKey) || pendingDeletes.value.has(rowKey)) {
      return
    }

    const confirmed = await confirmModal(props.confirmDeleteMessage, {
      title: props.confirmDeleteTitle
    })

    if (confirmed) {
      if (props.animateChanges) {
        deletingItems.value.add(rowKey)
        
        try {
          if (props.onDelete) {
            await props.onDelete(item)
          } else {
            emit('delete', item)
          }
          
          const itemIndex = safeData.value.findIndex((dataItem, idx) => getRowKey(dataItem, idx) === rowKey)
          if (itemIndex !== -1) {
            safeData.value.splice(itemIndex, 1)
          }
          
          pendingDeletes.value.add(rowKey)
          
          setTimeout(() => {
            deletingItems.value.delete(rowKey)
            pendingDeletes.value.delete(rowKey)
          }, props.animationDuration)
          
        } catch (error) {
          deletingItems.value.delete(rowKey)
          throw error
        }
      } else {
        if (props.onDelete) {
          await props.onDelete(item)
        } else {
          emit('delete', item)
        }
        
        const itemIndex = safeData.value.findIndex((dataItem, idx) => getRowKey(dataItem, idx) === rowKey)
        if (itemIndex !== -1) {
          safeData.value.splice(itemIndex, 1)
        }
      }
    }
  }

  const handleCustomAction = async (
    action: any,
    item: Record<string, any>,
    event: Event
  ) => {
    event.stopPropagation()

    if (action.onClick) {
      await action.onClick(item)
    } else {
      emit('custom-action', action.key, item)
    }
  }

  const handleCreate = () => {
    emit('create')
    emit('add')
  }

  const handleSort = (columnKey: string, isSortable?: boolean) => {
    if (!isSortable) return

    if (sortBy.value === columnKey) {
      sortDesc.value = !sortDesc.value
    } else {
      sortBy.value = columnKey
      sortDesc.value = false
    }

    currentPage.value = 1
    emit('sort', { sortBy: sortBy.value, sortDesc: sortDesc.value })
  }

  const handleRowClick = (item: Record<string, any>, index: number) => {
    if (isItemDeleting(item, index)) return
    
    emit('row-click', item)

    if (props.editOnRowClick) {
      handleEdit(item, new Event('click'))
    }
  }

  return {
    searchQuery,
    currentPage,
    itemsPerPage,
    sortBy,
    sortDesc,
    safeData,
    deletingItems,
    pendingDeletes,
    hasRowClickListener,
    sortedData,
    filteredData,
    totalPages,
    paginatedData,
    isItemDeleting,
    isItemPendingDelete,
    getRowKey,
    handleEdit,
    handleDelete,
    handleCustomAction,
    handleCreate,
    handleSort,
    handleRowClick,
    tableContext
  }
}