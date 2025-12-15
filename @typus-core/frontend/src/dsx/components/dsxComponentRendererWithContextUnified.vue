<template>
  <div
    class="dsx-component-wrapper relative w-full"
    :data-theme="activeTheme || undefined"
    :data-component-id="componentId"
  >
    <component
      v-if="shouldRender"
      :is="resolvedComponent"
      v-bind="processedProps"
      v-on="processedEvents"
      :ref="currentConfig.refKey"
      :key="renderKey"
    >
      <template v-for="(slotContent, slotName) in processedSlots" :key="slotName" #[slotName]>
        <component v-if="typeof slotContent === 'object'" :is="slotContent" />
        <span v-else v-html="slotContent"></span>
      </template>
    </component>

    <!-- Loading placeholder -->
    <div v-else-if="isLoading" class="flex justify-center items-center min-h-12">
      <div
        :class="[
          'w-4 h-4 border-2 rounded-full animate-spin',
          'theme-colors-border-primary',
          'border-t-green-600'
        ]"
      ></div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" :class="[
      'p-2 border rounded',
      'theme-colors-background-error' || 'theme-colors-background-error',
      'theme-colors-border-error'
    ]">
      <p :class="[
        'text-sm m-0',
        'theme-colors-text-error' || 'theme-colors-text-error'
      ]">{{ error.message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  defineProps,
  ref,
  onMounted,
  onUnmounted,
  markRaw,
  computed,
  watch,
  inject,
  getCurrentInstance,
  isRef
} from 'vue'
import { getComponentName } from '@/shared/utils/componentUtils'
import { useActiveTheme } from '@/shared/composables/useActiveTheme'

import type { dsxComponentConfig, ComponentSetupClass, UnifiedContext } from '@/dsx/types/'

// Import components that need to be registered
import dxInput from '@/components/ui/dxInput.vue'
import dxDateTime from '@/components/ui/dxDateTime.vue'
import dxSelect from '@/components/ui/dxSelect/dxSelect.vue'
import dxTextArea from '@/components/ui/dxTextArea.vue'
import dxButton from '@/components/ui/dxButton.vue'
import dxSwitch from '@/components/ui/dxSwitch.vue'
import dxChart from '@/components/charts/dxChart.vue'
import dxTable from '@/components/tables/dxTable/dxTable.vue';
import dxText from '@/components/ui/dxText.vue'
import dxRawHtml from '@/components/ui/dxRawHtml.vue'
import dxFormJSON from '@/components/ui/dxFormJSON.vue'
import dxCard from '@/components/ui/dxCard.vue'
import dxList from '@/components/ui/dxList.vue'
import dxSearch from '@/components/ui/dxSearch.vue'
import dxForm from '@/components/ui/dxForm.vue'

// Component registry
const componentRegistry = {
  dxInput: markRaw(dxInput),
  dxDateTime: markRaw(dxDateTime),
  dxSelect: markRaw(dxSelect),
  dxTextArea: markRaw(dxTextArea),
  dxButton: markRaw(dxButton),
  dxSwitch: markRaw(dxSwitch),
  dxChart: markRaw(dxChart),
  dxTable: markRaw(dxTable),
  dxText: markRaw(dxText),
  dxRawHtml: markRaw(dxRawHtml),
  dxFormJSON: markRaw(dxFormJSON),
  dxCard: markRaw(dxCard),
  dxList: markRaw(dxList),
  dxSearch: markRaw(dxSearch),
  dxForm: markRaw(dxForm)
}

// Props
const props = defineProps<{
  config: dsxComponentConfig
  componentData?: any
}>()

// Composables
const activeTheme = useActiveTheme()
const instance = getCurrentInstance()

// Injected contexts
const blockContext = inject('blockContext', null) as any
const pageContext = inject('pageContext', null) as any
const blockId = inject('blockId', 'unknown')
const model = inject('model', null)

// State
const componentData = ref(props.componentData)
const currentConfig = ref({ ...props.config })
const setupInstance = ref<ComponentSetupClass | null>(null)
const isLoading = ref(false)
const error = ref<any>(null)
const renderKey = ref(0)

// Component ID
const componentId = computed(() => {
  return (
    currentConfig.value.id ||
    `${getComponentName(currentConfig.value.type)}-${instance?.uid || 'unknown'}`
  )
})

// Resolve component type
const resolvedComponent = computed(() => {
  const type = currentConfig.value.type

  if (typeof type === 'string') {
    // String reference - check registry
    if (componentRegistry[type as keyof typeof componentRegistry]) {
      return markRaw(componentRegistry[type as keyof typeof componentRegistry])
    }
    // HTML element
    return type
  }

  // Vue component
  return markRaw(type)
})

// Should render check
const shouldRender = computed(() => {
  return !isLoading.value && !error.value && resolvedComponent.value
})

// Wrapper class
const wrapperClass = computed(() => {
  const themeName = activeTheme.value
  return ['dsx-component-wrapper', themeName ? `theme-${themeName}` : '', (currentConfig.value as any).class]
    .filter(Boolean)
})

// Create unified context
const createUnifiedContext = (data: any = componentData.value): UnifiedContext => {
  const contextData = data || props.componentData || {}
  return {
    page: {
      data: pageContext?.state?.pageData || {},
      config: pageContext?.config || {},
      state: {
        isLoading: pageContext?.state?.isLoading || false,
        errors: pageContext?.state?.errors || null
      }
    },
    block: {
      data: contextData,
      config: blockContext?.config || {},
      state: {
        isChanged: blockContext?.state?.data?.isChanged || false,
        mode: blockContext?.state?.mode || 'view'
      },
      methods: {
        save: () => blockContext?.methods?.saveData() || Promise.resolve(),
        validate: () => blockContext?.methods?.validateData() || true,
        reload: () => blockContext?.methods?.loadData() || Promise.resolve()
      }
    },
    component: {
      data: contextData,
      config: currentConfig.value
    }
  }
}

// Setup external configuration
const setupExternalConfig = async () => {
  if (!currentConfig.value.setup) return

  try {
    if (typeof currentConfig.value.setup === 'function') {
      const setupResult = currentConfig.value.setup()
      if (setupResult && typeof setupResult === 'object') {
        Object.assign(currentConfig.value, setupResult)
      }
    } else if (typeof currentConfig.value.setup === 'object') {
      setupInstance.value = markRaw(currentConfig.value.setup as ComponentSetupClass)

      if (setupInstance.value.beforeLoad) {
        await setupInstance.value.beforeLoad(currentConfig.value)
      }

      const setupResult = setupInstance.value.setup()
      if (setupResult && typeof setupResult === 'object') {
        Object.assign(currentConfig.value, setupResult)
      }

      if (setupInstance.value.onMounted) {
        await setupInstance.value.onMounted()
      }
    }
  } catch (err) {
    console.error('Error in setupExternalConfig:', err)
    error.value = err
  }
}

// Load data with unified context
const loadData = async () => {
  if (!currentConfig.value.dataSource) {
    await processBeforeRender()
    return
  }

  isLoading.value = true
  error.value = null

  try {
    let config = currentConfig.value
    let data = componentData.value

    const unifiedContext = createUnifiedContext(data)

    // beforeDataFetchUnified
    if (setupInstance.value?.beforeDataFetchUnified) {
      await setupInstance.value.beforeDataFetchUnified(unifiedContext)
    } else if (typeof config.beforeDataFetchUnified === 'function') {
      await config.beforeDataFetchUnified(unifiedContext)
    }

    // Load data from dataSource
    if (typeof config.dataSource === 'function') {
      console.log('[DSX] Calling dataSource function')
      data = await config.dataSource()
      console.log(
        '[DSX] DataSource returned:',
        Array.isArray(data) ? `Array(${data.length})` : typeof data,
        data
      )
    } else {
      data = config.dataSource
    }

    componentData.value = data

    // afterDataFetchUnified
    if (data !== undefined) {
      const updatedContext = createUnifiedContext(data)

      if (setupInstance.value?.afterDataFetchUnified) {
        await setupInstance.value.afterDataFetchUnified(updatedContext)
      } else if (typeof config.afterDataFetchUnified === 'function') {
        await config.afterDataFetchUnified(updatedContext)
      }
    }
  } catch (err) {
    console.error('Error loading component data:', err)
    error.value = err
  } finally {
    isLoading.value = false
  }

  await processBeforeRender()
}

// Process beforeRender - ALWAYS called
const processBeforeRender = async () => {
  try {
    const data = componentData.value
    let config = currentConfig.value

    // Ensure config has proper structure
    if (!config.props) {
      config.props = {}
    }

    const unifiedContext = createUnifiedContext(data)

    // beforeRenderUnified - ALWAYS called
    if (setupInstance.value?.beforeRenderUnified) {
      await setupInstance.value.beforeRenderUnified(unifiedContext)
    } else if (typeof config.beforeRenderUnified === 'function') {
      await config.beforeRenderUnified(unifiedContext)
    }

    // Auto-inject data for data-driven components
    const componentName = typeof config.type === 'string' 
  ? config.type.toLowerCase() 
  : getComponentName(config.type).toLowerCase()

    const isDataDriven = ['chart', 'table', 'grid', 'list'].some(t => componentName.includes(t))

    
    console.log('[DSX] Component type check:', {
  type: config.type,
  componentName,
  isDataDriven,
  hasData: data !== undefined
})

    if (isDataDriven && data !== undefined) {
      console.log('[DSX] Before - config.props.data:', config.props.data)
      // Deep clone and mark as non-reactive
      if (data && typeof data === 'object' && 'labels' in data && 'datasets' in data) {
        // Chart data format
        config.props.data = markRaw(data)
      } else if (Array.isArray(data)) {
        // Simple array format
        config.props.data = markRaw(data)
      } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        // Pagination object format: {data: Array, paginationMeta: {...}}
        config.props.data = markRaw(data.data)
        config.props.paginationMeta = markRaw(data.paginationMeta)

        console.log('[DSX] Pagination object detected:', { 
          dataCount: data.data.length, 
          paginationMeta: data.paginationMeta 
        })
     
      } else {
        // Fallback for unknown formats
        config.props.data = markRaw([])
      }
      console.log('[DSX] After - config.props.data:', config.props.data)
    }

    currentConfig.value = config
  } catch (err) {
    console.error('Error in processBeforeRender:', err)
    error.value = err
  }
}

// Setup data binding for form components
const setupDataBinding = () => {
  if (!currentConfig.value.props) {
    currentConfig.value.props = {}
  }

  const dataValue = currentConfig.value.props.dataValue || currentConfig.value.dataValue
  if (dataValue && blockContext?.state?.data?.block) {
    const value = blockContext.state.data.block[dataValue]

    if (currentConfig.value.props.modelValue === undefined) {
      currentConfig.value.props.modelValue = computed(
        () => blockContext.state.data.block[dataValue]
      )
    }

    if (!currentConfig.value.events) {
      currentConfig.value.events = {}
    }

    if (!currentConfig.value.events['update:modelValue']) {
      currentConfig.value.events['update:modelValue'] = (newValue: any) => {
        if (blockContext?.state?.data?.block) {
          blockContext.state.data.block[dataValue] = newValue
        }
      }
    }
  }
}

// Process props - resolve functions and unwrap refs
const processedProps = computed(() => {
  if (!currentConfig.value.props) return {}

  const props: Record<string, any> = {}

  for (const [name, value] of Object.entries(currentConfig.value.props)) {
    if (typeof value === 'function') {
      const ctx = {
        blockId,
        componentId: componentId.value,
        model,
        blockContext,
        pageContext,
        ...createUnifiedContext()
      }
      props[name] = value(ctx)
    } else if (isRef(value)) {
      props[name] = value.value
    } else {
      props[name] = value
    }
  }

  const themeName = activeTheme.value || undefined
  props.theme = themeName
  props['data-theme'] = themeName

  return props
})



// Process events
const processedEvents = computed(() => {
  if (!currentConfig.value.events) return {}

  const events: Record<string, Function> = {}

  for (const [eventName, handler] of Object.entries(currentConfig.value.events)) {
    if (typeof handler !== 'function') continue

    events[eventName] = async (...args: any[]) => {
      const eventContext = {
        blockId,
        componentId: componentId.value,
        model,
        blockContext,
        pageContext,
        // Add unified context access
        ...createUnifiedContext(),
  updateProps: (newProps) => {
    Object.assign(currentConfig.value.props, newProps);
    renderKey.value++;
  }     
      }

      logger.debug('processedEvents.args', args)
      const result = await handler(eventContext, ...args)
      
      return result
    }
  }

  return events
})

// Process slots
const processedSlots = computed(() => {
  if (!currentConfig.value.slots) return {}

  const slots: Record<string, any> = {}

  for (const [slotName, slotContent] of Object.entries(currentConfig.value.slots)) {
    if (typeof slotContent === 'function') {
      slots[slotName] = slotContent(componentData.value)
    } else {
      slots[slotName] = slotContent
    }
  }

  return slots
})

watch(activeTheme, () => {
  renderKey.value++
})

// Watch for config changes
watch(
  () => props.config,
  async newConfig => {
    currentConfig.value = { ...newConfig }
    setupDataBinding()
    await processBeforeRender()
  },
  { deep: true }
)

// Watch for componentData changes
watch(
  () => props.componentData,
  async newData => {
    componentData.value = newData
    await processBeforeRender()
  }
)

// Lifecycle
onMounted(async () => {
  await setupExternalConfig()
  setupDataBinding()
  await loadData()
})

onUnmounted(async () => {
  if (setupInstance.value?.beforeUnload) {
    try {
      await setupInstance.value.beforeUnload()
    } catch (err) {
      console.error('Error in beforeUnload:', err)
    }
  }
})
</script>
