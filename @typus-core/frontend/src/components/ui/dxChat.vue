<!-- dxChat.vue -->
<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, nextTick } from 'vue'
import { useStore } from '@/shared/composables/useStore'

/** Attachment model kept locally for previews and status */
interface Attachment {
  tempId: string
  id?: string
  url?: string
  previewUrl?: string
  mimeType?: string
  type?: 'image' | 'file' | 'link'
  status: 'uploading' | 'ready' | 'failed'
  name?: string
}

type FileSource = 'paste' | 'attach'

/** Chat sidebar settings */
interface ChatSettings {
  sidebarOpen: boolean
  sidebarWidth: number
}



/** Emits */
const emit = defineEmits<{
  (e: 'submit', payload: { text: string; attachments: Attachment[] }): void
  /** Fired when user clicks the paperclip and selects files; now includes the selected files */
  (e: 'attach', payload?: { files: File[] }): void
  /** Fired once per pasted image file */
  (e: 'paste-file', file: File): void
  /** Fired when a URL is pasted */
  (e: 'paste-link', link: string): void
  /** Fired when user removes an attachment chip/preview */
  (e: 'remove-attachment', tempId: string): void
  /** Fired when sidebar is closed */
  (e: 'sidebar-close'): void
}>()

/** Props */
const props = withDefaults(defineProps<{
  /** If true, clear local attachments immediately after submit (optimistic UI) */
  resetOnSubmit?: boolean
  /** Height mode: 'viewport' (default, h-[calc(100vh-56px)]), 'full' (h-full, for containers), 'auto' (h-auto) */
  heightMode?: 'viewport' | 'full' | 'auto'
  /** Auto-scroll direction after submit: 'top' (for galleries - new content on top), 'bottom' (for chats - new messages at bottom), 'none' (no auto-scroll) */
  autoScroll?: 'top' | 'bottom' | 'none'
  /** Composer width mode: 'viewport' (calc from 100vw), 'container' (calc from 100% of parent) */
  composerWidthMode?: 'viewport' | 'container'
  /** Submit on Enter key (true) or Ctrl+Enter (false). Default false for multiline input. */
  submitOnEnter?: boolean
  /** Disable sidebar completely (for embedded/compact use cases) */
  disableSidebar?: boolean
}>(), {
  resetOnSubmit: false,
  heightMode: 'viewport',
  autoScroll: 'top', // Default for backward compatibility with image-lab
  composerWidthMode: 'viewport', // Default for backward compatibility
  submitOnEnter: false,
  disableSidebar: false
})

// Store initialization
const store = useStore()
const CHAT_SETTINGS_KEY = 'chat.settings'

// Initialize default settings
if (!store.get(CHAT_SETTINGS_KEY)) {
  store.set(CHAT_SETTINGS_KEY, {
    sidebarOpen: true,
    sidebarWidth: 400
  } as ChatSettings)
}

/** State */
const inputValue = ref('')
const isGenerating = ref(false) // local busy flag (optional: drive from parent if needed)
const attachments = ref<Attachment[]>([])
const fileInputRef = ref<HTMLInputElement>()
const textareaRef = ref<HTMLTextAreaElement>()

/** Sidebar state */
const sidebarRef = ref<HTMLElement | null>(null)
const isResizing = ref(false)
const minSidebarWidth = 200
const maxSidebarWidth = ref(600)

/** Container position for composer centering */
const containerRef = ref<HTMLElement | null>(null)
const contentAreaRef = ref<HTMLElement | null>(null)
const containerLeft = ref(0)
const contentAreaBounds = ref({ left: 0, right: 0, width: 0 })
const containerObserver = ref<ResizeObserver | null>(null)

const updateContainerLeft = () => {
  if (containerRef.value) {
    containerLeft.value = containerRef.value.getBoundingClientRect().left
  }
}

const updateContentAreaBounds = () => {
  if (contentAreaRef.value) {
    const rect = contentAreaRef.value.getBoundingClientRect()
    contentAreaBounds.value = { left: rect.left, right: rect.right, width: rect.width }
  }
}

/** Reactive window width for composer calculations */
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1920)

/** Computed composer positioning for viewport mode - centers in content area */
const composerStyle = computed(() => {
  const bounds = contentAreaBounds.value
  const centerX = bounds.left + bounds.width / 2
  const padding = 32 // 2rem total horizontal padding
  const maxWidth = Math.min(bounds.width - padding, 768) // 48rem = 768px max

  return {
    left: `${centerX}px`,
    transform: 'translateX(-50%)',
    width: `${maxWidth}px`,
    maxWidth: `${maxWidth}px`
  }
})

// Get stored settings
const chatSettings = computed<ChatSettings>(() => store.get(CHAT_SETTINGS_KEY) as ChatSettings)
const showSidebar = computed(() => !props.disableSidebar && chatSettings.value.sidebarOpen)
const currentSidebarWidth = computed({
  get: () => chatSettings.value.sidebarWidth,
  set: (width: number) => {
    const newSettings = { ...chatSettings.value, sidebarWidth: width }
    store.set(CHAT_SETTINGS_KEY, newSettings)
  }
})

/** Settings popover */
const showSettings = ref(false)
const settingsWrapRef = ref<HTMLElement | null>(null)

/** Settings panel toggle */
const toggleSettings = () => {
  showSettings.value = !showSettings.value
}

/** Layout / UX */
const maxRows = 5
const canSubmit = computed(() => !!inputValue.value.trim() || attachments.value.length > 0)

/** Scroll control */
const scrollRef = ref<HTMLElement | null>(null)
const scrollToTop = () => {
  if (scrollRef.value) scrollRef.value.scrollTo({ top: 0, behavior: 'smooth' })
}
const scrollToBottom = () => {
  if (scrollRef.value) scrollRef.value.scrollTo({ top: scrollRef.value.scrollHeight, behavior: 'smooth' })
}

/** Lifecycle */
onMounted(() => {
  document.addEventListener('click', onDocClick, true)   // capture phase, so it runs before inside handlers
  document.addEventListener('keydown', onEsc, true)
  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeEnd)

  // Set max width to 50% of viewport
  maxSidebarWidth.value = Math.floor(window.innerWidth * 0.5)

  // Calculate container left offset for composer positioning
  updateContainerLeft()

  // Watch for content area size changes (main scrollable area)
  if (contentAreaRef.value) {
    containerObserver.value = new ResizeObserver(() => {
      updateContentAreaBounds()
    })
    containerObserver.value.observe(contentAreaRef.value)
  }

  // Initial bounds calculation
  updateContentAreaBounds()

  // Update max width, container left, and window width on window resize
  window.addEventListener('resize', () => {
    windowWidth.value = window.innerWidth
    maxSidebarWidth.value = Math.floor(window.innerWidth * 0.5)
    if (currentSidebarWidth.value > maxSidebarWidth.value) {
      currentSidebarWidth.value = maxSidebarWidth.value
    }
    updateContainerLeft()
    updateContentAreaBounds()
  })
})

onBeforeUnmount(() => {
  // Revoke all object URLs
  attachments.value.forEach(a => a.previewUrl && URL.revokeObjectURL(a.previewUrl))
  document.removeEventListener('click', onDocClick, true)
  document.removeEventListener('keydown', onEsc, true)
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)

  // Disconnect container observer
  if (containerObserver.value) {
    containerObserver.value.disconnect()
    containerObserver.value = null
  }
})

/** Popover close handlers */
const onDocClick = (e: MouseEvent) => {
  if (!showSettings.value) return
  const root = settingsWrapRef.value
  if (root && !root.contains(e.target as Node)) {
    showSettings.value = false
  }
}
const onEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && showSettings.value) showSettings.value = false
}

/** Textarea autoresize */
const autoResize = () => {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  const lineHeight = parseInt(window.getComputedStyle(el).lineHeight || '20', 10)
  const maxHeight = lineHeight * maxRows
  el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px'
}

/** Public API */
const clearAttachments = () => {
  attachments.value.forEach(a => a.previewUrl && URL.revokeObjectURL(a.previewUrl))
  attachments.value = []
  if (fileInputRef.value) fileInputRef.value.value = ''
}

/** Open sidebar */
const openSidebar = (widthPercent?: number) => {
  // Set width if provided (as percentage of FULL container width, not current content area)
  if (widthPercent) {
    // Full width = from container left edge to window right edge
    const fullWidth = windowWidth.value - containerLeft.value
    const targetWidth = Math.floor(fullWidth * widthPercent / 100)
    currentSidebarWidth.value = Math.max(minSidebarWidth, Math.min(maxSidebarWidth.value, targetWidth))
  }

  if (!chatSettings.value.sidebarOpen) {
    const newSettings = { ...chatSettings.value, sidebarOpen: true }
    store.set(CHAT_SETTINGS_KEY, newSettings)
  }

  // Update content area bounds after sidebar opens
  nextTick(() => updateContentAreaBounds())
}

/** Close sidebar */
const closeSidebar = () => {
  const newSettings = { ...chatSettings.value, sidebarOpen: false }
  store.set(CHAT_SETTINGS_KEY, newSettings)
  emit('sidebar-close')
}

/** Resize handlers */
const handleResizeStart = (e: MouseEvent) => {
  isResizing.value = true
  e.preventDefault()
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleResizeMove = (e: MouseEvent) => {
  if (!isResizing.value) return
  e.preventDefault()

  const newWidth = window.innerWidth - e.clientX
  const maxWidth = Math.floor(window.innerWidth * 0.5)
  currentSidebarWidth.value = Math.max(minSidebarWidth, Math.min(maxWidth, newWidth))

  // Update composer position during resize
  updateContentAreaBounds()
}

const handleResizeEnd = () => {
  if (isResizing.value) {
    isResizing.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
}

/** Submit */
const handleSubmit = () => {
  if (!canSubmit.value || isGenerating.value) return
  emit('submit', {
    text: inputValue.value.trim(),
    attachments: [...attachments.value],
  })
  inputValue.value = ''
  nextTick(autoResize)

  if (props.resetOnSubmit) {
    clearAttachments() // optimistic cleanup
  }

  // Auto-scroll based on prop setting
  if (props.autoScroll === 'top') {
    nextTick(() => scrollToTop())
  } else if (props.autoScroll === 'bottom') {
    nextTick(() => scrollToBottom())
  }
  // 'none' - no auto-scroll
}

/** Handle Enter key based on submitOnEnter prop */
const handleKeyDown = (event: KeyboardEvent) => {
  if (props.submitOnEnter) {
    // Enter submits, Shift+Enter adds newline
    if (event.shiftKey) {
      // Allow default behavior (newline)
      return
    }
    event.preventDefault()
    handleSubmit()
  } else {
    // Ctrl/Cmd+Enter submits, plain Enter adds newline
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      handleSubmit()
    } else {
      event.preventDefault()
      inputValue.value += '\n'
      nextTick(autoResize)
    }
  }
}

/** Helpers */
const pushAttachment = (file: File, source: FileSource) => {
  const tempId = crypto.randomUUID()
  const previewUrl = URL.createObjectURL(file)
  const att: Attachment = {
    tempId,
    mimeType: file.type,
    previewUrl,
    status: 'uploading',
    type: file.type?.startsWith('image/') ? 'image' : 'file',
    name: file.name,
  }
  attachments.value.push(att)

  // Emit only for pasted images (keeps semantics clean)
  if (source === 'paste') {
    emit('paste-file', file)
  }
}

/** Paste handler (images and links) */
const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items
  if (!items) return

  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    // Image from clipboard
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) pushAttachment(file, 'paste')
      continue
    }

    // Plain-text URL
    if (item.type === 'text/plain') {
      const text = event.clipboardData?.getData('text')
      if (text && /^https?:\/\//.test(text)) {
        const tempId = crypto.randomUUID()
        attachments.value.push({
          tempId,
          url: text,
          type: 'link',
          status: 'ready',
          name: text,
        })
        emit('paste-link', text)
      }
    }
  }
}

const addAttachment = (data: {
  id?: string
  url?: string
  type?: 'image' | 'file' | 'link'
  name?: string
  mimeType?: string
}) => {
  const tempId = crypto.randomUUID()
  const attachment: Attachment = {
    tempId,
    id: data.id,
    url: data.url,
    type: data.type || 'image',
    status: 'ready',
    name: data.name || 'Generated Image',
    mimeType: data.mimeType || 'image/png'
  }
  attachments.value.push(attachment)
}

/** Paperclip button */
const handleAttach = () => {
  emit('attach') // click intent (no payload)
  fileInputRef.value?.click()
}

/** File chooser → add all, then emit the batch for parent convenience */
const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  const list = Array.from(files)
  list.forEach((f) => pushAttachment(f, 'attach'))

  // Let the parent process the chosen files as a batch (upload, etc.)
  emit('attach', { files: list })

  // Reset the input so the same file can be selected again later
  input.value = ''
}

/** Remove one attachment */
const removeAttachment = (tempId: string) => {
  const att = attachments.value.find(a => a.tempId === tempId)
  if (att?.previewUrl) URL.revokeObjectURL(att.previewUrl)
  attachments.value = attachments.value.filter(a => a.tempId !== tempId)
  emit('remove-attachment', tempId)
}

/** Update (e.g., after upload finishes, set id/url/status) */
const updateAttachment = (tempId: string, newData: Partial<Attachment>) => {
  const idx = attachments.value.findIndex(a => a.tempId === tempId)
  if (idx !== -1) {
    const prev = attachments.value[idx]
    // If we now have a server URL/id, revoke the temporary object URL
    if (prev.previewUrl && (newData.id || newData.url)) {
      URL.revokeObjectURL(prev.previewUrl)
      prev.previewUrl = undefined
    }
    attachments.value[idx] = { ...prev, ...newData }
  }
}

/** Expose API to parent */
defineExpose({
  updateAttachment,
  scrollToTop,
  scrollToBottom,
  clearAttachments,
  addAttachment,
  setGenerating: (v: boolean) => { isGenerating.value = v },
  sidebarRef,
  openSidebar
})
</script>


<template>
  <div
    ref="containerRef"
    class="relative flex"
    :class="{
      'h-[calc(100vh-56px)]': heightMode === 'viewport',
      'h-full': heightMode === 'full',
      'h-auto': heightMode === 'auto'
    }"
  >
    <!-- Main chat area -->
    <div ref="contentAreaRef" class="flex-1 flex flex-col" :style="{ marginRight: showSidebar ? `${currentSidebarWidth}px` : '0' }">
      <!-- Scrollable content -->
      <div ref="scrollRef" class="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-28 custom-scrollbar chat-scrollable">
        <slot name="content"></slot>
      </div>
      
      <!-- Fixed composer -->
      <div class="pointer-events-none fixed bottom-4"
           :style="composerWidthMode === 'viewport' ? composerStyle : {
             left: '50%',
             transform: `translateX(calc(-50% - ${showSidebar ? currentSidebarWidth / 2 : 0}px))`,
             width: showSidebar ? `calc(100% - ${currentSidebarWidth}px - 2rem)` : 'calc(100% - 2rem)',
             maxWidth: '100%'
           }">
        <!-- overflow-visible so popover is not clipped -->
        <div class="pointer-events-auto backdrop-blur shadow-lg rounded-3xl overflow-visible"
             :class="[
               'theme-colors-background-secondary' || 'bg-white/90',
               'theme-colors-border-primary' || 'border border-slate-200'
             ]">
          
          <!-- Attachments preview -->
          <div v-if="attachments.length" class="px-3 pt-3">
            <div class="flex gap-3 overflow-x-auto p-2 scrollbar-thin">
              <div
                v-for="att in attachments"
                :key="att.tempId"
                class="relative shrink-0"
              >
                <div class="w-24 h-24 rounded-lg border overflow-hidden grid place-items-center"
                     :class="[
                       'theme-colors-background-tertiary' || 'bg-slate-50',
                       'theme-colors-border-primary' || 'border-slate-200'
                     ]">
                  <img
                    v-if="att.type === 'image' && att.previewUrl"
                    :src="att.previewUrl"
                    :alt="att.name"
                    class="object-cover w-full h-full"
                  />
                  <DxSecureAsset
                    v-else-if="att.id"
                    :file-id="att.id"
                    :file-name="att.name || ''"
                    :mime-type="att.mimeType"
                    mode="thumbnail"
                    class="w-full h-full rounded-md object-cover"
                  />
                  <div v-else-if="att.type === 'link'" class="px-2 text-xs truncate"
                       :class="'theme-colors-text-accent'">
                    🔗 {{ att.url }}
                  </div>
                  <div v-else-if="att.status === 'uploading'" class="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"
                       :class="'theme-colors-text-warning' || 'theme-colors-text-warning'"></div>
                  <div v-else-if="att.status === 'failed'" class="text-xs font-semibold"
                       :class="'theme-colors-text-error' || 'theme-colors-text-error'">Failed</div>
                  <i v-else class="ri-file-line text-xl"
                     :class="'theme-colors-text-tertiary' || 'text-slate-500'"></i>
                </div>

                <button
                  @click="removeAttachment(att.tempId)"
                  class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-800 text-white grid place-items-center text-xs shadow-md hover:theme-colors-background-error transition-colors"
                  title="Remove attachment"
                  aria-label="Remove attachment"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <!-- Composer row -->
          <div class="flex items-center gap-3 p-3">
            <!-- Settings button with popover anchored above; closes on click outside -->
            <div class="relative" ref="settingsWrapRef">
              <dxButton
                iconOnly
                shape="circle"
                size="lg"
                variant="secondary"
                @click="showSettings = !showSettings"
                aria-label="Toggle settings"
              >
                <dxIcon name="ri-settings-3-line" />
              </dxButton>

              <transition name="fade">
                <div
                  v-if="showSettings"
                  class="absolute bottom-full right-0 mb-2 w-80 rounded-xl shadow-lg p-4 z-20"
                  :class="[
                    'theme-colors-background-secondary' || 'bg-white',
                    'theme-colors-border-primary' || 'border border-slate-200'
                  ]"
                >
                  <slot name="settings"></slot>
                </div>
              </transition>
            </div>

            <textarea
              ref="textareaRef"
              v-model="inputValue"
              @input="autoResize"
              @keydown.enter="handleKeyDown"
              @paste="handlePaste"
              placeholder="Type your message…"
              class="flex-1 rounded-xl px-3 py-2 outline-none resize-none overflow-y-auto"
              :class="[
                'theme-colors-background-tertiary' || 'bg-slate-100',
                'theme-colors-text-secondary' || 'text-slate-900',
                'placeholder:' + ('theme-colors-text-tertiary' || 'text-slate-400')
              ]"
              rows="2"
            />

            <input
              ref="fileInputRef"
              type="file"
              class="hidden"
              multiple
              @change="handleFileChange"
            />

            <dxButton iconOnly shape="circle" size="lg" variant="secondary" @click="handleAttach" aria-label="Attach file">
              <dxIcon name="ri-attachment-2" />
            </dxButton>

            <dxButton
              iconOnly
              shape="circle"
              size="lg"
              variant="primary"
              :disabled="!canSubmit || isGenerating"
              :loading="isGenerating"
              @click="handleSubmit"
              aria-label="Send message"
            >
              <dxIcon name="ri-arrow-up-line" />
            </dxButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Resize divider -->
    <div
      v-if="showSidebar"
      @mousedown="handleResizeStart"
      class="fixed top-14 w-2 h-[calc(100vh-56px)] cursor-col-resize bg-transparent hover:bg-white/10 transition-colors z-20 select-none"
      :style="{ right: `${currentSidebarWidth - 1}px` }"
    ></div>

    <!-- Right sidebar -->
    <div
      v-if="showSidebar"
      ref="sidebarRef"
      class="fixed right-0 top-14 h-[calc(100vh-56px)] shadow-lg flex flex-col chat-sidebar"
      :class="[
        'theme-colors-background-secondary' || 'bg-white',
        'theme-colors-border-primary' || 'border-l border-slate-200'
      ]"
      :style="{ width: `${currentSidebarWidth}px` }"
    >
      <!-- Sidebar header with close button -->
      <div class="flex items-center justify-between p-4"
           :class="'theme-colors-border-primary' || 'border-b border-slate-200'">
        <h3 class="font-semibold"
            :class="'theme-colors-text-primary' || 'text-slate-900'">Panel</h3>
        <button
          @click="closeSidebar"
          class="w-8 h-8 rounded-full grid place-items-center transition-colors"
          :class="[
            'hover:' + ('theme-colors-background-tertiary' || 'bg-slate-100'),
            'theme-colors-text-tertiary' || 'text-slate-500',
            'hover:' + ('theme-colors-text-secondary' || 'text-slate-700')
          ]"
          aria-label="Close sidebar"
        >
          <dxIcon name="ri-close-line" />
        </button>
      </div>
      
      <!-- Sidebar content -->
      <div class="flex-1 overflow-y-auto p-4">
        <slot name="sidebar"></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-sidebar {
  z-index: 40;
}
.scrollbar-thin { scrollbar-width: thin; scrollbar-color: rgb(203 213 225) transparent; }
.scrollbar-thin::-webkit-scrollbar { height: 6px; }
.scrollbar-thin::-webkit-scrollbar-thumb { background-color: rgb(203 213 225); border-radius: 3px; }
.scrollbar-thin::-webkit-scrollbar-thumb:hover { background-color: rgb(148 163 184); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
