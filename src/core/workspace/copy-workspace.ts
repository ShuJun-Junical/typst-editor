import type { WorkspaceProvider } from './provider'

export async function copyWorkspace(
  source: WorkspaceProvider,
  target: WorkspaceProvider,
  path = '',
): Promise<void> {
  for (const entry of await source.list(path)) {
    if (entry.kind === 'directory') {
      await target.createDirectory(entry.path)
      await copyWorkspace(source, target, entry.path)
    } else {
      await target.writeFile(entry.path, await source.readFile(entry.path))
    }
  }
}
