<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { renderArtifact } from '../../core/preview/renderer'
import { useCompileStore } from './compile.store'

const compile = useCompileStore()
const html = ref('')
const zoom = ref(100)
let renderId = 0
const scale = computed(() => `scale(${zoom.value / 100})`)

watch(
  () => compile.artifact,
  async (artifact) => {
    const id = ++renderId
    if (!artifact) {
      html.value = ''
      return
    }
    try {
      const nextHtml = await renderArtifact(artifact)
      if (id === renderId) html.value = nextHtml
    } catch (error) {
      if (id === renderId) html.value = ''
      console.error(error)
    }
  },
  { immediate: true },
)
</script>

<template>
  <section class="flex h-full min-h-0 flex-col bg-canvas">
    <div class="flex h-9 shrink-0 items-center justify-between border-b border-line bg-panel px-3">
      <span class="text-xs font-medium">预览</span>
      <label class="flex items-center gap-2 text-xs text-muted">
        <input
          v-model.number="zoom"
          type="range"
          min="50"
          max="160"
          step="10"
          class="w-20 accent-accent"
        />
        {{ zoom }}%
      </label>
    </div>
    <div class="min-h-0 flex-1 overflow-auto p-4">
      <div
        v-if="html"
        class="typst-preview origin-top transition-transform"
        :style="{ transform: scale }"
        v-html="html"
      />
      <div
        v-else
        class="grid h-full place-items-center text-center text-sm text-muted"
      >
        <span v-if="compile.status === 'loading'">正在加载 Typst 编译器和字体…</span>
        <span v-else-if="compile.status === 'compiling'">正在编译…</span>
        <span v-else-if="compile.error">{{ compile.error }}</span>
        <span v-else>打开项目后将在这里显示预览。</span>
      </div>
    </div>
  </section>
</template>
