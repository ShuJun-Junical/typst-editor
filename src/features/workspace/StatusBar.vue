<script setup lang="ts">
import { computed } from 'vue'
import { useCompileStore } from '../preview/compile.store'
import { useWorkspaceStore } from './workspace.store'

const workspace = useWorkspaceStore()
const compile = useCompileStore()
const compileText = computed(() => {
  if (compile.exporting) return '正在导出 PDF'
  if (compile.status === 'compiling') return '编译中'
  if (compile.status === 'error') return `${compile.diagnostics.length || 1} 个问题`
  if (compile.status === 'success') return `${Math.round(compile.duration)} ms`
  return '就绪'
})
</script>

<template>
  <footer class="flex h-6 shrink-0 items-center justify-between bg-stone-800 px-2 text-[11px] text-stone-200">
    <div class="flex items-center gap-3">
      <span>{{ workspace.current?.kind === 'opfs' ? '浏览器项目' : '本地文件夹' }}</span>
      <span>{{ workspace.current?.entryPath }}</span>
    </div>
    <div class="flex items-center gap-3">
      <span
        v-if="workspace.error"
        class="text-red-300"
      >{{ workspace.error }}</span>
      <span>{{ workspace.saveStatus === 'saving' ? '保存中' : workspace.saveStatus === 'error' ? '保存失败' : '已保存' }}</span>
      <span>{{ compileText }}</span>
    </div>
  </footer>
</template>
