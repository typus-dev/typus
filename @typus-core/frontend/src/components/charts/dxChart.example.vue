<script setup lang="ts">
import { ref } from 'vue'
import dxChart from '@/components/charts/dxChart.vue'

// Sample data for a line chart
const lineChartData = ref({
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Visitors',
      data: [620, 740, 900, 780, 1050, 1320],
      borderColor: '#6366F1',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      tension: 0.3,
      fill: true
    },
    {
      label: 'Conversions',
      data: [120, 150, 180, 220, 270, 350],
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.3,
      fill: true
    }
  ]
})

// Sample data for a bar chart
const barChartData = ref({
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    {
      label: 'Active Users',
      data: [320, 420, 480, 520, 580, 620, 480],
      backgroundColor: '#6366F1'
    }
  ]
})

// Custom options for line chart
const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
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
      beginAtZero: true
    }
  }
}

// Custom options for bar chart
const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
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
      // Temporarily remove borderDash to resolve type error
      grid: {
        // borderDash: [2, 4]
      }
    }
  }
}
</script>

<template>
  <div class="chart-container">
    <h1 class="text-2xl font-bold mb-6">Chart Examples</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Line Chart Example -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-semibold text-gray-900 dark:text-white">Website Traffic</h3>
          <div class="flex space-x-2">
            <span class="flex items-center text-xs">
              <span class="h-3 w-3 rounded-full theme-colors-background-info mr-1"></span>
              Visitors
            </span>
            <span class="flex items-center text-xs">
              <span class="h-3 w-3 rounded-full bg-emerald-500 mr-1"></span>
              Conversions
            </span>
          </div>
        </div>
        <dxChart type="line" :data="lineChartData" :options="lineChartOptions" height="300px" />
      </div>
      
      <!-- Bar Chart Example -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-semibold text-gray-900 dark:text-white">User Activity</h3>
          <div class="flex space-x-2">
            <button class="theme-colors-background-info text-white rounded-md px-3 py-1 text-xs font-medium">Today</button>
            <button class="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md px-3 py-1 text-xs font-medium">Week</button>
            <button class="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md px-3 py-1 text-xs font-medium">Month</button>
          </div>
        </div>
        <dxChart type="bar" :data="barChartData" :options="barChartOptions" height="250px" />
      </div>
    </div>
  </div>
</template>
