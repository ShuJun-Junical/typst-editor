<script setup lang="ts">
import { Database, FolderOpen, Plus } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import {
  db,
  type BrowserProjectRecord,
  type RecentLocalRecord,
} from '../../core/storage/db'
import { useWorkspaceStore } from './workspace.store'

const props = defineProps<{ desktop: boolean }>()
const workspace = useWorkspaceStore()
const browserProjects = ref<BrowserProjectRecord[]>([])
const localProjects = ref<RecentLocalRecord[]>([])
const name = ref('')
const busy = ref(false)
const error = ref('')
const canOpenLocal = computed(() => props.desktop && workspace.supportsLocalWorkspaces())

async function loadProjects() {
  ;[browserProjects.value, localProjects.value] = await Promise.all([
    db.projects.orderBy('updatedAt').reverse().toArray(),
    db.localWorkspaces.orderBy('lastOpenedAt').reverse().toArray(),
  ])
}

async function run(action: () => Promise<void>) {
  busy.value = true
  error.value = ''
  try {
    await action()
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') return
    error.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    busy.value = false
  }
}

function createProject() {
  void run(() => workspace.createBrowserProject(name.value))
}

onMounted(() => void loadProjects())
</script>

<template>
  <main class="h-full overflow-auto bg-canvas px-5 py-8 sm:px-8 lg:py-14">
    <div class="mx-auto max-w-5xl">
      <header class="mb-10">
        <p class="mb-2 text-sm font-medium text-accent">typst.imjz.net</p>
        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Typst Editor</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-muted">
          无需登录。浏览器项目保存在此设备中；桌面浏览器也可以直接编辑你授权的本地文件夹。
        </p>
      </header>

      <section class="grid gap-5 lg:grid-cols-2">
        <div class="rounded-xl border border-line bg-panel p-5 shadow-sm">
          <div class="mb-4 flex items-center gap-3">
            <span class="grid size-10 place-items-center rounded-lg bg-blue-50 text-accent dark:bg-blue-950">
              <Database class="size-5" />
            </span>
            <div>
              <h2 class="font-semibold">新建浏览器项目</h2>
              <p class="text-xs text-muted">项目文件保存在 OPFS 中</p>
            </div>
          </div>
          <form
            class="flex gap-2"
            @submit.prevent="createProject"
          >
            <input
              v-model="name"
              aria-label="项目名称"
              placeholder="项目名称"
              class="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              :disabled="busy"
              class="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <Plus class="size-4" />
              新建
            </button>
          </form>
        </div>

        <div class="rounded-xl border border-line bg-panel p-5 shadow-sm">
          <div class="mb-4 flex items-center gap-3">
            <span class="grid size-10 place-items-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <FolderOpen class="size-5" />
            </span>
            <div>
              <h2 class="font-semibold">打开本地文件夹</h2>
              <p class="text-xs text-muted">直接保存到电脑，不产生下载副本</p>
            </div>
          </div>
          <button
            v-if="canOpenLocal"
            :disabled="busy"
            class="w-full rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-stone-100 disabled:opacity-50 dark:hover:bg-stone-800"
            @click="run(workspace.openLocalWorkspace)"
          >
            选择 Typst 项目目录
          </button>
          <p
            v-else
            class="rounded-lg bg-stone-100 px-3 py-2 text-xs leading-5 text-muted dark:bg-stone-800"
          >
            本地目录模式需要 Chromium 桌面浏览器。当前设备仍可使用浏览器项目。
          </p>
        </div>
      </section>

      <p
        v-if="error"
        class="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
      >
        {{ error }}
      </p>

      <section
        v-if="browserProjects.length || (desktop && localProjects.length)"
        class="mt-10"
      >
        <h2 class="mb-3 text-sm font-semibold">最近项目</h2>
        <div class="overflow-hidden rounded-xl border border-line bg-panel">
          <button
            v-for="project in browserProjects"
            :key="project.id"
            class="flex w-full items-center justify-between border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-stone-100 dark:hover:bg-stone-800"
            @click="run(() => workspace.openBrowserProject(project))"
          >
            <span>
              <span class="block text-sm font-medium">{{ project.name }}</span>
              <span class="text-xs text-muted">浏览器项目</span>
            </span>
            <span class="text-xs text-muted">{{ new Date(project.updatedAt).toLocaleDateString() }}</span>
          </button>
          <button
            v-for="project in desktop ? localProjects : []"
            :key="project.id"
            class="flex w-full items-center justify-between border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-stone-100 dark:hover:bg-stone-800"
            @click="run(() => workspace.openRecentLocal(project))"
          >
            <span>
              <span class="block text-sm font-medium">{{ project.name }}</span>
              <span class="text-xs text-muted">本地文件夹 · 重新打开时需要授权</span>
            </span>
            <FolderOpen class="size-4 text-muted" />
          </button>
        </div>
      </section>
    </div>
  </main>
</template>
