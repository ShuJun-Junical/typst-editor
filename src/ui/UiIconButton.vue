<script setup lang="ts">
defineProps<{
  label: string
  disabled?: boolean
}>()
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
    class="inline-flex size-8 items-center justify-center rounded-md text-muted transition hover:bg-stone-200 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-stone-700"
  >
    <slot />
  </button>
</template>
