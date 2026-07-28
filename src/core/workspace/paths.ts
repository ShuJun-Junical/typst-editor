export function normalizeWorkspacePath(path: string): string {
  if (path.includes('\0') || path.startsWith('/') || /^[a-zA-Z]:/.test(path)) {
    throw new Error(`无效的项目路径：${path}`)
  }

  const parts = path.replaceAll('\\', '/').split('/').filter(Boolean)
  if (parts.some((part) => part === '..')) {
    throw new Error(`项目路径不能包含 ..：${path}`)
  }

  return parts.filter((part) => part !== '.').join('/')
}

export function joinWorkspacePath(...parts: string[]): string {
  return normalizeWorkspacePath(parts.filter(Boolean).join('/'))
}

export function parentWorkspacePath(path: string): string {
  const normalized = normalizeWorkspacePath(path)
  return normalized.slice(0, normalized.lastIndexOf('/') + 1).replace(/\/$/, '')
}

export function workspaceBasename(path: string): string {
  return normalizeWorkspacePath(path).split('/').at(-1) ?? ''
}
