<script setup lang="ts">
import { computed, defineProps, defineEmits, ref } from 'vue'
import type { ICmsItem } from '../types'
import { CmsMethods } from '../methods/cms.methods.dsx'
import { useMessages } from '@/shared/composables/useMessages'
import { logger } from '@/core/logging/logger'

// Components
import dxInput from '@/components/ui/dxInput.vue'
import dxSelect from '@/components/ui/dxSelect/dxSelect.vue'
import dxSwitch from '@/components/ui/dxSwitch.vue'
import dxButton from '@/components/ui/dxButton.vue'
import dxIcon from '@/components/ui/dxIcon.vue'
import dxFlex from '@/components/layout/dxFlex.vue'

interface Props {
  modelValue: Partial<ICmsItem>
  mediaOptions: Array<{ value: number; label: string; url?: string }>
}


interface Emits {
  'update:modelValue': [value: Partial<ICmsItem>]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { successMessage, errorMessage } = useMessages()
const aiLoading = ref(false)

// Computed properties for character counts
const metaTitleLength = computed(() => props.modelValue.metaTitle?.length || 0)
const metaDescriptionLength = computed(() => props.modelValue.metaDescription?.length || 0)

function updateField(field: keyof ICmsItem, value: any) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

function updateRobotsMeta(isIndex: boolean, isFollow?: boolean) {
  const currentFollow = !props.modelValue.robotsMeta?.includes('nofollow')
  const currentIndex = !props.modelValue.robotsMeta?.includes('noindex')

  let newValue = ''
  if (isFollow !== undefined) {
    newValue = `${currentIndex ? 'index' : 'noindex'},${isFollow ? 'follow' : 'nofollow'}`
  } else {
    newValue = `${isIndex ? 'index' : 'noindex'},${currentFollow ? 'follow' : 'nofollow'}`
  }

  updateField('robotsMeta', newValue)
}

async function generateSeoWithAI() {
  logger.debug('[generateSeoWithAI]', props.modelValue)
  if (!props.modelValue.id) {
    errorMessage('Content item ID is required')
    return
  }

  aiLoading.value = true
  try {
    const seoData = await CmsMethods.generateSeoWithAI(props.modelValue.id)

    logger.debug('[generateSeoWithAI]', seoData)
    // Update all SEO fields
    emit('update:modelValue', {
      ...props.modelValue,
      metaTitle: seoData.metaTitle,
      metaDescription: seoData.metaDescription,
      metaKeywords: seoData.metaKeywords,
      ogTitle: seoData.ogTitle,
      ogDescription: seoData.ogDescription
    })

    successMessage('SEO fields generated successfully!')
  } catch (error: any) {
    console.error('Failed to generate SEO fields:', error)
    errorMessage(error.message || 'Failed to generate SEO fields')
  } finally {
    aiLoading.value = false
  }
}
</script>

<template>
  <aside :class="['theme-colors-background-secondary', 'theme-border'.primary,'border-r p-2 md:p-6 overflow-y-auto']">
    <div class="space-y-3 md:space-y-6">
      <!-- AI Generation Section -->
      <div :class="['theme-colors-background-info', 'theme-border'.info, 'p-4 rounded-lg border']">
        <dxFlex justify="between" align="center" class="mb-3">
          <h3 :class="['text-sm font-semibold', 'theme-colors-text-info']">AI Assistant</h3>
          <dxIcon name="ri:robot-line" :class="'theme-colors-text-info'" size="sm" />
        </dxFlex>

        <dxButton
          @click="generateSeoWithAI"
          variant="primary"
          size="sm"
          :disabled="aiLoading"
          class="w-full"
        >
          <template #prefix="{ iconColor }">
            <dxIcon name="ri:magic-line" size="sm" :class="iconColor" />
          </template>
          {{ aiLoading ? 'Generating...' : 'Generate SEO with AI' }}
        </dxButton>

        <p :class="['text-xs mt-2', 'theme-colors-text-info']">Automatically fill SEO fields based on content</p>
      </div>

      <!-- Meta Data -->
      <div>
        <h3 :class="['text-sm font-semibold mb-3', 'theme-colors-text-primary']">Meta Data</h3>
        <div class="space-y-4">
          <div>
            <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']"> Meta Title * </label>
            <dxInput
              :model-value="modelValue.metaTitle"
              @update:model-value="val => updateField('metaTitle', val)"
              placeholder="SEO title for search engines"
            />
            <p :class="['text-xs mt-1', 'theme-colors-text-tertiary']">
              {{ metaTitleLength }} characters (recommended: under 60)
            </p>
          </div>

          <div>
            <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']"> Meta Description </label>
            <textarea
              :value="modelValue.metaDescription"
              @input="e => updateField('metaDescription', (e.target as HTMLTextAreaElement).value)"
              rows="3"
              :class="[
                'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm',
                'theme-border'.secondary,
                'theme-colors-text-primary',
                 'theme-colors-background-secondary'
              ]"
              placeholder="Description for search engines"
            ></textarea>
            <p :class="['text-xs mt-1', 'theme-colors-text-tertiary']">
              {{ metaDescriptionLength }} characters (recommended: under 160)
            </p>
          </div>

          <div>
            <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']"> Keywords </label>
            <dxInput
              :model-value="modelValue.metaKeywords"
              @update:model-value="val => updateField('metaKeywords', val)"
              placeholder="keyword1, keyword2, keyword3"
            />
          </div>
        </div>
      </div>

      <!-- Open Graph -->
      <div>
        <h3 :class="['text-sm font-semibold mb-3', 'theme-colors-text-primary']">Open Graph</h3>
        <div class="space-y-4">
          <div>
            <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']"> OG Title </label>
            <dxInput
              :model-value="modelValue.ogTitle"
              @update:model-value="val => updateField('ogTitle', val)"
              placeholder="Title for social media sharing"
            />
          </div>

          <div>
            <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']"> OG Description </label>
            <textarea
              :value="modelValue.ogDescription"
              @input="e => updateField('ogDescription', (e.target as HTMLTextAreaElement).value)"
              rows="2"
              :class="[
                'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm',
                'theme-border'.secondary,
                'theme-colors-text-primary',
                 'theme-colors-background-secondary'
              ]"
              placeholder="Description for social media"
            ></textarea>
          </div>

          <div>
            <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']"> OG Image </label>
            <dxSelect
              :model-value="modelValue.ogImageId"
              @update:model-value="val => updateField('ogImageId', val)"
              :options="mediaOptions"
              placeholder="Select image for social sharing"
            />
          </div>
        </div>
      </div>

      <!-- Indexing -->
      <div>
        <h3 :class="['text-sm font-semibold mb-3', 'theme-colors-text-primary']">Indexing</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span :class="['text-sm', 'theme-colors-text-primary']">Index page</span>
            <dxSwitch
              :model-value="!modelValue.robotsMeta?.includes('noindex')"
              @update:model-value="val => updateRobotsMeta(val)"
            />
          </div>

          <div class="flex items-center justify-between">
            <span :class="['text-sm', 'theme-colors-text-primary']">Follow links</span>
            <dxSwitch
              :model-value="!modelValue.robotsMeta?.includes('nofollow')"
              @update:model-value="val => updateRobotsMeta(true, val)"
            />
          </div>

          <div>
            <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']"> Canonical URL </label>
            <dxInput
              :model-value="modelValue.canonicalUrl"
              @update:model-value="val => updateField('canonicalUrl', val)"
              placeholder="https://site.com/page-url"
            />
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>