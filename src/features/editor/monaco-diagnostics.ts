import type { editor } from 'monaco-editor'
import type { CompilerDiagnostic } from '../../core/compiler/compiler.protocol'

export function toMarker(diagnostic: CompilerDiagnostic): editor.IMarkerData {
  const match = diagnostic.range.match(/(\d+):(\d+)(?:-(\d+):(\d+))?/)
  const startLineNumber = Number(match?.[1] ?? 1)
  const startColumn = Number(match?.[2] ?? 1)
  return {
    severity: diagnostic.severity === 'warning' ? 4 : 8,
    message: diagnostic.message,
    startLineNumber,
    startColumn,
    endLineNumber: Number(match?.[3] ?? startLineNumber),
    endColumn: Number(match?.[4] ?? startColumn + 1),
  }
}
