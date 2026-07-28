import { defineStore } from 'pinia'
import { computed, markRaw, ref } from 'vue'
import { db, type BrowserProjectRecord, type RecentLocalRecord } from '../../core/storage/db'
import { copyWorkspace } from '../../core/workspace/copy-workspace'
import {
  openLocalProvider,
  restoreLocalProvider,
  supportsLocalWorkspaces,
} from '../../core/workspace/local-provider'
import { createOpfsProvider } from '../../core/workspace/opfs-provider'
import { joinWorkspacePath, parentWorkspacePath } from '../../core/workspace/paths'
import {
  DirectoryWorkspaceProvider,
  readWorkspaceFiles,
  readWorkspaceTree,
  type WorkspaceEntry,
  type WorkspaceProvider,
} from '../../core/workspace/provider'
import { useCompileStore } from '../preview/compile.store'
import { useSettingsStore } from '../settings/settings.store'
import type { OpenDocument, WorkspaceDescriptor } from './workspace.types'

const textExtensions = new Set([
  'typ',
  'txt',
  'md',
  'json',
  'yaml',
  'yml',
  'toml',
  'csv',
  'bib',
  'svg',
  'xml',
])
const starter = `#set page(paper: "a4", margin: 24mm)

= Hello, Typst!

Edit this document and the preview will update automatically.
`

function isTextPath(path: string): boolean {
  return textExtensions.has(path.split('.').at(-1)?.toLowerCase() ?? '')
}

function findEntry(entries: WorkspaceEntry[], path: string): WorkspaceEntry | undefined {
  for (const entry of entries) {
    if (entry.path === path) return entry
    const child = entry.children && findEntry(entry.children, path)
    if (child) return child
  }
}

function firstTypstFile(entries: WorkspaceEntry[]): WorkspaceEntry | undefined {
  for (const entry of entries) {
    if (entry.kind === 'file' && entry.path.endsWith('.typ')) return entry
    const child = entry.children && firstTypstFile(entry.children)
    if (child) return child
  }
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const current = ref<WorkspaceDescriptor>()
  const tree = ref<WorkspaceEntry[]>([])
  const openPaths = ref<string[]>([])
  const activePath = ref('')
  const documents = ref<Record<string, OpenDocument>>({})
  const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const error = ref('')
  let provider: WorkspaceProvider | undefined
  const saveTimers = new Map<string, number>()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const activeDocument = computed(() => documents.value[activePath.value])
  const activeEntry = computed(() => findEntry(tree.value, activePath.value))

  async function refreshTree() {
    if (provider) tree.value = await readWorkspaceTree(provider)
  }

  async function openFile(path: string) {
    if (!provider) return
    activePath.value = path
    if (!openPaths.value.includes(path)) openPaths.value.push(path)
    if (!isTextPath(path) || documents.value[path]) return

    const content = decoder.decode(await provider.readFile(path))
    documents.value[path] = {
      path,
      content,
      dirty: false,
      lastModified: findEntry(tree.value, path)?.lastModified,
    }
  }

  async function openWorkspace(
    descriptor: WorkspaceDescriptor,
    nextProvider: WorkspaceProvider,
  ) {
    if (provider) await saveAll()
    useCompileStore().close()
    provider = markRaw(nextProvider)
    current.value = descriptor
    openPaths.value = []
    activePath.value = ''
    documents.value = {}
    error.value = ''
    await refreshTree()
    const entry = findEntry(tree.value, descriptor.entryPath) ?? firstTypstFile(tree.value)
    if (!entry) throw new Error('项目中没有可编译的 .typ 文件')
    current.value.entryPath = entry.path
    await openFile(entry.path)
    useCompileStore().open(await readWorkspaceFiles(provider), entry.path)
  }

  async function createBrowserProject(name: string) {
    const id = crypto.randomUUID()
    const now = Date.now()
    const record: BrowserProjectRecord = {
      id,
      name: name.trim() || 'Untitled',
      entryPath: 'main.typ',
      createdAt: now,
      updatedAt: now,
    }
    const nextProvider = await createOpfsProvider(record.id, record.name)
    await nextProvider.writeFile('main.typ', encoder.encode(starter))
    await db.projects.add(record)
    await openWorkspace({ ...record, kind: 'opfs' }, nextProvider)
  }

  async function openBrowserProject(record: BrowserProjectRecord) {
    await openWorkspace(
      { id: record.id, name: record.name, kind: 'opfs', entryPath: record.entryPath },
      await createOpfsProvider(record.id, record.name),
    )
  }

  async function rememberLocal(
    provider: DirectoryWorkspaceProvider,
    id: string = crypto.randomUUID(),
  ) {
    await db.localWorkspaces.put({
      id,
      name: provider.name,
      entryPath: 'main.typ',
      handle: provider.root,
      lastOpenedAt: Date.now(),
    })
    return id
  }

  async function openLocalWorkspace() {
    const nextProvider = await openLocalProvider()
    const recents = await db.localWorkspaces.toArray()
    let existing: RecentLocalRecord | undefined
    for (const recent of recents) {
      if (await recent.handle.isSameEntry(nextProvider.root)) {
        existing = recent
        break
      }
    }
    const id = await rememberLocal(nextProvider, existing?.id)
    await openWorkspace(
      {
        id,
        name: nextProvider.name,
        kind: 'local',
        entryPath: existing?.entryPath ?? 'main.typ',
      },
      nextProvider,
    )
  }

  async function openRecentLocal(record: RecentLocalRecord) {
    await openWorkspace(
      { id: record.id, name: record.name, kind: 'local', entryPath: record.entryPath },
      await restoreLocalProvider(record.handle, record.name),
    )
    await db.localWorkspaces.update(record.id, { lastOpenedAt: Date.now() })
  }

  function updateActiveText(content: string) {
    const document = activeDocument.value
    if (!document) return
    document.content = content
    document.dirty = true
    useCompileStore().change(document.path, encoder.encode(content))
    if (useSettingsStore().autoSave) scheduleSave(document.path)
  }

  function scheduleSave(path: string) {
    window.clearTimeout(saveTimers.get(path))
    saveTimers.set(path, window.setTimeout(() => void saveDocument(path), 500))
  }

  async function saveDocument(path: string) {
    const document = documents.value[path]
    if (!provider || !document?.dirty) return
    saveStatus.value = 'saving'
    try {
      await provider.writeFile(path, encoder.encode(document.content))
      const entry = (await provider.list(parentWorkspacePath(path))).find(
        (candidate) => candidate.path === path,
      )
      document.lastModified = entry?.lastModified
      document.dirty = false
      saveStatus.value = 'saved'
      error.value = ''
      if (current.value?.kind === 'opfs') {
        await db.projects.update(current.value.id, { updatedAt: Date.now() })
      }
    } catch (cause) {
      saveStatus.value = 'error'
      error.value = cause instanceof Error ? cause.message : String(cause)
    }
  }

  async function saveAll() {
    await Promise.all(Object.keys(documents.value).map(saveDocument))
  }

  function closeFile(path: string) {
    openPaths.value = openPaths.value.filter((openPath) => openPath !== path)
    if (activePath.value === path) {
      activePath.value = openPaths.value.at(-1) ?? ''
    }
  }

  async function createFile(path: string) {
    if (!provider) return
    await provider.writeFile(path, new Uint8Array())
    await refreshTree()
    await openFile(path)
    useCompileStore().change(path, new Uint8Array())
  }

  async function createDirectory(path: string) {
    if (!provider) return
    await provider.createDirectory(path)
    await refreshTree()
  }

  async function deleteEntry(path: string) {
    if (!provider) return
    await provider.deleteEntry(path)
    closeFile(path)
    delete documents.value[path]
    useCompileStore().remove(path)
    await refreshTree()
  }

  async function uploadFiles(files: FileList, directory = '') {
    if (!provider) return
    for (const file of files) {
      const path = joinWorkspacePath(directory, file.name)
      await provider.writeFile(path, new Uint8Array(await file.arrayBuffer()))
    }
    await refreshTree()
    useCompileStore().open(await readWorkspaceFiles(provider), current.value!.entryPath)
  }

  async function copyToLocal() {
    if (!provider || !supportsLocalWorkspaces()) return
    await saveAll()
    const target = await openLocalProvider()
    await copyWorkspace(provider, target)
    const id = await rememberLocal(target)
    await openWorkspace(
      { id, name: target.name, kind: 'local', entryPath: current.value!.entryPath },
      target,
    )
  }

  async function copyToBrowser(name: string) {
    if (!provider) return
    await saveAll()
    const id = crypto.randomUUID()
    const projectName = name.trim() || `${current.value?.name ?? 'Project'} Copy`
    const target = await createOpfsProvider(id, projectName)
    await copyWorkspace(provider, target)
    const now = Date.now()
    await db.projects.add({
      id,
      name: projectName,
      entryPath: current.value!.entryPath,
      createdAt: now,
      updatedAt: now,
    })
    await openWorkspace(
      { id, name: projectName, kind: 'opfs', entryPath: current.value!.entryPath },
      target,
    )
  }

  async function checkExternalChanges() {
    if (!provider || current.value?.kind !== 'local') return
    await refreshTree()
    for (const document of Object.values(documents.value)) {
      const entry = findEntry(tree.value, document.path)
      if (!entry?.lastModified || entry.lastModified === document.lastModified) continue
      const reload =
        !document.dirty ||
        window.confirm(`${document.path} 已被其他程序修改。是否重新加载磁盘内容？`)
      if (reload) {
        document.content = decoder.decode(await provider.readFile(document.path))
        document.dirty = false
        useCompileStore().change(document.path, encoder.encode(document.content))
      }
      document.lastModified = entry.lastModified
    }
  }

  async function closeWorkspace() {
    await saveAll()
    useCompileStore().close()
    provider = undefined
    current.value = undefined
    tree.value = []
    openPaths.value = []
    documents.value = {}
  }

  return {
    current,
    tree,
    openPaths,
    activePath,
    documents,
    activeDocument,
    activeEntry,
    saveStatus,
    error,
    supportsLocalWorkspaces,
    createBrowserProject,
    openBrowserProject,
    openLocalWorkspace,
    openRecentLocal,
    openFile,
    closeFile,
    updateActiveText,
    saveDocument,
    saveAll,
    createFile,
    createDirectory,
    deleteEntry,
    uploadFiles,
    copyToLocal,
    copyToBrowser,
    checkExternalChanges,
    closeWorkspace,
  }
})
