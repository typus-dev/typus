import { computed } from 'vue'
import type { Column, TableProps } from './tableTypes'

export function useTableColumns(props: TableProps, safeData: Ref<Record<string, any>[]>) {
  const { windowWidth, isMobile, isTablet, isDesktop } = useBreakpoint()

  // Text truncation utility function
  const truncateContent = (value: any, maxLength: number = 50): string => {
    if (value === null || value === undefined) return ''
    const text = String(value)
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
  }

  // Check if formatted content should be truncated
  const shouldTruncateFormatted = (
    item: Record<string, any>,
    column: Column,
    maxLength: number
  ): boolean => {
    const formattedValue = getFormattedValue(item, column)
    if (formattedValue === null || formattedValue === undefined) return false
    const text = String(formattedValue)
    return text.length > maxLength
  }

  // Get formatted or original content based on column configuration
  const getFormattedValue = (item: Record<string, any>, column: Column) => {
    const value = getCellValue(item, column.key)

    // Apply column formatter if available
    if (column.formatter && typeof column.formatter === 'function') {
      return column.formatter(value, item)
    }

    return value
  }

  // Get display value with truncation applied to formatted content
  const getDisplayValue = (item: Record<string, any>, column: Column) => {
    const formattedValue = getFormattedValue(item, column)

    if (!props.truncateText) return formattedValue

    const maxLength = typeof props.truncateText === 'number' ? props.truncateText : 50
    return truncateContent(formattedValue, maxLength)
  }

  // Get column styles for flexible width management
  const getColumnStyles = (column: Column) => {
    const styles: Record<string, string> = {}

    if (column.width) {
      styles.width = column.width
      styles.maxWidth = column.width
      styles.minWidth = column.width
    } else if (column.flex) {
      styles.width = `${column.flex}fr`
    } else {
      styles.width = '1fr'
    }

    if (column.minWidth && !column.width) {
      styles.minWidth = column.minWidth
    }

    return styles
  }

  const getCellValue = (item: Record<string, any>, key: string) => {
    if (key.includes('.')) {
      return key.split('.').reduce((obj, prop) => obj?.[prop], item)
    }
    return item[key]
  }

  const formatHeader = (key: string): string =>
    key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()

  const computedColumns = computed<Column[]>(() => {
    if (props.columns && props.columns.length > 0) {
      // Filter out actions column from regular columns
      return props.columns.filter(col => col.key !== 'actions')
    }
    if (Array.isArray(safeData.value) && safeData.value.length > 0 && safeData.value[0]) {
      return Object.keys(safeData.value[0]).map(key => ({
        title: formatHeader(key),
        key: key,
        sortable: true
      }))
    }
    return []
  })

  // Get actions column configuration
  const actionsColumn = computed(() => {
    return props.columns?.find(col => col.key === 'actions')
  })

const showActionsColumn = computed(() => {
  return !!(
    props.showActionsColumn ||
    props.actions ||
    props.defaultActions ||
    props.customActions?.length > 0 ||
    actionsColumn.value
  )
})
  const showActions = computed(() => props.actions || props.defaultActions)

return {
    isMobile,
    isTablet,
    isDesktop,
    computedColumns,
    actionsColumn,
    showActionsColumn,
    showActions,
    getColumnStyles,
    getCellValue,
    getFormattedValue,
    getDisplayValue,
    truncateContent,
    shouldTruncateFormatted,
    formatHeader
  }
}
