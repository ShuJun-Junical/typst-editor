import { DirectoryWorkspaceProvider } from './provider'

export function supportsLocalWorkspaces(): boolean {
  return 'showDirectoryPicker' in window
}

async function ensureWritePermission(handle: FileSystemDirectoryHandle): Promise<void> {
  const options: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' }
  if (
    (await handle.queryPermission(options)) !== 'granted' &&
    (await handle.requestPermission(options)) !== 'granted'
  ) {
    throw new Error('未获得本地目录读写权限')
  }
}

export async function openLocalProvider(): Promise<DirectoryWorkspaceProvider> {
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  await ensureWritePermission(handle)
  return new DirectoryWorkspaceProvider('local', handle.name, handle)
}

export async function restoreLocalProvider(
  handle: FileSystemDirectoryHandle,
  name = handle.name,
): Promise<DirectoryWorkspaceProvider> {
  await ensureWritePermission(handle)
  return new DirectoryWorkspaceProvider('local', name, handle)
}
