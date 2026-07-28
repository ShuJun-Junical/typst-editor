<script setup lang="ts">
import { X } from '@lucide/vue'
import { useWorkspaceStore } from '../workspace/workspace.store'

const workspace = useWorkspaceStore()
</script>

<template>
  <div class="flex h-9 overflow-x-auto border-b border-line bg-stone-100 dark:bg-stone-900">
    <button
      v-for="path in workspace.openPaths"
      :key="path"
      type="button"
      class="group flex shrink-0 items-center gap-2 border-r border-line px-3 text-xs"
      :class="
        workspace.activePath === path
          ? 'bg-panel text-ink'
          : 'text-muted hover:bg-stone-200 dark:hover:bg-stone-800'
      "
      @click="workspace.openFile(path)"
    >
      <span>{{ path.split('/').at(-1) }}</span>
      <span
        v-if="workspace.documents[path]?.dirty"
        class="size-1.5 rounded-full bg-accent"
        aria-label="未保存"
      />
      <X
        v-else
        class="size-3 opacity-0 group-hover:opacity-100"
        @click.stop="workspace.closeFile(path)"
      />
    </button>
  </div>
</template>
