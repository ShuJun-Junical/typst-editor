import type { WorkspaceKind } from '../../core/workspace/provider'

export interface WorkspaceDescriptor {
  id: string
  name: string
  kind: WorkspaceKind
  entryPath: string
}

export interface OpenDocument {
  path: string
  content: string
  dirty: boolean
  lastModified?: number
}
