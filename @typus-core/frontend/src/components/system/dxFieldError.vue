<script setup lang="ts">
/**
 * @Tags component, dsx, diagnostics
 *
 * The visible answer to "the field just is not there".
 *
 * WHY THIS COMPONENT EXISTS. A generated form drops any field it cannot render: no component
 * declared, a component name that is not registered, no visibility list. Every one of those used to
 * be a line in a debug log and an input that silently did not appear, so the screen looked finished
 * and was not, and the person reading it had no way to tell a missing field from a field that was
 * never meant to be there. A form that shows what it could not build is repairable; one that hides
 * it is not.
 */
defineProps<{
  field: string;
  reason: string;
}>();
</script>

<template>
  <div class="dsx-field-error">
    <strong>{{ field }}</strong>
    <span>{{ reason }}</span>
  </div>
</template>

<style scoped>
.dsx-field-error {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  margin-bottom: 8px;
  border: 1px solid #d94a4a;
  border-left-width: 4px;
  border-radius: 4px;
  background: rgba(217, 74, 74, 0.06);
  font-size: 13px;
  line-height: 1.35;
}

.dsx-field-error strong {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #d94a4a;
}

.dsx-field-error span {
  opacity: 0.85;
}
</style>
