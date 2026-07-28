<script setup lang="ts">
import { Copy, Download, LogOut, Save } from '@lucide/vue'
import { defineAsyncComponent, onBeforeUnmount, onMounted } from 'vue'
import {
  SplitterGroup,
  SplitterPanel,
  SplitterResizeHandle,
} from 'reka-ui'
import UiIconButton from '../../ui/UiIconButton.vue'
import EditorTabs from '../editor/EditorTabs.vue'
import PreviewPane from '../preview/PreviewPane.vue'
import { useCompileStore } from '../preview/compile.store'
import SettingsDialog from '../settings/SettingsDialog.vue'
import ExplorerPanel from './ExplorerPanel.vue'
import StatusBar from './StatusBar.vue'
import { useWorkspaceStore } from './workspace.store'

const EditorPane = defineAsyncComponent(() => import('../editor/EditorPane.vue'))
const workspace = useWorkspaceStore()
const compile = useCompileStore()

function copyProject() {
  if (workspace.current?.kind === 'opfs') {
    void workspace.copyToLocal()
  } else {
    const name = prompt('浏览器项目名称', `${workspace.current?.name ?? 'Project'} Copy`)
    if (name) void workspace.copyToBrowser(name)
  }
}

function onFocus() {
  void workspace.checkExternalChanges()
}

onMounted(() => window.addEventListener('focus', onFocus))
onBeforeUnmount(() => window.removeEventListener('focus', onFocus))
</script>

<template>
  <main class="flex h-full flex-col bg-panel">
    <header class="flex h-11 shrink-0 items-center justify-between border-b border-line px-2">
      <div class="flex min-w-0 items-center gap-2">
        <strong class="truncate px-2 text-sm">{{ workspace.current?.name }}</strong>
        <span class="rounded bg-stone-100 px-2 py-0.5 text-[11px] text-muted dark:bg-stone-800">
          {{ workspace.current?.kind === 'opfs' ? '浏览器项目' : '本地文件夹' }}
        </span>
      </div>
      <div class="flex items-center">
        <UiIconButton
          label="立即保存"
          @click="workspace.saveAll"
        >
          <Save class="size-4" />
        </UiIconButton>
        <UiIconButton
          :label="workspace.current?.kind === 'opfs' ? '复制到本地文件夹' : '复制为浏览器项目'"
          :disabled="workspace.current?.kind === 'opfs' && !workspace.supportsLocalWorkspaces()"
          @click="copyProject"
        >
          <Copy class="size-4" />
        </UiIconButton>
        <UiIconButton
          :label="compile.exporting ? '正在导出 PDF' : '导出 PDF'"
          :disabled="!compile.artifact || compile.exporting"
          @click="compile.exportPdf(workspace.current?.name ?? 'document')"
        >
          <Download class="size-4" />
        </UiIconButton>
        <SettingsDialog />
        <UiIconButton
          label="关闭项目"
          @click="workspace.closeWorkspace"
        >
          <LogOut class="size-4" />
        </UiIconButton>
      </div>
    </header>

    <SplitterGroup
      direction="horizontal"
      class="min-h-0 flex-1"
    >
      <SplitterPanel
        :default-size="18"
        :min-size="14"
        :max-size="26"
      >
        <ExplorerPanel />
      </SplitterPanel>
      <SplitterResizeHandle class="w-1 border-x border-line bg-stone-100 outline-none hover:bg-blue-200 focus-visible:bg-blue-300 dark:bg-stone-900" />
      <SplitterPanel :default-size="41">
        <div class="flex h-full min-h-0 flex-col">
          <EditorTabs />
          <div class="min-h-0 flex-1">
            <EditorPane />
          </div>
        </div>
      </SplitterPanel>
      <SplitterResizeHandle class="w-1 border-x border-line bg-stone-100 outline-none hover:bg-blue-200 focus-visible:bg-blue-300 dark:bg-stone-900" />
      <SplitterPanel :default-size="41">
        <PreviewPane />
      </SplitterPanel>
    </SplitterGroup>
    <StatusBar />
  </main>
</template>
