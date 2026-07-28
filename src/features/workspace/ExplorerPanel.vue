<script setup lang="ts">
import {
  ChevronRight,
  File,
  FilePlus,
  Folder,
  FolderPlus,
  Trash2,
  Upload,
} from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { TreeItem, TreeRoot } from 'reka-ui'
import { joinWorkspacePath, parentWorkspacePath } from '../../core/workspace/paths'
import type { WorkspaceEntry } from '../../core/workspace/provider'
import UiIconButton from '../../ui/UiIconButton.vue'
import { useWorkspaceStore } from './workspace.store'

const workspace = useWorkspaceStore()
const selected = ref<WorkspaceEntry>()
const uploadInput = ref<HTMLInputElement>()
const targetDirectory = computed(() => {
  if (selected.value?.kind === 'directory') return selected.value.path
  return selected.value ? parentWorkspacePath(selected.value.path) : ''
})

watch(selected, (entry) => {
  if (entry?.kind === 'file') void workspace.openFile(entry.path)
})

function createFile() {
  const name = prompt('文件名', 'new.typ')?.trim()
  if (name) void workspace.createFile(joinWorkspacePath(targetDirectory.value, name))
}

function createDirectory() {
  const name = prompt('文件夹名称', 'assets')?.trim()
  if (name) void workspace.createDirectory(joinWorkspacePath(targetDirectory.value, name))
}

function deleteSelected() {
  const entry = selected.value
  if (entry && confirm(`确定删除 ${entry.path}？`)) void workspace.deleteEntry(entry.path)
}

function upload(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) void workspace.uploadFiles(input.files, targetDirectory.value)
  input.value = ''
}
</script>

<template>
  <aside class="flex h-full min-h-0 flex-col bg-panel">
    <div class="flex h-9 shrink-0 items-center justify-between border-b border-line px-2">
      <span class="px-1 text-xs font-semibold uppercase tracking-wide text-muted">文件</span>
      <div class="flex items-center">
        <UiIconButton
          label="新建文件"
          @click="createFile"
        >
          <FilePlus class="size-4" />
        </UiIconButton>
        <UiIconButton
          label="新建文件夹"
          @click="createDirectory"
        >
          <FolderPlus class="size-4" />
        </UiIconButton>
        <UiIconButton
          label="上传文件"
          @click="uploadInput?.click()"
        >
          <Upload class="size-4" />
        </UiIconButton>
        <UiIconButton
          label="删除"
          :disabled="!selected"
          @click="deleteSelected"
        >
          <Trash2 class="size-4" />
        </UiIconButton>
        <input
          ref="uploadInput"
          type="file"
          multiple
          class="hidden"
          @change="upload"
        />
      </div>
    </div>

    <TreeRoot
      v-model="selected"
      :items="workspace.tree"
      :get-key="(entry: WorkspaceEntry) => entry.path"
      :get-children="(entry: WorkspaceEntry) => entry.children"
      class="min-h-0 flex-1 overflow-auto py-1 text-sm"
    >
      <template #default="{ flattenItems }">
        <TreeItem
          v-for="item in flattenItems"
          :key="item._id"
          v-bind="item.bind"
          v-slot="{ isExpanded }"
          as="button"
          class="flex w-full items-center gap-1.5 py-1.5 pr-2 text-left outline-none hover:bg-stone-100 focus-visible:bg-blue-50 data-[selected]:bg-blue-50 dark:hover:bg-stone-800 dark:focus-visible:bg-blue-950 dark:data-[selected]:bg-blue-950"
          :style="{ paddingLeft: `${item.level * 12}px` }"
        >
          <ChevronRight
            v-if="item.hasChildren"
            class="size-3.5 shrink-0 transition-transform"
            :class="{ 'rotate-90': isExpanded }"
          />
          <span
            v-else
            class="w-3.5"
          />
          <Folder
            v-if="item.value.kind === 'directory'"
            class="size-4 shrink-0 text-amber-600"
          />
          <File
            v-else
            class="size-4 shrink-0 text-muted"
          />
          <span class="truncate">{{ item.value.name }}</span>
        </TreeItem>
      </template>
    </TreeRoot>
  </aside>
</template>
