<template>
  <div>Processing Google authentication...</div>
</template>

<script setup>
// Import useRoute for accessing route parameters
import { useRoute } from 'vue-router';

// Extract token from URL hash and send to parent
const route = useRoute();
const hash = window.location.hash.substring(1);
const params = new URLSearchParams(hash);
const token = params.get('id_token');

// If token and opener exist, post message
if (token && window.opener) {
  window.opener.postMessage(`id_token:${token}`, window.location.origin);
}

// Close popup after a delay
setTimeout(() => {
  window.close();
}, 1000);
</script>
