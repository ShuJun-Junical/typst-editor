import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  CompilerRequest,
  CompilerResponse,
} from '../../core/compiler/compiler.protocol'
import { useCompileStore } from './compile.store'

const anchorClick = vi.fn()

class WorkerMock {
  static instance: WorkerMock
  onmessage?: (event: MessageEvent<CompilerResponse>) => void
  onerror?: (event: ErrorEvent) => void
  messages: CompilerRequest[] = []

  constructor() {
    WorkerMock.instance = this
  }

  postMessage(message: CompilerRequest) {
    this.messages.push(message)
  }

  terminate() {}

  respond(data: CompilerResponse) {
    this.onmessage?.({ data } as MessageEvent<CompilerResponse>)
  }
}

describe('compile store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    anchorClick.mockClear()
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('Worker', WorkerMock)
    vi.stubGlobal('document', {
      body: { append: vi.fn() },
      createElement: () => ({
        href: '',
        download: '',
        click: anchorClick,
        remove: vi.fn(),
      }),
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('debounces changes and ignores stale compile results', () => {
    const store = useCompileStore()
    store.open([{ path: 'main.typ', content: new Uint8Array() }], 'main.typ')
    const worker = WorkerMock.instance
    worker.respond({ type: 'ready' })

    store.change('main.typ', new Uint8Array([1]))
    store.change('main.typ', new Uint8Array([2]))
    vi.advanceTimersByTime(299)
    expect(worker.messages.filter(({ type }) => type === 'compile')).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(worker.messages.filter(({ type }) => type === 'compile')).toHaveLength(2)

    worker.respond({
      type: 'compiled',
      requestId: 1,
      artifact: new Uint8Array([1]).buffer,
      diagnostics: [],
      duration: 10,
    })
    expect(store.artifact).toBeUndefined()

    worker.respond({
      type: 'compiled',
      requestId: 2,
      artifact: new Uint8Array([2]).buffer,
      diagnostics: [],
      duration: 5,
    })
    expect(store.status).toBe('success')
    expect(store.artifact).toEqual(new Uint8Array([2]))

    worker.respond({ type: 'error', requestId: 2, message: 'boom' })
    expect(store.status).toBe('error')
    expect(store.error).toBe('boom')
  })

  it('downloads a PDF response', () => {
    const store = useCompileStore()
    store.exportPdf('Example')
    expect(store.exporting).toBe(true)
    expect(WorkerMock.instance.messages.at(-1)).toMatchObject({
      type: 'exportPdf',
      requestId: 1,
    })

    WorkerMock.instance.respond({
      type: 'pdf',
      requestId: 1,
      data: new Uint8Array([37, 80, 68, 70]).buffer,
    })
    expect(store.exporting).toBe(false)
    expect(anchorClick).toHaveBeenCalledOnce()
  })
})
