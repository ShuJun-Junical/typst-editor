import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'system' | 'light' | 'dark'

interface Settings {
  theme: Theme
  editorFontSize: number
  wordWrap: boolean
  autoSave: boolean
}

const defaults: Settings = {
  theme: 'system',
  editorFontSize: 14,
  wordWrap: true,
  autoSave: true,
}

function loadSettings(): Settings {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem('typst-editor:settings') ?? '{}') }
  } catch {
    return defaults
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const initial = loadSettings()
  const theme = ref(initial.theme)
  const editorFontSize = ref(initial.editorFontSize)
  const wordWrap = ref(initial.wordWrap)
  const autoSave = ref(initial.autoSave)

  function applyTheme() {
    const dark =
      theme.value === 'dark' ||
      (theme.value === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
  }

  watch(
    [theme, editorFontSize, wordWrap, autoSave],
    () => {
      localStorage.setItem(
        'typst-editor:settings',
        JSON.stringify({
          theme: theme.value,
          editorFontSize: editorFontSize.value,
          wordWrap: wordWrap.value,
          autoSave: autoSave.value,
        }),
      )
      applyTheme()
    },
    { immediate: true },
  )

  return { theme, editorFontSize, wordWrap, autoSave, applyTheme }
})
