<template>
  <div class="card-item" :style="$.contentWidth">
    <dxCard background="secondary" bordered variant="elevated" fullHeight>
      <!-- Header: Preview with overlay -->
      <template #header>
        <div class="relative h-48 rounded-t-lg ">
          <!-- Background image or placeholder -->
          <img
            v-if="content.image_url"
            :src="content.image_url"
            :alt="content.title"
            class="w-full h-full object-cover absolute inset-0"
          />
          <div v-else class="absolute inset-0"></div>

          <!-- Content preview overlay -->
          <div class="absolute inset-0 pt-12 flex items-center justify-center cursor-pointer" @click="$.handleCardClick">
            <div class="w-full h-full overflow-hidden relative">
              <!-- HTML preview container -->
              <dxHtmlPreview
                :html="content.excerptHtml"
                :max-length="200"
                :class-name="content.image_url ? 'p-3 rounded backdrop-blur-sm' : ''"
              />

              <!-- Fade overlay for better readability -->
              <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 pointer-events-none"></div>
            </div>
          </div>

          <!-- Top right controls: Status badge, Debug icon, and Edit button -->
          <div class="absolute top-3 left-3 right-3 z-2 flex items-center justify-between">
            <dxBadge :variant="'outline'" size="sm" class="shadow-sm">
              <dxIcon :name="$.statusInfo.icon" class="w-3 h-3 mr-1" />
              {{ $.statusInfo.label }}
            </dxBadge>

            <div class="flex gap-2">
              <!-- Debug button -->
              <div class="relative">
                <dxButton
                  variant="ghost"
                  size="md"
                  iconOnly
                  class="hover:bg-white/20"
                  title="Debug State"
                  @click="$.showDebug = !$.showDebug"
                >
                  <dxIcon name="ri:bug-line" size="md" />
                </dxButton>
                
                <!-- Debug overlay -->
                <div
                  v-if="$.showDebug"
                  class="absolute top-full right-0 mt-2 p-4 bg-black/90 text-white text-xs rounded-lg shadow-xl backdrop-blur-sm w-96 z-[9999]"
                  style="max-height: 400px; overflow-y: auto;"
                >
                  <pre class="whitespace-pre-wrap">{{ $.debugData }}</pre>
                </div>
              </div>

              <dxButton
                variant="ghost"
                size="md"
                iconOnly
                class="hover:bg-white/20"
                title="Edit"
                @click.stop="$.handleCardClick"
              >
                <dxIcon name="ri:edit-line" size="md" />
              </dxButton>
            </div>
          </div>
        </div>
      </template>

      <!-- Content Body -->
      <div class="mb-3">
        <h3
          v-if="!$.isEditingTitle"
          class="font-semibold text-lg line-clamp-2 cursor-pointer transition-colors hover:opacity-80"
          @dblclick="$.startEditTitle"
          title="Double click to edit"
        >
          {{ content.title }}
        </h3>
        <input
          v-if="$.isEditingTitle"
          v-model="$.editTitleValue"
          @blur="$.finishEditTitle"
          @keydown.enter="$.finishEditTitle"
          @keydown.escape="$.cancelEditTitle"
          class="w-full font-semibold text-lg border-0 px-0 py-1 focus:outline-none focus:ring-0"
          autofocus
        />
      </div>

      <!-- Category badges -->
      <div class="flex flex-wrap gap-2 mb-3" v-if="content.categories?.length > 0">
        <dxBadge 
          v-for="category in content.categories.slice(0, 1)" 
          :key="category.id" 
          :variant="getCategoryBadgeVariant(category.name)" 
          size="md"
          class="px-3 py-1 text-sm"
        >
          {{ category.name }}
        </dxBadge>
      </div>

      <!-- Tag badges -->
      <div class="flex flex-wrap gap-2 mb-3" v-if="content.tags?.length > 0">
        <dxBadge
          v-for="tag in content.tags.slice(0, 3)"
          :key="tag"
          variant="secondary"
          size="sm"
        >
          {{ tag }}
        </dxBadge>
        <dxBadge v-if="content.tags.length > 3" variant="secondary" size="sm">
          +{{ content.tags.length - 3 }}
        </dxBadge>
      </div>

      <!-- Metadata -->
      <div class="text-sm mb-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1">
            <dxIcon name="ri:edit-line" size="sm" />
            <span>{{ formatDate(content.updated_date) }}</span>
          </div>

          <div v-if="content.status === 'published' || content.status === 'scheduled'" class="flex items-center gap-1">
            <dxIcon :name="content.status === 'published' ? 'ri:global-line' : 'ri:time-line'" size="sm" />
            <span>{{ $.formatPublishDate }}</span>
          </div>
        </div>
      </div>

      <!-- Footer: Views, Cache, Actions -->
      <template #footer>
        <div class="flex items-center justify-between">
          <!-- Views & Cache info -->
          <div class="flex items-center gap-2 text-sm">
            <dxIcon name="ri:eye-line" size="sm" />
            <span>{{ content.views || 0 }}</span>

            <!-- Cache Control -->
            <div
              v-if="content.cacheInfo"
              class="flex items-center gap-1 cursor-pointer transition-colors"
              :class="content.cacheInfo.exists ? 'theme-colors-text-success hover:theme-colors-text-error' : 'text-gray-400 theme-mixins-interactive'"
              :title="$.getCacheTooltip"
              @mouseenter="$.handleCacheHover(true)"
              @mouseleave="$.handleCacheHover(false)"
              @click="$emit('cache-action', content)"
            >
              <dxIcon :name="$.cacheIcon" size="sm" />
              <span v-if="content.cacheInfo.exists" class="text-xs">{{ formatCacheSize(content.cacheInfo.size) }}</span>
            </div>

            <!-- External Link -->
            <dxIcon
              v-if="content.sitePath"
              name="ri:external-link-line"
              size="sm"
              class="text-gray-400 theme-mixins-interactive cursor-pointer transition-colors"
              title="Open in new tab"
              @click="$emit('open-external', content)"
            />
          </div>

          <!-- Quick Actions -->
          <div class="flex gap-1">
            <!-- Publish action -->
            <dxButton
              v-if="content.status !== 'published'"
              variant="ghost" size="sm" iconOnly
              @click="$emit('update-status', { id: content.id, status: 'published' })"
              title="Publish"
            >
              <dxIcon name="ri:global-line" size="sm" />
            </dxButton>

            <!-- Schedule picker -->
            <dropdown-menu width="w-80" :position="'top-right'">
              <template #trigger>
                <dxButton
                  variant="ghost" size="sm" iconOnly
                  title="Schedule publish date"
                >
                  <dxIcon name="ri:calendar-line" size="sm" />
                </dxButton>
              </template>

              <div class="p-3">
                <h4 class="text-sm font-medium mb-3">Schedule publication</h4>
                <dxDateTime
                  v-model="$.scheduleValue"
                  placeholder="Select date and time"
                  showCalendar
                  showTime
                  size="sm"
                  @update:modelValue="$.handleScheduleUpdate"
                />
              </div>
            </dropdown-menu>

            <!-- Draft action -->
            <dxButton
              v-if="content.status !== 'draft'"
              variant="ghost" size="sm" iconOnly
              @click="$emit('update-status', { id: content.id, status: 'draft' })"
              title="Move to draft"
            >
              <dxIcon name="ri:draft-line" size="sm" />
            </dxButton>

            <!-- More actions dropdown -->
            <dropdown-menu width="w-56" :position="'top-right'">
              <template #trigger>
                <dxButton variant="ghost" size="sm" iconOnly>
                  <dxIcon name="ri:more-fill" size="sm" />
                </dxButton>
              </template>

              <template #default>
                <div class="py-1">
                  <button 
                    v-if="content.sitePath"
                    :class="[
                      'flex items-center w-full px-4 py-2 transition',
                      'theme-typography-size-sm',
                      'theme-colors-text-primary',
                      'hover:theme-colors-background-hover'
                    ]"
                    @click="$emit('open-external', content)"
                  >
                    <dxIcon name="ri:external-link-line" size="sm" :customClass="'theme-colors-text-secondary'" class="mr-3" />
                    Open in new tab
                  </button>
                  <button 
                    :class="[
                      'flex items-center w-full px-4 py-2 transition',
                      'theme-typography-size-sm',
                      'theme-colors-text-primary',
                      'hover:theme-colors-background-hover'
                    ]"
                    @click="$emit('delete', content.id)"
                  >
                    <dxIcon name="ri:delete-bin-line" size="sm" :customClass="'theme-colors-text-secondary'" class="mr-3" />
                    Delete
                  </button>
                </div>
              </template>
            </dropdown-menu>
          </div>
        </div>
      </template>
    </dxCard>
  </div>
</template>

<script setup lang="ts">
import { nextTick, computed, reactive } from 'vue'
import { CmsMethods } from '../methods/cms.methods.dsx'
import { useCmsCache } from '../composables/useCmsCache'
import { logger } from '@/core/logging/logger'
import { useTheme } from '@/core/theme/composables/useTheme' 

// Components
import dxButton from '@/components/ui/dxButton.vue'
import dxIcon from '@/components/ui/dxIcon.vue'
import dxCard from '@/components/ui/dxCard.vue'
import dxBadge from '@/components/ui/dxBadge.vue'
import dxDateTime from '@/components/ui/dxDateTime.vue'
import dxHtmlPreview from '@/components/ui/dxHtmlPreview.vue'
import DropdownMenu from '@/components/base/DropdownMenu.vue'

// Utils
import { getStatusInfo as getStatusInfoFn } from '../cms.constants'
import { getCategoryBadgeVariant, formatDate, formatCacheSize } from '../cms.utils'

// Props
interface Props {
  content: any
  width?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: '480px'
})

// Emits
const emit = defineEmits<{
  'edit-content': [content: any]
  'update-status': [data: { id: number; status: string }]
  'update-schedule': [data: { content: any; date: string }]
  'update-title': [data: { id: number; title: string }]
  'delete': [id: number]
  'cache-action': [content: any]
  'cache-hover-changed': [data: { contentId: number; isHovered: boolean }]
  'open-external': [content: any]
}>()

// External dependencies
const cache = useCmsCache()
// Unified state object
const $ = reactive({
  // Local state
  isEditingTitle: false,
  editTitleValue: '',
  scheduleValue: null as string | null,
  showDebug: false,
  
  // Computed values
  contentWidth: computed(() => ({ width: props.width })),
  statusInfo: computed(() => getStatusInfoFn(props.content.status)),
  formatPublishDate: computed(() => {
    const dateString = props.content.status === 'scheduled' && props.content.publish_date
      ? props.content.publish_date
      : props.content.updated_date
    return formatDate(dateString)
  }),
  cacheIcon: computed(() => {
    if (!props.content.cacheInfo?.exists) return 'ri:database-2-line'
    return cache.cacheHoverState.value.has(props.content.id)
      ? 'ri:close-circle-line'
      : 'ri:database-2-fill'
  }),
  getCacheTooltip: computed(() => {
    if (!props.content.cacheInfo?.exists) return 'Generate cache'
    return cache.cacheHoverState.value.has(props.content.id)
      ? 'Clear cache'
      : `Cached (${formatCacheSize(props.content.cacheInfo.size)})`
  }),
  
  // Debug data with truncated values
  debugData: computed(() => {
    const truncate = (str: string, length = 100) => 
      str?.length > length ? str.substring(0, length) + '...' : str
    
    return JSON.stringify({
      state: {
        isEditingTitle: $.isEditingTitle,
        editTitleValue: $.editTitleValue,
        scheduleValue: $.scheduleValue,
        showDebug: $.showDebug
      },
      props: {
        width: props.width,
        content: {
          ...props.content,
          title: truncate(props.content.title),
          excerptHtml: truncate(props.content.excerptHtml),
          content: truncate(props.content.content)
        }
      },
      computed: {
        statusInfo: $.statusInfo,
        formatPublishDate: $.formatPublishDate,
        cacheIcon: $.cacheIcon,
        getCacheTooltip: $.getCacheTooltip
      },
      external: {
        cache: cache.cacheHoverState.value.size,
        theme: 'useTheme()'
      }
    }, null, 2)
  }),
  
  // Actions
  handleCardClick: () => emit('edit-content', props.content),
  
  startEditTitle: () => {
    $.isEditingTitle = true
    $.editTitleValue = props.content.title
    nextTick(() => {
      const input = document.querySelector('input[autofocus]') as HTMLInputElement
      input?.focus()
    })
  },
  
  finishEditTitle: async () => {
    if (!$.editTitleValue.trim() || $.editTitleValue === props.content.title) {
      $.cancelEditTitle()
      return
    }

    try {
      await CmsMethods.updateContentItem(
        { title: $.editTitleValue.trim() },
        { id: props.content.id.toString() }
      )

      emit('update-title', { id: props.content.id, title: $.editTitleValue.trim() })
      logger.debug('[CmsContentCard] Title updated', { id: props.content.id, newTitle: $.editTitleValue })
      $.cancelEditTitle()
    } catch (error) {
      logger.error('[CmsContentCard] Error updating title', { error })
    }
  },
  
  cancelEditTitle: () => {
    $.isEditingTitle = false
    $.editTitleValue = ''
  },
  
  handleScheduleUpdate: () => {
    emit('update-schedule', { content: props.content, date: $.scheduleValue })
  },
  
  handleCacheHover: (isHovered: boolean) => {
    emit('cache-hover-changed', { contentId: props.content.id, isHovered })
  }
})
</script>
