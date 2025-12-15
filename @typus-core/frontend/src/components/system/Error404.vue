<route lang="json">
  {
    "name": "404",
    "meta": {
      "layout": "public",
      "title": "404",
      "subject": "system"
    }
  }
  </route>
<template>
  <SystemPage
    code="404"
    title="Page not found"
    message="Sorry, we couldn't find the page you're looking for. It might have been moved or deleted."
    :showBackButton="true"
    variant="primary"
    :fluid="true"
  />
</template>
