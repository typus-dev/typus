<script setup lang="ts">

// Function to open backstory link
const openBackstory = () => {
  window.open('https://drive.google.com/file/d/1TdRhHtYhB6vbZE7AYEkajWvmIpJwcWmv/view?usp=drive_link', '_blank')
}

const steps = [
 {
   number: "1.",
   content: "npx typus create",
   isCode: true
 },
 {
   number: "2.",
   content: "Implement custom logic where is needed",
   highlight: "custom logic"
 },
 {
   number: "3.",
   content: "docker compose up",
   isCode: true
 }
]

const highlightText = (text: string, highlights: string | string[]) => {
 if (!highlights) return text
 
 const highlightArray = Array.isArray(highlights) ? highlights : [highlights]
 let result = text
 
 highlightArray.forEach(highlight => {
   result = result.replace(
     new RegExp(`(${highlight})`, 'gi'),
     '<strong>$1</strong>'
   )
 })
 
 return result
}
</script>

<template>
 <div 
   @click="openBackstory"
   :class="[
     'theme-components-card-background' + '/80',
     'theme-components-card-border' + '/80',
     'theme-components-card-radius',
     'theme-layout-spacing-padding',
     'backdrop-blur-sm border min-h-[200px]',
     'theme-interactions-transition-property',
     'theme-interactions-transition-duration',
     'theme-interactions-transition-timing',
     'hover:border-2',
     'hover:' + 'theme-colors-border-focus',
     'cursor-pointer group'
   ]"
 >
   <!-- Title -->
   <h2 :class="[
     'theme-typography-content-h2',
     'theme-typography-weight-bold',
     'theme-colors-text-primary',
     'mb-6 ml-6'
   ]">
     No magic - just Typus.
   </h2>

   <dxGrid cols="1" md="2" gap="8">
     <dxCol>
       <div :class="['theme-layout-flex-start', 'theme-layout-stack-horizontal', 'gap-4']">
         <div :class="[
           'theme-colors-text-primary',
           'flex-shrink-0 transition-all duration-500 ease-out group-hover:rotate-12 group-hover:brightness-125'
         ]" style="width: 72px; height: 72px;">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-full h-full drop-shadow-lg">
             <path d="M6 21.5C4.067 21.5 2.5 19.933 2.5 18C2.5 16.067 4.067 14.5 6 14.5C7.5852 14.5 8.92427 15.5539 9.35481 16.9992L15 16.9994V15L17 14.9994V9.24339L14.757 6.99938H9V9.00003H3V3.00003H9V4.99939H14.757L18 1.75739L22.2426 6.00003L19 9.24139V14.9994L21 15V21H15V18.9994L9.35499 19.0003C8.92464 20.4459 7.58543 21.5 6 21.5ZM6 16.5C5.17157 16.5 4.5 17.1716 4.5 18C4.5 18.8285 5.17157 19.5 6 19.5C6.82843 19.5 7.5 18.8285 7.5 18C7.5 17.1716 6.82843 16.5 6 16.5ZM19 17H17V19H19V17ZM18 4.58581L16.5858 6.00003L18 7.41424L19.4142 6.00003L18 4.58581ZM7 5.00003H5V7.00003H7V5.00003Z"></path>
           </svg>
         </div>
         <div class="flex-1 transition-all duration-500 ease-out group-hover:translate-x-4">
           <p :class="[
             'theme-colors-text-secondary',
             'theme-typography-content-p',
             'theme-typography-size-2xl',
             'transition-all duration-500 group-hover:' + 'theme-colors-text-primary',
             'group-hover:font-medium'
           ]">
             Typus streamlines your workflow — from first command to live app. Define your logic once, and the system takes care of the rest.
           </p>
         </div>
       </div>
     </dxCol>

     <!-- Right Column: Steps -->
     <dxCol>
       <div :class="[
         'space-y-3',
         'theme-typography-size-xl',
         'theme-colors-text-primary'
       ]">
         <div 
           v-for="step in steps" 
           :key="step.number"
           class="flex items-center gap-3"
         >
           <span :class="[
             'theme-colors-text-info',
             'font-mono flex-shrink-0'
           ]">
             {{ step.number }}
           </span>
           
           <code 
             v-if="step.isCode"
             class="font-mono bg-black theme-colors-text-success px-4 py-3 rounded-lg border border-gray-700 flex items-center min-h-[48px] flex-1"
           >
             <span class="text-gray-500 mr-2">$</span>{{ step.content }}
           </code>
           
           <span 
             v-else
             :class="['theme-colors-text-primary', 'flex-1']"
             v-html="highlightText(step.content, step.highlight)"
           />
         </div>
       </div>
     </dxCol>
   </dxGrid>
 </div>
</template>
