<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import dsxPageRendererWithContextUnified from '@/dsx/components/dsxPageRendererWithContextUnified.vue';
import dxTextArea from '@/components/ui/dxTextArea.vue';
import dxText from '@/components/ui/dxText.vue';

import { FormMode } from '@dsl-shared/constants';
import { DispatcherTaskModel } from '@dsl-shared/models/dispatcher/dispatcher-task.model';
import { TaskFieldTransforms } from '../methods/task.methods.dsx';
import { logger } from '@/core/logging/logger';
import { DSL } from '@/dsl/client';

interface Props {
  taskId?: string;
  mode: 'create' | 'edit';
}

const props = defineProps<Props>();
const router = useRouter();

const isEditMode = computed(() => props.mode === 'edit');
const dsxRendererRef = ref();

const saveTask = async () => {
  await nextTick();
  
  const currentData = dsxRendererRef.value.pageContext.state.pageData;
  const result = await dsxRendererRef.value.pageContext.methods.saveRecord(currentData);
  
  return result;
};

// Expose methods to parent
defineExpose({
  saveTask
});

const pageConfig = computed(() => ({
  title: isEditMode.value ? 'Edit Task' : 'Create New Dispatcher Task',
  layout: 'private' as const,
  type: 'grid' as const,
  columns: 12,
  gap: 16,
  dataSource: isEditMode.value && props.taskId ? 
    async () => {
      const modelName = typeof DispatcherTaskModel === 'string' ? DispatcherTaskModel : DispatcherTaskModel.name;
      return await DSL[modelName].findById(props.taskId);
    } : 
    undefined,
  contextConfig: {
    model: DispatcherTaskModel,
    mode: isEditMode.value ? FormMode.EDIT : FormMode.CREATE,
    recordId: isEditMode.value ? props.taskId : undefined,
    transformer: TaskFieldTransforms
  },
  blocks: [
    {
      id: 'form-left',
      colSpan: 6,
      components: [],
      fieldFilter: ['name', 'type', 'data', 'parentId', 'maxRuns', 'isActive']
    },
    {
      id: 'form-right',
      colSpan: 6,
      components: [],
      fieldFilter: ['scheduleType', 'periodSec', 'cronExpr', 'timeout', 'retryCount', 'retryDelay']
    },
    {
      id: 'configuration-text',
      colSpan: 12,
      components: [{
        type: dxText,
        props: {
          text: 'Configuration'
        }
      }]
    },
    {
      id: 'task-form-block',
      colSpan: 12,
      fieldFilter: ['data'],
      fieldOverrides: {
        data: {
          component: dxTextArea,
          props: {
            rows: 30,
            label: 'Configuration Data (JSON)'
          }
        }
      }
    }
  ]
}));
</script>

<template>
  <div>
    <dsxPageRendererWithContextUnified ref="dsxRendererRef" :config="pageConfig" />
  </div>
</template>