<script setup lang="ts">
import { Download, Eye, Files, LogOut, Pencil } from '@lucide/vue'
import { computed, ref } from 'vue'
import type { WorkspaceEntry } from '../../core/workspace/provider'
import UiIconButton from '../../ui/UiIconButton.vue'
import PreviewPane from '../preview/PreviewPane.vue'
import { useCompileStore } from '../preview/compile.store'
import ExplorerPanel from './ExplorerPanel.vue'
import { useWorkspaceStore } from './workspace.store'

type Tab = 'content' | 'preview' | 'files'

const workspace = useWorkspaceStore()
const compile = useCompileStore()
const tab = ref<Tab>('preview')

const textFiles = computed(() => {
  const result: WorkspaceEntry[] = []
  const visit = (entries: WorkspaceEntry[]) => {
    for (const entry of entries) {
      if (entry.kind === 'directory') visit(entry.children ?? [])
      else if (/\.(?:typ|txt|md|json|ya?ml|toml|csv|bib|svg|xml)$/i.test(entry.path)) {
        result.push(entry)
      }
    }
  }
  visit(workspace.tree)
  return result
})

function switchFile(event: Event) {
  void workspace.openFile((event.target as HTMLSelectElement).value)
}
</script>

<template>
  <main class="flex h-full flex-col bg-panel">
    <header class="flex h-12 shrink-0 items-center justify-between border-b border-line px-2">
      <div class="min-w-0 px-2">
        <strong class="block truncate text-sm">{{ workspace.current?.name }}</strong>
        <span class="block truncate text-[10px] text-muted">{{ workspace.activePath }}</span>
      </div>
      <div class="flex items-center">
        <UiIconButton
          :label="compile.exporting ? '正在导出 PDF' : '导出 PDF'"
          :disabled="!compile.artifact || compile.exporting"
          @click="compile.exportPdf(workspace.current?.name ?? 'document')"
        >
          <Download class="size-4" />
        </UiIconButton>
        <UiIconButton
          label="关闭项目"
          @click="workspace.closeWorkspace"
        >
          <LogOut class="size-4" />
        </UiIconButton>
      </div>
    </header>

    <section class="min-h-0 flex-1">
      <div
        v-if="tab === 'content'"
        class="flex h-full flex-col"
      >
        <select
          :value="workspace.activePath"
          aria-label="当前文件"
          class="m-2 rounded-lg border border-line bg-panel px-3 py-2 text-sm"
          @change="switchFile"
        >
          <option
            v-for="file in textFiles"
            :key="file.path"
            :value="file.path"
          >
            {{ file.path }}
          </option>
        </select>
        <textarea
          v-if="workspace.activeDocument"
          :value="workspace.activeDocument.content"
          aria-label="文件内容"
          class="min-h-0 flex-1 resize-none border-0 bg-panel p-4 font-mono text-sm leading-6 outline-none"
          spellcheck="false"
          @input="workspace.updateActiveText(($event.target as HTMLTextAreaElement).value)"
        />
        <div
          v-else
          class="grid h-full place-items-center p-6 text-center text-sm text-muted"
        >
          请选择一个文本文件。完整源码编辑建议使用桌面浏览器。
        </div>
      </div>
      <PreviewPane v-else-if="tab === 'preview'" />
      <ExplorerPanel v-else />
    </section>

    <nav class="grid h-14 shrink-0 grid-cols-3 border-t border-line bg-panel">
      <button
        v-for="item in [
          { id: 'content', label: '内容', icon: Pencil },
          { id: 'preview', label: '预览', icon: Eye },
          { id: 'files', label: '文件', icon: Files },
        ]"
        :key="item.id"
        type="button"
        class="flex flex-col items-center justify-center gap-0.5 text-[11px]"
        :class="tab === item.id ? 'text-accent' : 'text-muted'"
        @click="tab = item.id as Tab"
      >
        <component
          :is="item.icon"
          class="size-5"
        />
        {{ item.label }}
      </button>
    </nav>
  </main>
</template>
