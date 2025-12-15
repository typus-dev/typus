<route lang="json">
  {
    "name": "403",
    "meta": {
      "layout": "public",
      "title": "403",
      "subject": "system"
    }
  }
  </route>
<template>
  <SystemPage
    code="403"
    title="Access Denied"
    message="You don't have permission to access this page"
    variant="warning"
    :fluid="true"
  />
</template>
