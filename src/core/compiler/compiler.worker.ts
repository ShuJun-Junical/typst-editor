/// <reference lib="webworker" />

import type { TypstCompiler } from '@myriaddreamin/typst.ts/compiler'
import { CompileFormatEnum } from '@myriaddreamin/typst.ts/compiler'
import { TypstSnippet } from '@myriaddreamin/typst.ts/contrib/snippet'
import compilerWasmUrl from '@myriaddreamin/typst-ts-web-compiler/wasm?url'
import type {
  CompilerDiagnostic,
  CompilerRequest,
  CompilerResponse,
} from './compiler.protocol'

let compiler: TypstCompiler | undefined
let entryPath = 'main.typ'

function absolutePath(path: string): string {
  return `/${path.replace(/^\/+/, '')}`
}

function post(response: CompilerResponse, transfer: Transferable[] = []): void {
  self.postMessage(response, { transfer })
}

async function openProject(request: Extract<CompilerRequest, { type: 'open' }>) {
  const fontData = request.files
    .filter((file) => /\.(?:otf|ttf|ttc)$/i.test(file.path))
    .map((file) => file.content)

  const snippet = new TypstSnippet()
  snippet.setCompilerInitOptions({ getModule: () => compilerWasmUrl })
  snippet.use(
    TypstSnippet.preloadFontAssets({ assets: ['text', 'cjk'] }),
    TypstSnippet.fetchPackageRegistry(),
  )
  if (fontData.length) snippet.use(TypstSnippet.preloadFonts(fontData))

  compiler = await snippet.getCompiler()
  compiler.resetShadow()
  for (const file of request.files) compiler.mapShadow(absolutePath(file.path), file.content)
  entryPath = request.entryPath
  post({ type: 'ready' })
}

async function compile(requestId: number) {
  if (!compiler) throw new Error('编译器尚未初始化')
  const startedAt = performance.now()
  const result = await compiler.compile({
    root: '/',
    mainFilePath: absolutePath(entryPath),
    format: CompileFormatEnum.vector,
    diagnostics: 'full',
  })
  const artifact = result.result ? Uint8Array.from(result.result).buffer : undefined
  const diagnostics = (result.diagnostics ?? []) as CompilerDiagnostic[]
  const response: CompilerResponse = {
    type: 'compiled',
    requestId,
    artifact,
    diagnostics,
    duration: performance.now() - startedAt,
  }
  post(response, artifact ? [artifact] : [])
}

async function exportPdf(requestId: number) {
  if (!compiler) throw new Error('编译器尚未初始化')
  const result = await compiler.compile({
    root: '/',
    mainFilePath: absolutePath(entryPath),
    format: CompileFormatEnum.pdf,
    diagnostics: 'full',
  })
  if (!result.result) throw new Error('当前项目无法导出 PDF')
  const data = Uint8Array.from(result.result).buffer
  post({ type: 'pdf', requestId, data }, [data])
}

self.onmessage = async (event: MessageEvent<CompilerRequest>) => {
  const request = event.data
  try {
    switch (request.type) {
      case 'open':
        await openProject(request)
        break
      case 'change':
        compiler?.mapShadow(absolutePath(request.path), request.content)
        break
      case 'remove':
        compiler?.unmapShadow(absolutePath(request.path))
        break
      case 'compile':
        await compile(request.requestId)
        break
      case 'exportPdf':
        await exportPdf(request.requestId)
        break
      case 'close':
        compiler?.resetShadow()
        compiler = undefined
        break
    }
  } catch (error) {
    post({
      type: 'error',
      requestId: 'requestId' in request ? request.requestId : undefined,
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
