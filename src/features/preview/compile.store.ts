import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { CompilerClient } from '../../core/compiler/compiler.client'
import type {
  CompilerDiagnostic,
  CompilerResponse,
} from '../../core/compiler/compiler.protocol'
import type { WorkspaceFile } from '../../core/workspace/provider'

export type CompileStatus = 'idle' | 'loading' | 'compiling' | 'success' | 'error'

export const useCompileStore = defineStore('compile', () => {
  const status = ref<CompileStatus>('idle')
  const diagnostics = ref<CompilerDiagnostic[]>([])
  const artifact = shallowRef<Uint8Array>()
  const duration = ref(0)
  const error = ref('')
  const exporting = ref(false)
  let latestRequestId = 0
  let pdfRequestId = 0
  let pendingPdfName = 'document.pdf'
  let compileTimer: number | undefined

  const client = new CompilerClient(handleResponse)

  function handleResponse(response: CompilerResponse) {
    if (response.type === 'ready') {
      requestCompile()
      return
    }
    if (response.type === 'compiled') {
      if (response.requestId !== latestRequestId) return
      diagnostics.value = response.diagnostics
      duration.value = response.duration
      artifact.value = response.artifact ? new Uint8Array(response.artifact) : undefined
      status.value = response.artifact ? 'success' : 'error'
      error.value = response.artifact ? '' : response.diagnostics[0]?.message || '编译失败'
      return
    }
    if (response.type === 'pdf') {
      exporting.value = false
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = pendingPdfName
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      return
    }
    exporting.value = false
    status.value = 'error'
    error.value = response.message
  }

  function open(files: WorkspaceFile[], entryPath: string) {
    status.value = 'loading'
    error.value = ''
    artifact.value = undefined
    diagnostics.value = []
    client.open(files, entryPath)
  }

  function change(path: string, content: Uint8Array) {
    client.send({ type: 'change', path, content })
    scheduleCompile()
  }

  function remove(path: string) {
    client.send({ type: 'remove', path })
    scheduleCompile()
  }

  function scheduleCompile() {
    window.clearTimeout(compileTimer)
    compileTimer = window.setTimeout(requestCompile, 300)
  }

  function requestCompile() {
    status.value = 'compiling'
    client.send({ type: 'compile', requestId: ++latestRequestId })
  }

  function exportPdf(projectName: string) {
    pendingPdfName = `${projectName || 'document'}.pdf`
    exporting.value = true
    client.send({ type: 'exportPdf', requestId: ++pdfRequestId })
  }

  function close() {
    window.clearTimeout(compileTimer)
    client.close()
    status.value = 'idle'
    exporting.value = false
    artifact.value = undefined
    diagnostics.value = []
  }

  return {
    status,
    diagnostics,
    artifact,
    duration,
    error,
    exporting,
    open,
    change,
    remove,
    requestCompile,
    exportPdf,
    close,
  }
})
