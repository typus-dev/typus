<script setup lang="ts">
/**
 * HTML Editor component
 * Simple WYSIWYG editor for HTML content
 */
import { ref, watch, onMounted, nextTick, computed } from 'vue';
import dxButton from './dxButton.vue';
import dxTextArea from './dxTextArea.vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  autoResize: {
    type: Boolean,
    default: true
  },
  label: {
    type: String,
    default: 'Content'
  },
  placeholder: {
    type: String,
    default: 'Enter content here...'
  },
  height: {
    type: [Number, String],
    default: 'auto'
  },
  toolbar: {
    type: Array as () => string[],
    default: () => ['bold', 'italic', 'underline', 'link', 'heading', 'list']
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

// Original clean HTML (stored in DB)
const originalHtml = ref(props.modelValue || '');
// Themed HTML for display
const displayHtml = ref('');
const editorRef = ref<HTMLDivElement | null>(null);
const isEditorInitialized = ref(false);
const isHtmlMode = ref(false);
const rawHtmlContent = ref('');

// Apply theme classes for display only
const applyThemeClasses = (html) => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Apply theme classes to elements
  const elements = {
    'h1': 'theme-typography-content-h1',
    'h2': 'theme-typography-content-h2',
    'h3': 'theme-typography-content-h3',
    'h4': 'theme-typography-content-h4',
    'h5': 'theme-typography-content-h5',
    'h6': 'theme-typography-content-h6',
    'p': 'theme-typography-content-p',
    'ul': 'theme-typography-content-ul',
    'ol': 'theme-typography-content-ol',
    'li': 'theme-typography-content-li',
    'blockquote': 'theme-typography-content-blockquote',
    'code': 'theme-typography-content-code',
    'pre': 'theme-typography-content-pre',
    'a': 'theme-typography-content-a'
  };
  
  Object.entries(elements).forEach(([tag, classes]) => {
    tempDiv.querySelectorAll(tag).forEach(el => {
      const existingClasses = el.getAttribute('class') || '';
      el.setAttribute('class', `${existingClasses} ${classes}`.trim());
    });
  });
  
  return tempDiv.innerHTML;
};

// Remove theme classes to get clean HTML
const removeThemeClasses = (html) => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  const elements = {
    'h1': 'theme-typography-content-h1',
    'h2': 'theme-typography-content-h2',
    'h3': 'theme-typography-content-h3',
    'h4': 'theme-typography-content-h4',
    'h5': 'theme-typography-content-h5',
    'h6': 'theme-typography-content-h6',
    'p': 'theme-typography-content-p',
    'ul': 'theme-typography-content-ul',
    'ol': 'theme-typography-content-ol',
    'li': 'theme-typography-content-li',
    'blockquote': 'theme-typography-content-blockquote',
    'code': 'theme-typography-content-code',
    'pre': 'theme-typography-content-pre',
    'a': 'theme-typography-content-a'
  };
  
  Object.entries(elements).forEach(([tag, classes]) => {
    tempDiv.querySelectorAll(tag).forEach(el => {
      const currentClasses = (el.getAttribute('class') || '').split(' ');
      const themeClasses = classes.split(' ');
      const userClasses = currentClasses.filter(cls => !themeClasses.includes(cls));
      
      if (userClasses.length) {
        el.setAttribute('class', userClasses.join(' '));
      } else {
        el.removeAttribute('class');
      }
    });
  });
  
  return tempDiv.innerHTML;
};

const containerStyle = computed(() => {
  if (!props.height || props.height === 'auto') {
    return {};
  }
  const value = typeof props.height === 'number' ? `${props.height}px` : props.height;
  return { height: value };
});

// Update display HTML with theme classes
const updateDisplayHtml = () => {
  displayHtml.value = applyThemeClasses(originalHtml.value);
  
  if (editorRef.value && !isHtmlMode.value) {
    editorRef.value.innerHTML = displayHtml.value;
  }
};

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  if (newValue !== originalHtml.value) {
    originalHtml.value = newValue || '';
    updateDisplayHtml();
    rawHtmlContent.value = isHtmlMode.value ? originalHtml.value : displayHtml.value;
  }
}, { immediate: true });

// Handle visual editor content changes
const handleContentChange = () => {
  if (!isHtmlMode.value && editorRef.value) {
    // Extract clean HTML without theme classes
    originalHtml.value = removeThemeClasses(editorRef.value.innerHTML);
    // Emit clean HTML
    emit('update:modelValue', originalHtml.value);
    // Update raw content for HTML mode
    rawHtmlContent.value = editorRef.value.innerHTML;
  }
};

// Handle raw HTML changes
const handleRawHtmlChange = (newValue) => {
  rawHtmlContent.value = newValue;
  originalHtml.value = newValue;
  emit('update:modelValue', newValue);
  
  if (!isHtmlMode.value && editorRef.value) {
    displayHtml.value = applyThemeClasses(newValue);
    editorRef.value.innerHTML = displayHtml.value;
  }
};

// Toggle HTML mode
const toggleHtmlMode = () => {
  if (isHtmlMode.value) {
    // Switching from HTML to visual mode
    originalHtml.value = rawHtmlContent.value;
    displayHtml.value = applyThemeClasses(originalHtml.value);
    
    if (editorRef.value) {
      editorRef.value.innerHTML = displayHtml.value;
    }
  } else {
    // Switching from visual to HTML mode
    rawHtmlContent.value = originalHtml.value;
  }
  
  isHtmlMode.value = !isHtmlMode.value;
};

// Initialize editor
onMounted(async () => {
  await nextTick();
  if (editorRef.value) {
    updateDisplayHtml();
    editorRef.value.contentEditable = props.disabled ? 'false' : 'true';
    editorRef.value.addEventListener('input', handleContentChange);
    isEditorInitialized.value = true;
  }
});

// Toolbar actions
const execCommand = (command, value) => {
  document.execCommand(command, false, value);
  handleContentChange();
  editorRef.value?.focus();
};

// Clear all class attributes from elements and update original HTML
const clearAllClasses = () => {
  if (editorRef.value) {
    // First clear classes in the visual editor
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      
      // If user has selected content
      if (!selection.isCollapsed) {
        // Get all elements in the selection
        const elements: Element[] = []; // Explicitly type as Element[]
        
        if (container.nodeType === Node.TEXT_NODE && container.parentElement) {
          elements.push(container.parentElement);
        } else if (container.nodeType === Node.ELEMENT_NODE) {
          elements.push(container as Element); // Cast to Element
          Array.from((container as Element).querySelectorAll('*')).forEach(el => elements.push(el)); // Cast container
        }
        
        // Remove class attribute from all elements
        elements.forEach(el => {
          if (el && el.nodeType === Node.ELEMENT_NODE) {
            (el as HTMLElement).removeAttribute('class'); // Cast to HTMLElement
          }
        });
      } else {
        // If no selection, try to get the current element under cursor
        const currentElement = container.nodeType === Node.TEXT_NODE ? 
                              container.parentElement : 
                              container;
        
        if (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
          (currentElement as HTMLElement).removeAttribute('class'); // Cast to HTMLElement
        }
      }
    }
    
    // Now update the original HTML by completely removing all class attributes
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editorRef.value.innerHTML;
    
    // Remove all class attributes from all elements
    tempDiv.querySelectorAll('*').forEach(el => {
      (el as HTMLElement).removeAttribute('class'); // Cast to HTMLElement
    });
    
    // Update original HTML without any classes
    originalHtml.value = tempDiv.innerHTML;
    
    // Emit the clean HTML
    emit('update:modelValue', originalHtml.value);
    
    // Re-apply theme classes for display
    updateDisplayHtml();
  }
};

// Ensure execCommand always receives 2 arguments (command, value)
const formatBold = () => execCommand('bold', null);
const formatItalic = () => execCommand('italic', null);
const formatUnderline = () => execCommand('underline', null);
const formatLink = () => {
  const url = prompt('Enter URL:', 'https://');
  if (url) {
    execCommand('createLink', url);
  }
};
const formatHeading = () => execCommand('formatBlock', '<h2>');
const formatList = () => execCommand('insertUnorderedList', null);

// Map toolbar buttons to actions
const toolbarActions = {
  bold: formatBold,
  italic: formatItalic,
  underline: formatUnderline,
  link: formatLink,
  heading: formatHeading,
  list: formatList
};

// Toolbar button labels
const toolbarLabels = {
  bold: 'B',
  italic: 'I',
  underline: 'U',
  link: '🔗',
  heading: 'H',
  list: '•'
};
</script>

<!-- Updated dxHtmlEditor template with proper scrolling -->
<template>
  <div :class="[
    'theme-components-card-base', 
    'theme-components-card-variants-outlined',
    'h-full flex flex-col overflow-hidden'
  ]" :style="containerStyle">
    <div v-if="label" class="px-4 py-2 border-b border-dashed border-white/5">
      <span class="theme-typography-size-xs theme-colors-text-secondary uppercase tracking-wide">{{ label }}</span>
    </div>
    <!-- Toolbar -->
    <div 
      :class="[
        'theme-layout-flex-row',
        'theme-layout-spacing-padding',
        'theme-colors-background-tertiary',
        'theme-colors-border-primary',
        'border-b flex-shrink-0'
      ]"
      v-if="!disabled"
    >
      <dxButton
        v-for="tool in toolbar" 
        :key="tool"
        :variant="'ghost'"
        :size="'sm'"
        :iconOnly="true"
        :disabled="disabled || isHtmlMode"
        @click="toolbarActions[tool as string]"
      >
        {{ toolbarLabels[tool as string] }}
      </dxButton>
      
      <dxButton
        variant="ghost"
        size="sm"
        iconOnly
        :disabled="disabled || isHtmlMode"
        @click="clearAllClasses"
        :title="'Clear all classes'"
      >
        🧹
      </dxButton>
      
      <dxButton
        :variant="isHtmlMode ? 'primary' : 'secondary'"
        :size="'sm'"
        :customClass="'ml-auto'"
        @click="toggleHtmlMode"
      >
        {{ isHtmlMode ? 'Visual' : 'HTML' }}
      </dxButton>
    </div>
    
    <!-- Visual Editor -->
    <div 
      v-show="!isHtmlMode"
      ref="editorRef"
      :class="[
        'theme-layout-spacing-padding',
        'theme-colors-background-primary',
        'theme-colors-text-primary',
        'theme-typography-size-base',
        'theme-typography-lineHeight',
        'theme-typography-fontFamily-base',
        disabled ? 'theme-colors-background-disabled' : '',
        'flex-1 overflow-y-auto',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-indigo-500'
      ]"
      :contenteditable="!disabled"
      :placeholder="placeholder"
    ></div>

    <!-- HTML Mode Textarea -->
    <div v-show="isHtmlMode" class="flex-1 overflow-hidden">
      <dxTextArea 
        v-model="rawHtmlContent" 
        :placeholder="placeholder" 
        :disabled="disabled" 
        :rows="50"
        :autoResize="autoResize"
        customClass="theme-typography-fontFamily-mono h-full" 
        @update:modelValue="handleRawHtmlChange" 
      />
    </div>
  </div>
</template>
