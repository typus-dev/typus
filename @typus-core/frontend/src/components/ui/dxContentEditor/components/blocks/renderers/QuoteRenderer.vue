<script setup lang="ts">
import { ref } from 'vue'
import ContentEditable from '../ContentEditable.vue'

interface Props { html: string; readonly?: boolean; contentStyle?: any }
const props = withDefaults(defineProps<Props>(), { readonly: false })
const emit = defineEmits<{ 'update:html': [val: string]; focus: []; blur: [] }>()

const ce = ref<any | null>(null)
const onUpdate = (v: string) => emit('update:html', v)
const onFocus = () => emit('focus')
const onBlur = () => emit('blur')

defineExpose({ getEl: () => ce.value?.getEl?.(), focus: () => ce.value?.focus?.() })
</script>

<template>
  <ContentEditable
    ref="ce"
    class="quote"
    :style="props.contentStyle"
    :readonly="props.readonly"
    :html="props.html"
    @update:html="onUpdate"
    @focus="onFocus"
    @blur="onBlur"
  />
</template>

