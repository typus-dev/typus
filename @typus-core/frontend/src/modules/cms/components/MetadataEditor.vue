<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import type { ICmsItem } from '../types'

// Components
import dxSelect from '@/components/ui/dxSelect/dxSelect.vue'
import dxSwitch from '@/components/ui/dxSwitch.vue'

interface Props {
  modelValue: Partial<ICmsItem>
}

interface Emits {
  'update:modelValue': [value: Partial<ICmsItem>]
}


const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Schema types options
const schemaTypes = [
  { value: 'WebPage', label: 'Web Page' },
  { value: 'Article', label: 'Article' },
  { value: 'NewsArticle', label: 'News Article' },
  { value: 'BlogPosting', label: 'Blog Post' },
  { value: 'Product', label: 'Product' },
  { value: 'FAQ', label: 'FAQ' },
  { value: 'Organization', label: 'Organization' }
]

const sitemapChangefreqOptions = [
  { value: 'always', label: 'Always' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'never', label: 'Never' }
]

const sitemapPriorityOptions = [
  { value: 0.1, label: '0.1' },
  { value: 0.5, label: '0.5' },
  { value: 0.8, label: '0.8' },
  { value: 1.0, label: '1.0' }
]

// Generate structured data preview
const generatedStructuredData = computed(() => {
  // Generate full URL for JSON-LD
  const getFullUrl = () => {
    if (props.modelValue.canonicalUrl) {
      return props.modelValue.canonicalUrl
    }
    if (props.modelValue.sitePath) {
      // If sitePath starts with http, use as is, otherwise prepend domain
      if (props.modelValue.sitePath.startsWith('http')) {
        return props.modelValue.sitePath
      }
      return `${import.meta.env.BASE_URL}${props.modelValue.sitePath}`
    }
    return undefined
  }

  const data: any = {
    "@context": "https://schema.org",
    "@type": props.modelValue.schemaType || "WebPage",
    "name": props.modelValue.metaTitle || props.modelValue.title,
    "description": props.modelValue.metaDescription,
    "url": getFullUrl(),
    "datePublished": props.modelValue.publishedAt,
    "dateModified": props.modelValue.updatedAt
  }

  if (props.modelValue.schemaType === 'Article' || props.modelValue.schemaType === 'NewsArticle' || props.modelValue.schemaType === 'BlogPosting') {
    data.headline = props.modelValue.metaTitle || props.modelValue.title
    data.articleSection = "Legal" // Could be dynamic based on categories
  }

  return JSON.stringify(data, null, 2)
})

function updateField(field: keyof ICmsItem, value: any) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}
</script>

<template>
  <main class="flex-1 md:p-6">

    <div :class="['rounded-lg border h-full p-2 md:p-6', 'theme-colors-background-secondary', 'theme-border'.primary]">
      <h2 :class="['text-lg font-semibold mb-4', 'theme-colors-text-primary']">Structured Data</h2>
      
      <!-- Schema Type -->
      <div class="mb-6">
        <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">
          Schema Type
        </label>
        <dxSelect 
          :model-value="modelValue.schemaType"
          @update:model-value="(val) => updateField('schemaType', val)"
          :options="schemaTypes"
        />
      </div>

      <!-- JSON-LD Preview -->
      <div class="mb-6">
        <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">
          JSON-LD Markup
        </label>
        <textarea 
          :value="generatedStructuredData"
          rows="15" 
          :class="[
            'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono',
            'theme-border'.secondary,
            'theme-colors-background-secondary',
            'theme-colors-text-primary'
          ]"
          readonly
        ></textarea>
      </div>

      <!-- Sitemap Settings -->
      <div :class="['pt-6 border-t', 'theme-border'.primary]">
        <h3 :class="['text-lg font-semibold mb-4', 'theme-colors-text-primary']">Sitemap Settings</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">
              Priority
            </label>
            <dxSelect 
              :model-value="modelValue.sitemapPriority"
              @update:model-value="(val) => updateField('sitemapPriority', val)"
              :options="sitemapPriorityOptions"
            />
          </div>

          <div>
            <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">
              Change Frequency
            </label>
            <dxSelect 
              :model-value="modelValue.sitemapChangefreq"
              @update:model-value="(val) => updateField('sitemapChangefreq', val)"
              :options="sitemapChangefreqOptions"
            />
          </div>

          <div class="flex items-end">
            <label class="flex items-center">
              <dxSwitch 
                :model-value="modelValue.includeInSitemap"
                @update:model-value="(val) => updateField('includeInSitemap', val)"
              />
              <span :class="['ml-2 text-sm', 'theme-colors-text-primary']">Include in sitemap</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>