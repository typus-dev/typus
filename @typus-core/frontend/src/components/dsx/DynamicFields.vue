<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { DSL, initDslClient } from '@/dsl/client';
import { logger } from '@/core/logging/logger';

const props = defineProps({
  model: {
    type: String,
    required: true
  },
  fieldNames: {
    type: Array as () => string[],
    default: () => []
  },
  visibility: {
    type: Array as () => ('table' | 'form' | 'detail')[],
    default: () => ['form']
  }
});

const fields = ref<any[]>([]);
const loading = ref(true);
const error = ref<Error | null>(null);

// Inject transformer from context hierarchy
const blockContext = inject('blockContext', null);
const pageTransformer = inject('transformer', null);

/**
 * Loads field definitions from DSL and applies transformers
 */
const loadFieldsWithTransformers = async () => {
  try {

    
    let loadedFields: any[] = [];
    
    if (props.fieldNames.length > 0) {
      // Load specific fields
      logger.debug(`[DynamicFields] Loading specific fields for ${props.model}`, { fieldNames: props.fieldNames });
      const fieldPromises = props.fieldNames.map(name => DSL[props.model].getField(name));
      loadedFields = (await Promise.all(fieldPromises)).filter(Boolean);
    } else {
      // Load all fields with specified visibility
      logger.debug(`[DynamicFields] Loading fields with visibility for ${props.model}`, { visibility: props.visibility });
      loadedFields = await DSL[props.model].getFields(props.visibility);
    }
    
    // Apply transformers to fields
    fields.value = loadedFields.map(field => ({
      ...field,
      transformer: blockContext?.transformer?.[field.name] || 
                   pageTransformer?.[field.name] ||
                   field.transformer
    }));
    
    logger.debug(`[DynamicFields] Loaded ${fields.value.length} fields for ${props.model} with transformers`);
  } catch (e) {
    error.value = e as Error;
    logger.error(`[DynamicFields] Error loading fields for ${props.model}`, { error: e });
  } finally {
    loading.value = false;
  }
};

onMounted(loadFieldsWithTransformers);
</script>

<template>
  <div>
    <div v-if="loading" class="dynamic-fields-loading">
      Loading fields...
    </div>
    <div v-else-if="error" class="dynamic-fields-error">
      Error loading fields: {{ error.message }}
    </div>
    <template v-else>
      <component 
        v-for="field in fields" 
        :key="field.name"
        :is="field.type"
        v-bind="field"
      />
    </template>
  </div>
</template>

<style scoped>
.dynamic-fields-loading {
  padding: 1rem;
  color: #666;
  font-style: italic;
}

.dynamic-fields-error {
  padding: 1rem;
  color: #e53e3e;
  border: 1px solid #e53e3e;
  border-radius: 0.25rem;
  background-color: #fff5f5;
}
</style>