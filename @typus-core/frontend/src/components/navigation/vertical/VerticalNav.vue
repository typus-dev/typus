<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePersistStore } from '@/core/store/persistStore'
import NavSection from './NavSection.vue'
import NavDivider from './NavDivider.vue'
import type { MenuItem } from '@/shared/types/menu'
import { useMenuFilter } from '@/components/navigation/useMenuFilter'

interface Props {
  items: MenuItem[]
}

const props = defineProps<Props>()

const store = usePersistStore()
const NAV_STATE_KEY = 'nav_open_sections'
const searchQuery = ref('')

logger.debug('🔍 MENU DEBUG: Original navigationItems:', props.items)

// Get ability-filtered items reactively
const { filteredMenu: abilityFilteredItems } = useMenuFilter(props.items)

// Debug ability filtering
watch(abilityFilteredItems, (newItems) => {
  logger.debug('🔍 MENU DEBUG: Ability filtered items:', newItems)
  logger.debug('🔍 MENU DEBUG: Items count after ability filter:', newItems.length)
}, { immediate: true })

// Create reactive menu items with persisted states
const menuItems = computed(() => {
  const items = abilityFilteredItems.value.map((item: MenuItem) => ({
    ...item,
    isOpen: store.get(NAV_STATE_KEY)?.[item.title] ?? item.isOpen ?? false,
    items: item.items?.map((subItem: MenuItem) => ({
      ...subItem,
      isOpen: store.get(NAV_STATE_KEY)?.[subItem.title] ?? subItem.isOpen ?? false
    }))
  }))
  logger.debug('🔍 MENU DEBUG: Menu items computed:', items)
  logger.debug('🔍 MENU DEBUG: Menu items count:', items.length)
  return items
})

const filteredItems = ref<MenuItem[]>([])

// Debug final rendered items
watch(filteredItems, (items) => {
  logger.debug('🔍 MENU DEBUG: Final filtered items for render:', items)
  logger.debug('🔍 MENU DEBUG: Final items count:', items.length)
}, { immediate: true })

const filterItems = () => {
  const query = searchQuery.value.toLowerCase().trim()
  logger.debug('🔍 MENU DEBUG: Filtering with query:', query)
  logger.debug('🔍 MENU DEBUG: Menu items before filter:', menuItems.value)

  if (!query) {
    filteredItems.value = [...menuItems.value]
    logger.debug('🔍 MENU DEBUG: Setting filteredItems to:', filteredItems.value)
    return
  }

  filteredItems.value = menuItems.value
    .map((section: MenuItem) => {
      if (section.type === 'line') return section

      // Check if section title matches
      const sectionTitleMatch = section.title.toLowerCase().includes(query)

      // Process items in section
      const matchedItems = section.items
        ?.map((item: MenuItem) => {
          const itemTitleMatch = item.title.toLowerCase().includes(query)
          const matchingItems = item.items?.filter((child: MenuItem) =>
            child.title.toLowerCase().includes(query)
          )

          if (sectionTitleMatch) {
            return {
              ...item,
              isOpen: item.items ? true : item.isOpen,
              items: item.items
            }
          }

          if (itemTitleMatch) {
            return {
              ...item,
              isOpen: true,
              items: item.items
            }
          }

          if (matchingItems?.length) {
            return {
              ...item,
              isOpen: true,
              items: matchingItems
            }
          }

          return null
        })
        .filter(Boolean) as MenuItem[]

      // Return section if it matches or has matching items
      if (sectionTitleMatch || matchedItems?.length) {
        return {
          ...section,
          isOpen: true,
          items: sectionTitleMatch ? section.items : matchedItems
        }
      }

      return null
    })
    .filter(Boolean) as MenuItem[]
}

// Watch for menu items changes and search query changes
watch(menuItems, () => {
  logger.debug('🔍 MENU DEBUG: Menu items changed, re-filtering')
  filterItems()
}, { immediate: true })

watch(searchQuery, (newQuery) => {
  logger.debug('🔍 MENU DEBUG: Search query changed:', newQuery)
  filterItems()
})
</script>

<template>
  <nav :class="['min-w-48 w-auto flex flex-col', 'theme-colors-background-primary']">
    <div
      class="sticky top-0 bg-inherit z-10 border-b"
      :class="'theme-colors-border-primary'"
    >
      <div :class="['theme-colors-text-primary', 'relative']">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Quick search..."
          :class="['theme-colors-background-primary', 'w-full py-2 px-4 text-sm']"
        />
        <dxIcon
          name="ri:search-line"
          size="sm"
          class="absolute right-3 top-1/2 transform -translate-y-1/2 opacity-50"
        />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar">
      <div class="p-3 space-y-2">
        <template v-for="(section, index) in filteredItems" :key="index">
          <NavDivider v-if="section.type === 'line'" />
          <NavSection v-else :section="section" />
        </template>
        
        <div v-if="filteredItems.length === 0" class="p-4 text-center text-gray-500">
          No menu items to display
        </div>
      </div>
    </div>
  </nav>
</template>
