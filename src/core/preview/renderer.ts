import { TypstSnippet } from '@myriaddreamin/typst.ts/contrib/snippet'
import rendererWasmUrl from '@myriaddreamin/typst-ts-renderer/wasm?url'

const renderer = new TypstSnippet()
renderer.setRendererInitOptions({ getModule: () => rendererWasmUrl })

export function renderArtifact(artifact: Uint8Array): Promise<string> {
  return renderer.svg({ vectorData: artifact })
}
