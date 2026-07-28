import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CompilerRequest } from '../../core/compiler/compiler.protocol'

const mocks = vi.hoisted(() => {
  const state: { content: Uint8Array<ArrayBufferLike> } = { content: new Uint8Array() }
  const provider = {
    kind: 'opfs' as const,
    name: 'Test',
    list: vi.fn(async () => [
      {
        kind: 'file' as const,
        name: 'main.typ',
        path: 'main.typ',
        size: state.content.byteLength,
        lastModified: 1,
      },
    ]),
    readFile: vi.fn(async () => state.content),
    writeFile: vi.fn(async (_path: string, content: Uint8Array) => {
      state.content = content
    }),
    createDirectory: vi.fn(),
    deleteEntry: vi.fn(),
  }
  return {
    state,
    provider,
    projects: { add: vi.fn(), update: vi.fn(), toArray: vi.fn(async () => []) },
  }
})

vi.mock('../../core/workspace/opfs-provider', () => ({
  createOpfsProvider: vi.fn(async () => mocks.provider),
}))
vi.mock('../../core/storage/db', () => ({
  db: {
    projects: mocks.projects,
    localWorkspaces: { put: vi.fn(), toArray: vi.fn(async () => []), update: vi.fn() },
  },
}))

import { useWorkspaceStore } from './workspace.store'

class WorkerMock {
  onmessage?: (event: MessageEvent) => void
  onerror?: (event: ErrorEvent) => void
  messages: CompilerRequest[] = []
  postMessage(message: CompilerRequest) {
    this.messages.push(message)
  }
  terminate() {}
}

describe('workspace store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mocks.state.content = new Uint8Array()
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('Worker', WorkerMock)
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    vi.stubGlobal('document', { documentElement: { classList: { toggle: vi.fn() } } })
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('saves the working copy after 500 ms', async () => {
    const store = useWorkspaceStore()
    await store.createBrowserProject('Test')
    expect(mocks.provider.writeFile).toHaveBeenCalledTimes(1)

    store.updateActiveText('= Changed')
    await vi.advanceTimersByTimeAsync(499)
    expect(mocks.provider.writeFile).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(mocks.provider.writeFile).toHaveBeenCalledTimes(2)
    expect(new TextDecoder().decode(mocks.state.content)).toBe('= Changed')
  })
})
