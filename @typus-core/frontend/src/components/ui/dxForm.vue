<script setup lang="ts">
import { provide, ref } from 'vue'

interface Props {
  title?: string
  onSubmit?: (valid: boolean) => void
  validateOnSubmit?: boolean
  bordered?: boolean
  actionsAlign?: 'left' | 'center' | 'right',
  customClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  validateOnSubmit: true,
  bordered: false,
  customClass: '',
})

const formRef = ref<HTMLFormElement>()
const formElements = ref<any[]>([])

provide('registerFormElement', (element: any) => {
  formElements.value.push(element)
})

const validateForm = async () => {
  const results = await Promise.all(
    formElements.value.map(element => {
      return element.validate?.()
    })
  )

  return results.every(result => result !== false)
}

const handleSubmit = async (e: Event) => {
  e.preventDefault()

  if (props.validateOnSubmit) {
    const isValid = await validateForm()

    // Wrap isValid in an object for structured logging
    logger.debug('dxForm.isValid', { isValid: isValid })
    props.onSubmit?.(isValid)
  } else {
    props.onSubmit?.(true)
  }
}
</script>

<template>
  <!-- file: shared\components\ui\dxForm.vue -->
  <form
    ref="formRef"
    class="pl-2 pr-2 pt-2 pb-4"
   :class="[bordered && 'theme-base-border', bordered && 'theme-base-radius',customClass]"
    novalidate
    @submit="handleSubmit"
  >
    <header v-if="title || $slots.header" class="pt-2 pb-4">
      <h3 v-if="title">{{ title }}</h3>
      <slot name="header" />
    </header>

    <div>
      <slot />
    </div>

    <footer
      v-if="$slots.actions"
      :class="[
        'pt-3  flex',
        actionsAlign === 'left' && 'justify-start',
        actionsAlign === 'center' && 'justify-center',
        actionsAlign === 'right' && 'justify-end'
      ]"
    >
      <slot name="actions" />
    </footer>
  </form>
</template>
