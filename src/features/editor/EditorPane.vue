<script setup lang="ts">
import type { editor } from 'monaco-editor'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useCompileStore } from '../preview/compile.store'
import { useSettingsStore } from '../settings/settings.store'
import { useWorkspaceStore } from '../workspace/workspace.store'
import { monaco } from './monaco'
import { toMarker } from './monaco-diagnostics'

const container = ref<HTMLElement>()
const workspace = useWorkspaceStore()
const compile = useCompileStore()
const settings = useSettingsStore()
const models = new Map<string, editor.ITextModel>()
let instance: editor.IStandaloneCodeEditor
let applying = false

function modelFor(path: string, content: string) {
  let model = models.get(path)
  if (!model) {
    model = monaco.editor.createModel(
      content,
      path.endsWith('.typ') ? 'typst' : undefined,
      monaco.Uri.parse(`file:///${path}`),
    )
    models.set(path, model)
  }
  return model
}

function syncModel() {
  if (!instance) return
  const document = workspace.activeDocument
  if (!document) {
    instance.setModel(null)
    return
  }
  const model = modelFor(document.path, document.content)
  if (model.getValue() !== document.content) {
    applying = true
    model.setValue(document.content)
    applying = false
  }
  instance.setModel(model)
}

onMounted(() => {
  instance = monaco.editor.create(container.value!, {
    automaticLayout: true,
    fontSize: settings.editorFontSize,
    minimap: { enabled: false },
    padding: { top: 12 },
    scrollBeyondLastLine: false,
    theme: document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs',
    wordWrap: settings.wordWrap ? 'on' : 'off',
  })
  instance.onDidChangeModelContent(() => {
    if (!applying && instance.getModel()) workspace.updateActiveText(instance.getValue())
  })
  syncModel()
})

watch(() => [workspace.activePath, workspace.activeDocument?.content], syncModel)
watch(
  () => [settings.editorFontSize, settings.wordWrap],
  () =>
    instance?.updateOptions({
      fontSize: settings.editorFontSize,
      wordWrap: settings.wordWrap ? 'on' : 'off',
    }),
)
watch(
  () => settings.theme,
  () =>
    monaco.editor.setTheme(document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs'),
)
watch(
  () => compile.diagnostics,
  (diagnostics) => {
    for (const [path, model] of models) {
      const markers = diagnostics
        .filter((diagnostic) => diagnostic.path.replace(/^\/+/, '') === path)
        .map(toMarker)
      monaco.editor.setModelMarkers(model, 'typst', markers)
    }
  },
  { deep: true },
)

onBeforeUnmount(() => {
  instance?.dispose()
  for (const model of models.values()) model.dispose()
})
</script>

<template>
  <div class="relative h-full min-h-0 bg-panel">
    <div
      ref="container"
      class="absolute inset-0"
      :class="{ invisible: !workspace.activeDocument }"
    />
    <div
      v-if="!workspace.activeDocument"
      class="grid h-full place-items-center p-6 text-center text-sm text-muted"
    >
      <span v-if="workspace.activeEntry?.kind === 'file'">
        {{ workspace.activeEntry.name }} 是二进制文件，可在文件面板中替换或删除。
      </span>
      <span v-else>选择一个文本文件开始编辑。</span>
    </div>
  </div>
</template>
