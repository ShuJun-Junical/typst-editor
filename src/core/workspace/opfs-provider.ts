import { normalizeWorkspacePath } from './paths'
import { DirectoryWorkspaceProvider } from './provider'

export async function createOpfsProvider(
  projectId: string,
  name: string,
): Promise<DirectoryWorkspaceProvider> {
  const root = await navigator.storage.getDirectory()
  const projects = await root.getDirectoryHandle('projects', { create: true })
  const project = await projects.getDirectoryHandle(normalizeWorkspacePath(projectId), {
    create: true,
  })
  return new DirectoryWorkspaceProvider('opfs', name, project)
}
