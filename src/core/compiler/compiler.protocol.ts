import type { WorkspaceFile } from '../workspace/provider'

export interface CompilerDiagnostic {
  path: string
  severity: string
  range: string
  message: string
}

export type CompilerRequest =
  | { type: 'open'; files: WorkspaceFile[]; entryPath: string }
  | { type: 'change'; path: string; content: Uint8Array }
  | { type: 'remove'; path: string }
  | { type: 'compile'; requestId: number }
  | { type: 'exportPdf'; requestId: number }
  | { type: 'close' }

export type CompilerResponse =
  | { type: 'ready' }
  | {
      type: 'compiled'
      requestId: number
      artifact?: ArrayBuffer
      diagnostics: CompilerDiagnostic[]
      duration: number
    }
  | { type: 'pdf'; requestId: number; data: ArrayBuffer }
  | { type: 'error'; requestId?: number; message: string }
