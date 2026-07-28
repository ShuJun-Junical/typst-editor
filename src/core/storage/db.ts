import Dexie, { type EntityTable } from 'dexie'

export interface BrowserProjectRecord {
  id: string
  name: string
  entryPath: string
  createdAt: number
  updatedAt: number
}

export interface RecentLocalRecord {
  id: string
  name: string
  entryPath: string
  handle: FileSystemDirectoryHandle
  lastOpenedAt: number
}

class TypstEditorDatabase extends Dexie {
  projects!: EntityTable<BrowserProjectRecord, 'id'>
  localWorkspaces!: EntityTable<RecentLocalRecord, 'id'>

  constructor() {
    super('typst-editor')
    this.version(1).stores({
      projects: 'id, updatedAt',
      localWorkspaces: 'id, lastOpenedAt',
    })
  }
}

export const db = new TypstEditorDatabase()
