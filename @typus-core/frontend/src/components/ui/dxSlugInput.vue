<script setup lang="ts">
/**
 * Slug input component
 * Generates a URL-friendly slug from a source field
 */
import { ref, watch, computed, onMounted } from 'vue';
import dxInput from './dxInput.vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  sourceField: {
    type: String,
    default: ''
  },
  sourceValue: {
    type: String,
    default: ''
  },
  editable: {
    type: Boolean,
    default: true
  },
  label: {
    type: String,
    default: 'URL Slug'
  },
  placeholder: {
    type: String,
    default: 'url-friendly-slug'
  },
  prefix: {
    type: String,
    default: '/'
  }
});

const emit = defineEmits(['update:modelValue']);

// Internal value
const internalValue = ref(props.modelValue || '');
const userEdited = ref(false);

// Generate slug from text
const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Display value with prefix
const displayValue = computed(() => {
  return props.prefix + internalValue.value;
});

// Watch for source value changes
watch(() => props.sourceValue, (newValue) => {
  // Only auto-generate if user hasn't manually edited the slug
  if (!userEdited.value && newValue) {
    const newSlug = generateSlug(newValue);
    internalValue.value = newSlug;
    emit('update:modelValue', newSlug);
  }
}, { immediate: true });

// Watch for direct modelValue changes
watch(() => props.modelValue, (newValue) => {
  if (newValue !== internalValue.value) {
    internalValue.value = newValue || '';
  }
}, { immediate: true });

// Handle input changes
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = target.value.startsWith(props.prefix) 
    ? target.value.substring(props.prefix.length) 
    : target.value;
  
  userEdited.value = true;
  internalValue.value = value;
  emit('update:modelValue', value);
};

// Initialize on mount
onMounted(() => {
  // If we have a sourceValue but no modelValue, generate one
  if (props.sourceValue && !props.modelValue) {
    const newSlug = generateSlug(props.sourceValue);
    internalValue.value = newSlug;
    emit('update:modelValue', newSlug);
  }
});
</script>

<template>
  <div class="dx-slug-input">
    <dxInput
      :model-value="displayValue"
      :label="label"
      :placeholder="placeholder"
      :disabled="!editable"
      @input="handleInput"
    >
      <template #prefix>
        <span class="slug-prefix">{{ prefix }}</span>
      </template>
      <template #suffix v-if="!userEdited && sourceField">
        <span class="slug-auto-hint">Auto-generated from {{ sourceField }}</span>
      </template>
    </dxInput>
  </div>
</template>

<style scoped>
.dx-slug-input {
  position: relative;
}

.slug-prefix {
  color: #666;
  font-weight: 500;
}

.slug-auto-hint {
  font-size: 0.8em;
  color: #888;
  font-style: italic;
}
</style>
