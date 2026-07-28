<script setup lang="ts">
import { Settings, X } from '@lucide/vue'
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'
import UiIconButton from '../../ui/UiIconButton.vue'
import { useSettingsStore } from './settings.store'

const settings = useSettingsStore()
</script>

<template>
  <DialogRoot>
    <DialogTrigger as-child>
      <UiIconButton label="设置">
        <Settings class="size-4" />
      </UiIconButton>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-black/40" />
      <DialogContent class="fixed left-1/2 top-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-panel p-5 shadow-2xl">
        <div class="mb-5 flex items-center justify-between">
          <DialogTitle class="font-semibold">设置</DialogTitle>
          <DialogClose as-child>
            <UiIconButton label="关闭设置">
              <X class="size-4" />
            </UiIconButton>
          </DialogClose>
        </div>
        <div class="grid gap-4 text-sm">
          <label class="grid gap-1.5">
            <span>主题</span>
            <select
              v-model="settings.theme"
              class="rounded-md border border-line bg-panel px-3 py-2"
            >
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </label>
          <label class="grid gap-1.5">
            <span>编辑器字号：{{ settings.editorFontSize }} px</span>
            <input
              v-model.number="settings.editorFontSize"
              type="range"
              min="12"
              max="22"
            />
          </label>
          <label class="flex items-center justify-between gap-3">
            <span>自动换行</span>
            <input
              v-model="settings.wordWrap"
              type="checkbox"
              class="size-4 accent-accent"
            />
          </label>
          <label class="flex items-center justify-between gap-3">
            <span>自动保存</span>
            <input
              v-model="settings.autoSave"
              type="checkbox"
              class="size-4 accent-accent"
            />
          </label>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
