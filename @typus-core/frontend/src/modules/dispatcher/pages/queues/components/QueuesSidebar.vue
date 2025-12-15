<template>
  <div :class="['theme-layout-stack-vertical' || 'space-y-6']">
    <!-- System Stats -->
    <dx-card
      title="System Overview"
      variant="flat"
      background="secondary"
    >
      <template #default>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="text-center">
            <div :class="['theme-typography-size-2xl', 'theme-typography-weight-bold', 'theme-colors-text-accent']">
              {{ queueStats?.total || 0 }}
            </div>
            <div :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">Total Queues</div>
          </div>
          <div class="text-center">
            <div :class="['theme-typography-size-2xl', 'theme-typography-weight-bold', 'theme-colors-text-success']">
              {{ queueStats?.tasks || 0 }}
            </div>
            <div :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">Total Tasks</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="text-center">
            <div :class="['theme-typography-size-2xl', 'theme-typography-weight-bold', 'theme-colors-text-info']">
              {{ queueStats?.known || 0 }}
            </div>
            <div :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">Known</div>
          </div>
          <div class="text-center">
            <div :class="['theme-typography-size-2xl', 'theme-typography-weight-bold', 'theme-colors-text-warning']">
              {{ queueStats?.discovered || 0 }}
            </div>
            <div :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">Discovered</div>
          </div>
        </div>

        <div v-if="queueOverview" :class="['pt-4', 'theme-colors-border-primary', 'border-t']">
          <div class="flex justify-between items-center mb-2">
            <span :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">Engine Memory</span>
            <span :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-primary']">
              {{ queueOverview.redisMemory }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">Failed Tasks</span>
            <span :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-error']">
              {{ queueOverview.totalFailedTasks }}
            </span>
          </div>
        </div>
      </template>
    </dx-card>

    <!-- Queue Controls -->
    <dx-card
      title="Queue Controls"
      variant="flat"
      background="secondary"
    >
      <template #default>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">Include Discovered</span>
            <dx-switch
              :model-value="includeDiscovered"
              size="md"
              @update:model-value="$emit('toggle-discovered')"
            />
          </div>

          <dx-button
            class="w-full"
            variant="primary"
            @click="$emit('create-task')"
          >
            <template #prefix>
              <i class="ri-add-line text-base"></i>
            </template>
            Create Task
          </dx-button>

          <dx-button
            class="w-full"
            variant="outline"
            @click="$emit('refresh-queues')"
          >
            <template #prefix>
              <i class="ri-refresh-line text-base" :class="{ 'animate-spin': loading }"></i>
            </template>
            Refresh Queues
          </dx-button>

          <div :class="['pt-3', 'border-t', 'theme-colors-border-primary']">
            <dx-button
              class="w-full"
              variant="danger"
              @click="$emit('clear-all-queues')"
            >
              <template #prefix>
                <i class="ri-delete-bin-line text-base"></i>
              </template>
              Clear All Queues
            </dx-button>
          </div>
        </div>
      </template>
    </dx-card>

    <!-- Queues List -->
    <dx-card
      title="Queues"
      variant="flat"
      background="secondary"
      :no-padding="true"
    >
      <template #default>
        <div>
          <!-- Loading State -->
          <div v-if="loading && queues.length === 0" class="p-6 text-center">
            <div class="animate-spin rounded-full h-8 w-8 mx-auto" :class="'theme-colors-border-info'"></div>
            <p :class="['theme-typography-size-sm', 'theme-colors-text-secondary', 'mt-2']">Loading queues...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="p-6 text-center">
            <i class="ri-close-circle-line text-2xl theme-colors-text-error mx-auto block"></i>
            <p :class="['theme-typography-size-sm', 'theme-colors-text-error', 'mt-2']">{{ error }}</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="queues.length === 0" class="p-6 text-center">
            <i class="ri-list-check-2 text-2xl text-gray-400 mx-auto block"></i>
            <p :class="['theme-typography-size-sm', 'theme-colors-text-secondary', 'mt-2']">No queues found</p>
          </div>

          <!-- Queues List -->
        <div v-else :class="['divide-y', 'theme-colors-border-primary']">
          <!-- All Queues Option -->
          <div
            @click="$emit('select-queue', null)"
            :class="[
              'px-6 py-4 cursor-pointer border-l-4',
              selectedQueue === null
                ? ['theme-colors-background-tertiary', 'theme-colors-border-success']
                : ['hover:opacity-80', 'theme-colors-background-secondary', 'border-transparent']
            ]"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div
                  class="w-3 h-3 rounded-full mr-3"
                  :class="'theme-colors-background-tertiary'"
                ></div>
                <div>
                  <p :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-primary']">All Queues</p>
                  <p :class="['theme-typography-size-xs', 'theme-colors-text-secondary']">View all tasks</p>
                </div>
              </div>
              <div :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
                {{ queueStats?.tasks || 0 }}
              </div>
            </div>
          </div>

          <!-- Individual Queues -->
          <div
            v-for="queue in queues"
            :key="queue.key"
            @click="$emit('select-queue', queue)"
            :class="[
              'px-6 py-4 cursor-pointer border-l-4',
              selectedQueue?.key === queue.key
                ? ['theme-colors-background-tertiary', 'theme-colors-border-success']
                : ['hover:opacity-80', 'theme-colors-background-secondary', 'border-transparent']
            ]"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center flex-1 min-w-0">
                <!-- Queue Color Indicator -->
                <div 
                  class="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                  :style="{ backgroundColor: queue.color }"
                ></div>
                
                <div class="flex-1 min-w-0">
                  <div class="flex items-center">
                    <p :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-primary', 'truncate']">{{ queue.name }}</p>
                    
                    <!-- Status Indicators -->
                    <div class="ml-2 flex items-center space-x-1">
                      <dx-badge v-if="queue.paused" variant="warning" size="xs">Paused</dx-badge>
                      <dx-badge v-if="!queue.isKnown" variant="info" size="xs">Discovered</dx-badge>
                    </div>
                  </div>
                  
                  <div class="flex items-center mt-1">
                    <p :class="['theme-typography-size-xs', 'theme-colors-text-secondary', 'truncate']">{{ queue.key }}</p>
                  </div>
                </div>
              </div>

              <!-- Queue Stats -->
              <div class="flex items-center space-x-4 ml-4">
                <div class="text-right">
                  <div :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-primary']">{{ queue.depth }}</div>
                  <div :class="['theme-typography-size-xs', 'theme-colors-text-secondary']">tasks</div>
                </div>
                
                <div v-if="queue.failed > 0" class="text-right">
                  <div :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-error']">{{ queue.failed }}</div>
                  <div :class="['theme-typography-size-xs', 'theme-colors-text-secondary']">failed</div>
                </div>

                <!-- Queue Actions -->
                <div class="flex items-center space-x-1">
                  <!-- Pause/Resume buttons only for Redis driver -->
                  <template v-if="driver === 'redis'">
                    <dx-button
                      v-if="queue.paused"
                      size="sm"
                      variant="outline"
                      iconOnly
                      shape="circle"
                      @click.stop="$emit('resume-queue', queue.key)"
                      title="Resume Queue"
                    >
                      <dxIcon name="ri:play-line" size="sm" />
                    </dx-button>
                    <dx-button
                      v-else
                      size="sm"
                      variant="outline"
                      iconOnly
                      shape="circle"
                      @click.stop="$emit('pause-queue', queue.key)"
                      title="Pause Queue"
                    >
                      <dxIcon name="ri:pause-line" size="sm" />
                    </dx-button>
                  </template>

                  <dx-button
                    size="sm"
                    variant="outline"
                    iconOnly
                    shape="circle"
                    @click.stop="$emit('clear-queue', queue.key)"
                    title="Clear Queue"
                  >
                    <dxIcon name="ri:delete-bin-line" size="sm" />
                  </dx-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </template>
    </dx-card>
  </div>
</template>

<script setup lang="ts">
import DxCard from '@/components/ui/dxCard.vue'
import DxButton from '@/components/ui/dxButton.vue'
import DxSwitch from '@/components/ui/dxSwitch.vue'
import DxBadge from '@/components/ui/dxBadge.vue'
import DxIcon from '@/components/ui/dxIcon.vue'

defineProps({
  queues: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  includeDiscovered: {
    type: Boolean,
    default: false
  },
  queueStats: {
    type: Object,
    default: null
  },
  queueOverview: {
    type: Object,
    default: null
  },
  selectedQueue: {
    type: Object,
    default: null
  },
  driver: {
    type: String,
    default: null
  }
})

defineEmits([
  'toggle-discovered',
  'select-queue',
  'refresh-queues',
  'clear-queue',
  'pause-queue',
  'resume-queue',
  'clear-all-queues',
  'create-task'
])
</script>
