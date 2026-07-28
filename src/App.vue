<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import MobileWorkspace from './features/workspace/MobileWorkspace.vue'
import WorkspaceLauncher from './features/workspace/WorkspaceLauncher.vue'
import WorkspaceShell from './features/workspace/WorkspaceShell.vue'
import { useWorkspaceStore } from './features/workspace/workspace.store'

const workspace = useWorkspaceStore()
const isDesktop = ref(true)
let media: MediaQueryList

function updateMode() {
  isDesktop.value = media.matches
}

onMounted(() => {
  media = matchMedia('(min-width: 1024px)')
  updateMode()
  media.addEventListener('change', updateMode)
})

onBeforeUnmount(() => media?.removeEventListener('change', updateMode))
</script>

<template>
  <WorkspaceLauncher
    v-if="!workspace.current"
    :desktop="isDesktop"
  />
  <WorkspaceShell v-else-if="isDesktop" />
  <MobileWorkspace v-else />
</template>
