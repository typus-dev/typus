<!--
  * dxChart.vue
  * A Vue component for rendering charts using Chart.js.
  * This component supports various chart types and allows customization of data and options.
  *
  * @vue/component
  * <dxChart 
  * type="line" 
  * :data="chartData" 
  * :options="chartOptions" 
  * height="300px" 
/>
-->
<script setup lang="ts">
import { defineComponent, ref, onMounted, PropType, watch } from 'vue'
import { Chart, ChartData, ChartOptions, ChartType } from 'chart.js/auto'

const props = defineProps({
  // Chart type (line, bar, pie, etc.)
  type: {
    type: String as PropType<ChartType>,
    required: true
  },
  // Chart data
  data: {
    type: Object as PropType<ChartData>,
    required: true
  },
  // Chart options
  options: {
    type: Object as PropType<ChartOptions>,
    default: () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            boxWidth: 6
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            borderDash: [2, 4]
          }
        }
      }
    })
  },
  // Chart height
  height: {
    type: String,
   
  }
})

const chartRef = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

// Create or update chart
const renderChart = () => {
  if (!chartRef.value) return

  const ctx = chartRef.value.getContext('2d')
  if (!ctx) return

  if (chartInstance) {
    chartInstance.destroy()
  }

  chartInstance = new Chart(ctx, {
    type: props.type,
    data: props.data,
    options: props.options
  })
}

// Update chart when data changes
watch(
  () => props.data,
  () => {
    // If chart exists, update it, otherwise create it
    if (chartInstance) {
      chartInstance.data = props.data
      chartInstance.update()
    } else {
      renderChart()
    }
  },
  { deep: true }
)

// Create chart on mount
onMounted(() => {
  renderChart()
})

// Destroy chart when component is unmounted
const onBeforeUnmount = () => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
}
</script>

<template>
  <div class="dx-chart h-full" :style="{ height }">
    <canvas ref="chartRef"></canvas>
  </div>
</template>

<style scoped>
.dx-chart {
  width: 100%;
  position: relative;
}
</style>