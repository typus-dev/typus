<template>
  <div class="card-item" :style="$.contentWidth">
    <dxCard
      background="secondary"
      bordered
      variant="elevated"
      fullHeight
      class="group h-full overflow-hidden transition-all duration-200"
      :class="[
        content.status === 'draft' ? $.draftCardHighlight : '',
        $.statusHoverOutline
      ]"
    >
      <template #header>
        <!-- Title at top -->
        <div class="pb-2">
          <h3
            v-if="!$.isEditingTitle"
            class="cursor-pointer text-lg font-semibold leading-tight line-clamp-2"
            :class="$.titleClass"
            @dblclick="$.startEditTitle"
            @click="$.handleCardClick"
          >
            {{ $.displayTitle }}
          </h3>
          <input
            v-else
            v-model="$.editTitleValue"
            @blur="$.finishEditTitle"
            @keydown.enter="$.finishEditTitle"
            @keydown.escape="$.cancelEditTitle"
            class="w-full border-0 bg-transparent px-0 py-1 text-lg font-semibold focus:outline-none focus:ring-0"
            :class="$.titleInputClass"
            autofocus
          />
        </div>

        <div class="relative overflow-hidden rounded-t-lg">
          <div
            class="aspect-video w-full relative"
            :class="$.previewBackgroundClass"
          >
            <img
              v-if="$.previewImageUrl"
              :src="$.previewImageUrl"
              :alt="content.title"
              class="absolute inset-0 h-full w-full object-cover"
            />
            <div
              v-else-if="!$.hasPreviewText"
              class="absolute inset-0 flex h-full w-full items-center justify-center"
              :class="$.previewPlaceholderBackground"
            >
              <dxIcon name="ri:pencil-line" size="xl" :customClass="$.previewPlaceholderIconClass" />
            </div>

            <button
              type="button"
              :class="$.previewTextContainerClass"
              @click="$.handleCardClick"
            >
              <dxHtmlPreview
                :html="content.excerptHtml"
                :max-length="220"
                :class-name="$.previewHtmlClass"
              />
            </button>

            <div
              v-if="$.previewStatusOverlay"
              class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
              :class="$.previewStatusOverlay.wrapperClass"
            >
              <dxIcon :name="$.previewStatusOverlay.icon" size="xl" :customClass="$.previewStatusOverlay.iconClass" />
            </div>
          </div>

          <div class="absolute top-3 left-3 z-10">
            <span
              class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow"
              :class="$.statusBadgeClass"
            >
              <span
                class="inline-flex h-2 w-2 rounded-full"
                :class="$.statusDotClass"
                aria-hidden="true"
              ></span>
              {{ $.statusInfo.label }}
            </span>
          </div>

          <div v-if="content.cacheInfo?.exists" class="absolute top-3 right-3 z-10">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition"
              :class="$.cacheBadgeClass"
              :title="$.getCacheTooltip"
              @mouseenter="$.handleCacheHover(true)"
              @mouseleave="$.handleCacheHover(false)"
              @click.stop="$emit('cache-action', content)"
            >
              <span class="h-2 w-2 rounded-full" :class="$.cacheIndicatorClass" aria-hidden="true"></span>
              Cached
            </button>
          </div>
        </div>
      </template>

      <div class="pt-3 pb-6 space-y-4 self-start w-full">
        <div
          v-if="$.primaryCategory || content.updated_date"
          class="flex flex-wrap items-center gap-3 text-sm"
          :class="$.metaTextClass"
        >
          <dxBadge
            v-if="$.primaryCategory"
            :variant="getCategoryBadgeVariant($.primaryCategory.name)"
            size="md"
            class="rounded-full px-3 py-1 text-sm"
          >
            {{ $.primaryCategory.name }}
          </dxBadge>

          <div class="flex items-center gap-2">
            <dxIcon name="ri:edit-line" size="sm" :class="$.mutedIconClass" />
            <span>{{ formatDate(content.updated_date) }}</span>
          </div>

          <div
            v-if="content.status === 'published' || content.status === 'scheduled'"
            class="flex items-center gap-2"
          >
            <dxIcon
              :name="content.status === 'published' ? 'ri:global-line' : 'ri:time-line'"
              size="sm"
              :class="$.mutedIconClass"
            />
            <span>{{ $.formatPublishDate }}</span>
          </div>
        </div>

        <div v-if="content.tags?.length" class="flex flex-wrap gap-2">
          <dxBadge
            v-for="tag in content.tags.slice(0, 3)"
            :key="tag"
            variant="secondary"
            size="sm"
            class="rounded-full px-2.5 py-1 text-xs"
            :class="$.tagClass"
          >
            {{ tag }}
          </dxBadge>
          <dxBadge
            v-if="content.tags.length > 3"
            variant="secondary"
            size="sm"
            class="rounded-full px-2.5 py-1 text-xs"
            :class="$.tagOverflowClass"
          >
            +{{ content.tags.length - 3 }}
          </dxBadge>
        </div>

        <div v-if="$.showDebug" class="relative">
          <div :class="$.debugOverlayClass">
            <pre class="whitespace-pre-wrap">{{ $.debugData }}</pre>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-2 rounded-full p-1 text-xs font-medium" :class="$.footerPillClass">
            <button
              type="button"
              class="rounded-full transition"
              :class="$.statusButtonClass('draft')"
              @click="$emit('update-status', { id: content.id, status: 'draft' })"
            >
              <span :class="$.statusButtonLabelClass('draft')">Draft</span>
            </button>
            <button
              type="button"
              class="rounded-full transition"
              :class="$.statusButtonClass('published')"
              @click="$emit('update-status', { id: content.id, status: 'published' })"
            >
              <span :class="$.statusButtonLabelClass('published')">Publish</span>
            </button>
            <dropdown-menu width="w-80" :position="'top-right'">
              <template #trigger>
                <button
                  type="button"
                  class="rounded-full transition"
                  :class="$.statusButtonClass('scheduled')"
                >
                  <span :class="$.statusButtonLabelClass('scheduled')">Postpone</span>
                </button>
              </template>

              <div class="p-3">
                <h4 class="mb-3 text-sm font-medium" :class="$.headingTextClass">Schedule publication</h4>
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
          </div>

          <div class="flex items-center gap-2" :class="$.metaTextClass">
            <dxButton
              v-if="content.sitePath"
              variant="ghost"
              size="sm"
              iconOnly
              class="rounded-full"
              :class="$.ghostButtonHoverClass"
              title="Open in new tab"
              @click="$emit('open-external', content)"
            >
              <dxIcon name="ri:external-link-line" size="sm" />
            </dxButton>

            <dxButton
              variant="ghost"
              size="sm"
              iconOnly
              class="rounded-full"
              :class="$.ghostButtonHoverClass"
              title="Edit"
              @click.stop="$.handleCardClick"
            >
              <dxIcon name="ri:edit-line" size="sm" />
            </dxButton>

            <dropdown-menu width="w-56" :position="'top-right'">
              <template #trigger>
                <dxButton variant="ghost" size="sm" iconOnly class="rounded-full" :class="$.ghostButtonHoverClass">
                  <dxIcon name="ri:more-fill" size="sm" />
                </dxButton>
              </template>

              <template #default>
                <div class="py-1">
                  <button
                    v-if="content.sitePath"
                    :class="$.dropdownItemClass"
                    @click="$emit('open-external', content)"
                  >
                    <dxIcon name="ri:external-link-line" size="sm" :customClass="$.mutedIconClass" class="mr-3" />
                    Open in new tab
                  </button>
                  <button
                    :class="$.dropdownItemClass"
                    @click="$emit('delete', content.id)"
                  >
                    <dxIcon name="ri:delete-bin-line" size="sm" :customClass="$.mutedIconClass" class="mr-3" />
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
import { themeClass } from '@/shared/utils/themeClass'

import dxButton from '@/components/ui/dxButton.vue'
import dxIcon from '@/components/ui/dxIcon.vue'
import dxCard from '@/components/ui/dxCard.vue'
import dxBadge from '@/components/ui/dxBadge.vue'
import dxDateTime from '@/components/ui/dxDateTime.vue'
import dxHtmlPreview from '@/components/ui/dxHtmlPreview.vue'
import DropdownMenu from '@/components/base/DropdownMenu.vue'

import { getStatusInfo as getStatusInfoFn } from '../cms.constants'
import { getCategoryBadgeVariant, formatDate, formatCacheSize } from '../cms.utils'

interface Props {
  content: any
  width?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: '480px'
})

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

const cache = useCmsCache()

const applyModifier = (value: string | undefined, modifier: string) => {
  if (!value) return ''

  return value
    .split(' ')
    .filter(Boolean)
    .map((token) => `${modifier}:${token}`)
    .join(' ')
}

const combineClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(' ')

const stripTokens = (value: string | undefined, pattern: RegExp) => {
  if (!value) return ''

  return value
    .split(' ')
    .filter((token) => !pattern.test(token))
    .join(' ')
}

const textColors = computed(() => ({
  primary: 'theme-colors-text-primary',
  secondary: 'theme-colors-text-secondary',
  tertiary: 'theme-colors-text-tertiary',
  contrast: 'theme-colors-text-contrast',
  accent: 'theme-colors-text-accent',
  info: 'theme-colors-text-info'
}))

const backgroundColors = computed(() => ({
  primary: 'theme-colors-background-primary',
  secondary: 'theme-colors-background-secondary',
  tertiary: 'theme-colors-background-tertiary',
  hover: 'theme-colors-background-hover',
  success: 'theme-colors-background-success',
  info: 'theme-colors-background-info',
  infoHover: 'theme-colors-background-infoHover'
}))

const borderColors = computed(() => ({
  primary: 'theme-colors-border-primary',
  secondary: 'theme-colors-border-secondary',
  focus: 'theme-colors-border-focus',
  info: 'theme-colors-border-info'
}))

const $ = reactive({
  isEditingTitle: false,
  editTitleValue: '',
  scheduleValue: null as string | null,
  showDebug: false,

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
  primaryCategory: computed(() => props.content.categories?.[0] ?? null),
  previewBackgroundClass: computed(() => 'theme-colors-background-secondary'),
  previewPlaceholderBackground: computed(() => 'theme-colors-background-secondary'),
  previewImageUrl: computed(() => {
    if (props.content.image_url) return props.content.image_url

    const htmlSources = [
      props.content.previewHtml,
      props.content.excerptHtml,
      props.content.content
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

    for (const source of htmlSources) {
      const imgSrcMatch = source.match(/<img[^>]*src=["']([^"']+)["']/i)
      if (imgSrcMatch?.[1]) return imgSrcMatch[1]

      const dataSrcMatch = source.match(/data-dxce-src=["']([^"']+)["']/i)
      if (dataSrcMatch?.[1]) return dataSrcMatch[1]
    }

    return null
  }),
  hasPreviewText: computed(() => {
    const potentialSources = [props.content.excerptHtml, props.content.previewHtml, props.content.content]
    return potentialSources.some((value) => typeof value === 'string' && value.trim().length > 0)
  }),
  previewTextContainerClass: computed(() => {
    const base = 'absolute inset-0 flex h-full w-full text-left transition-opacity duration-200'
    const textClass = $.previewImageUrl ? textColors.value.contrast : textColors.value.primary
    const alignment = $.previewImageUrl ? 'items-end justify-start text-sm' : 'items-start justify-start text-base p-4'

    return combineClasses(base, alignment, textClass)
  }),
  previewHtmlClass: computed(() => {
    const base = $.previewImageUrl ? 'line-clamp-2 w-full !p-0' : 'w-full leading-relaxed !p-0'
    const textClass = $.previewImageUrl
      ? textColors.value.contrast
      : textColors.value.primary

    return combineClasses(base, textClass)
  }),
  previewPlaceholderIconClass: computed(() =>
    combineClasses(textColors.value.tertiary)
  ),
  previewStatusOverlay: computed(() => {
    if (props.content.status === 'scheduled') {
      return {
        icon: 'ri:time-line',
        wrapperClass: 'backdrop-blur-sm',
        iconClass: combineClasses(textColors.value.primary)
      }
    }

    if (props.content.status === 'draft') {
      return {
        icon: 'ri:pencil-line',
        wrapperClass: 'backdrop-blur-sm',
        iconClass: combineClasses(textColors.value.primary)
      }
    }

    return null
  }),
  isStatusOverlayVisible: computed(() => ['draft', 'scheduled'].includes(props.content.status)),
  statusHoverOutline: computed(() => {
    if (!$.isStatusOverlayVisible) return ''

    const focusClass = borderColors.value.focus
    const subtleClass = borderColors.value.secondary
    const hoverColor = focusClass || subtleClass
    return combineClasses(
      'group-hover:border',
      'group-hover:border-dashed',
      applyModifier(hoverColor, 'group-hover')
    )
  }),
  statusDotClass: computed(() => {
    if (props.content.status === 'published') return backgroundColors.value.success
    if (props.content.status === 'scheduled') return backgroundColors.value.info
    return backgroundColors.value.warning
  }),
  draftCardHighlight: computed(() =>
    combineClasses(
      'border border-dashed',
      borderColors.value.secondary
    )
  ),
  statusBadgeClass: computed(() =>
    combineClasses(
      'border',
      borderColors.value.secondary,
      backgroundColors.value.tertiary,
      textColors.value.primary
    )
  ),
  titleClass: computed(() =>
    combineClasses(
      textColors.value.primary,
      applyModifier(textColors.value.accent, 'hover'),
      'transition'
    )
  ),
  titleInputClass: computed(() => textColors.value.primary),
  metaTextClass: computed(() => textColors.value.secondary),
  mutedIconClass: computed(() => textColors.value.tertiary),
  tagClass: computed(() => combineClasses(backgroundColors.value.tertiary, textColors.value.secondary)),
  tagOverflowClass: computed(() => combineClasses(backgroundColors.value.hover, textColors.value.secondary)),
  debugOverlayClass: computed(() =>
    combineClasses(
      'absolute right-0 top-0 z-20 max-h-64 w-full overflow-y-auto rounded-lg p-4 text-xs',
      backgroundColors.value.primary,
      textColors.value.primary
    )
  ),
  footerPillClass: computed(() => combineClasses(backgroundColors.value.secondary, textColors.value.secondary)),
  headingTextClass: computed(() => textColors.value.primary),
  ghostButtonHoverClass: computed(() =>
    applyModifier(backgroundColors.value.hover, 'hover')
  ),
  dropdownItemClass: computed(() =>
    combineClasses(
      'flex items-center w-full px-4 py-2 transition text-sm text-left',
      textColors.value.primary,
      applyModifier(backgroundColors.value.hover, 'hover')
    )
  ),
  actionIconButtonClass: computed(() =>
    combineClasses(
      backgroundColors.value.tertiary,
      textColors.value.secondary,
      applyModifier(backgroundColors.value.hover, 'hover')
    )
  ),
  cacheBadgeClass: computed(() =>
    combineClasses(
      'border',
      borderColors.value.info,
      backgroundColors.value.info,
      textColors.value.contrast,
      applyModifier(borderColors.value.info, 'hover'),
      applyModifier(backgroundColors.value.infoHover ?? backgroundColors.value.info, 'hover')
    )
  ),
  cacheIndicatorClass: computed(() => backgroundColors.value.infoHover ?? backgroundColors.value.info),
  statusButtonClass: (status: 'draft' | 'published' | 'scheduled') => {
    const variant = props.content.status === status ? 'primary' : 'secondary'

    const base = 'theme-components-button-base'
    const interactive = 'theme-mixins-interactive'
    const radius = 'theme-components-button-radius'
    const spacing = 'theme-components-button-spacing-xs'
    const size = stripTokens('theme-components-button-size-xs', /^(?:[a-z]+:)?min-w-/)
    const variantClass = themeClass('components', 'button', 'variants', variant)

    return combineClasses(
      base,
      interactive,
      radius,
      spacing,
      size,
      'text-xs font-medium leading-tight',
      variantClass
    )
  },
  statusButtonLabelClass: (status: 'draft' | 'published' | 'scheduled') => {
    const isActive = props.content.status === status
    return isActive ? textColors.value.primary : textColors.value.secondary
  },
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
  displayTitle: computed(() => {
    const title = props.content.title ?? ''
    if (title.length <= 80) return title
    return `${title.slice(0, 80).trimEnd()}...`
  }),

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
      logger.debug('[CmsContentCardV2] Title updated', { id: props.content.id, newTitle: $.editTitleValue })
      $.cancelEditTitle()
    } catch (error) {
      logger.error('[CmsContentCardV2] Error updating title', { error })
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
