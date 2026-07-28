import {
  joinWorkspacePath,
  normalizeWorkspacePath,
  parentWorkspacePath,
  workspaceBasename,
} from './paths'

export type WorkspaceKind = 'opfs' | 'local'

export interface WorkspaceEntry {
  path: string
  name: string
  kind: 'file' | 'directory'
  size?: number
  lastModified?: number
  children?: WorkspaceEntry[]
}

export interface WorkspaceFile {
  path: string
  content: Uint8Array
}

export interface WorkspaceProvider {
  readonly kind: WorkspaceKind
  readonly name: string

  list(path: string): Promise<WorkspaceEntry[]>
  readFile(path: string): Promise<Uint8Array>
  writeFile(path: string, content: Uint8Array): Promise<void>
  createDirectory(path: string): Promise<void>
  deleteEntry(path: string): Promise<void>
}

async function getDirectory(
  root: FileSystemDirectoryHandle,
  path: string,
  create = false,
): Promise<FileSystemDirectoryHandle> {
  let directory = root
  for (const part of normalizeWorkspacePath(path).split('/').filter(Boolean)) {
    directory = await directory.getDirectoryHandle(part, { create })
  }
  return directory
}

export class DirectoryWorkspaceProvider implements WorkspaceProvider {
  readonly kind: WorkspaceKind
  readonly name: string
  readonly root: FileSystemDirectoryHandle

  constructor(
    kind: WorkspaceKind,
    name: string,
    root: FileSystemDirectoryHandle,
  ) {
    this.kind = kind
    this.name = name
    this.root = root
  }

  async list(path: string): Promise<WorkspaceEntry[]> {
    const normalized = normalizeWorkspacePath(path)
    const directory = await getDirectory(this.root, normalized)
    const entries: WorkspaceEntry[] = []

    for await (const handle of directory.values()) {
      const entryPath = joinWorkspacePath(normalized, handle.name)
      if (handle.kind === 'file') {
        const file = await handle.getFile()
        entries.push({
          path: entryPath,
          name: handle.name,
          kind: 'file',
          size: file.size,
          lastModified: file.lastModified,
        })
      } else {
        entries.push({ path: entryPath, name: handle.name, kind: 'directory' })
      }
    }

    return entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  async readFile(path: string): Promise<Uint8Array> {
    const normalized = normalizeWorkspacePath(path)
    const directory = await getDirectory(this.root, parentWorkspacePath(normalized))
    const handle = await directory.getFileHandle(workspaceBasename(normalized))
    return new Uint8Array(await (await handle.getFile()).arrayBuffer())
  }

  async writeFile(path: string, content: Uint8Array): Promise<void> {
    const normalized = normalizeWorkspacePath(path)
    const directory = await getDirectory(this.root, parentWorkspacePath(normalized), true)
    const handle = await directory.getFileHandle(workspaceBasename(normalized), { create: true })
    const writable = await handle.createWritable()
    await writable.write(new Blob([Uint8Array.from(content)]))
    await writable.close()
  }

  async createDirectory(path: string): Promise<void> {
    await getDirectory(this.root, normalizeWorkspacePath(path), true)
  }

  async deleteEntry(path: string): Promise<void> {
    const normalized = normalizeWorkspacePath(path)
    if (!normalized) throw new Error('不能删除项目根目录')
    const directory = await getDirectory(this.root, parentWorkspacePath(normalized))
    await directory.removeEntry(workspaceBasename(normalized), { recursive: true })
  }
}

export async function readWorkspaceFiles(
  provider: WorkspaceProvider,
  path = '',
): Promise<WorkspaceFile[]> {
  const files: WorkspaceFile[] = []
  for (const entry of await provider.list(path)) {
    if (entry.kind === 'directory') {
      files.push(...(await readWorkspaceFiles(provider, entry.path)))
    } else {
      files.push({ path: entry.path, content: await provider.readFile(entry.path) })
    }
  }
  return files
}

export async function readWorkspaceTree(
  provider: WorkspaceProvider,
  path = '',
): Promise<WorkspaceEntry[]> {
  const entries = await provider.list(path)
  await Promise.all(
    entries.map(async (entry) => {
      if (entry.kind === 'directory') entry.children = await readWorkspaceTree(provider, entry.path)
    }),
  )
  return entries
}
