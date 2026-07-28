import type { WorkspaceFile } from '../workspace/provider'
import type { CompilerRequest, CompilerResponse } from './compiler.protocol'

export class CompilerClient {
  private worker?: Worker
  private readonly onResponse: (response: CompilerResponse) => void

  constructor(onResponse: (response: CompilerResponse) => void) {
    this.onResponse = onResponse
  }

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./compiler.worker.ts', import.meta.url), {
        type: 'module',
      })
      this.worker.onmessage = (event: MessageEvent<CompilerResponse>) =>
        this.onResponse(event.data)
      this.worker.onerror = (event) =>
        this.onResponse({ type: 'error', message: event.message })
    }
    return this.worker
  }

  send(request: CompilerRequest): void {
    this.getWorker().postMessage(request)
  }

  open(files: WorkspaceFile[], entryPath: string): void {
    this.send({ type: 'open', files, entryPath })
  }

  close(): void {
    this.worker?.postMessage({ type: 'close' } satisfies CompilerRequest)
    this.worker?.terminate()
    this.worker = undefined
  }
}
