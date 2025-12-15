<route lang="json">{
  "name": "index",
  "path": "/",
  "meta": {
    "layout": "public"
  }
}</route>

<script setup lang="ts">
</script>

<template>
  <div class="home-container flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-2xl font-bold mb-4">Welcome</h1>
      <p class="mb-6 theme-colors-text-secondary">Please sign in to continue</p>
      <router-link
        to="/auth/login"
        class="theme-mixins-interactive theme-components-button-base theme-components-button-minWidth theme-components-button-variants-primary theme-components-button-size-md theme-components-button-spacing-md theme-components-button-radius theme-shell-cta"
      >
        Sign In
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  flex: 1;
}
</style>
