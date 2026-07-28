import { describe, expect, it } from 'vitest'
import { copyWorkspace } from './copy-workspace'
import type { WorkspaceEntry, WorkspaceProvider } from './provider'

class MemoryProvider implements WorkspaceProvider {
  readonly kind = 'opfs'
  readonly name = 'test'
  readonly files = new Map<string, Uint8Array>()
  readonly directories = new Set<string>([''])

  async list(path: string): Promise<WorkspaceEntry[]> {
    const prefix = path ? `${path}/` : ''
    const entries = new Map<string, WorkspaceEntry>()
    for (const directory of this.directories) {
      if (!directory.startsWith(prefix) || directory === path) continue
      const rest = directory.slice(prefix.length)
      if (!rest.includes('/')) {
        entries.set(directory, { path: directory, name: rest, kind: 'directory' })
      }
    }
    for (const file of this.files.keys()) {
      if (!file.startsWith(prefix)) continue
      const rest = file.slice(prefix.length)
      if (!rest.includes('/')) {
        entries.set(file, { path: file, name: rest, kind: 'file' })
      }
    }
    return [...entries.values()]
  }

  async readFile(path: string) {
    const file = this.files.get(path)
    if (!file) throw new Error('missing file')
    return file
  }

  async writeFile(path: string, content: Uint8Array) {
    this.files.set(path, content)
  }

  async createDirectory(path: string) {
    this.directories.add(path)
  }

  async deleteEntry(path: string) {
    this.files.delete(path)
    this.directories.delete(path)
  }
}

describe('copyWorkspace', () => {
  it('copies binary files and empty directories', async () => {
    const source = new MemoryProvider()
    const target = new MemoryProvider()
    source.directories.add('empty')
    source.directories.add('assets')
    source.files.set('main.typ', new TextEncoder().encode('Hello'))
    source.files.set('assets/pixel.bin', new Uint8Array([0, 1, 255]))

    await copyWorkspace(source, target)

    expect(target.directories).toContain('empty')
    expect(target.files.get('main.typ')).toEqual(new TextEncoder().encode('Hello'))
    expect(target.files.get('assets/pixel.bin')).toEqual(new Uint8Array([0, 1, 255]))
  })
})
