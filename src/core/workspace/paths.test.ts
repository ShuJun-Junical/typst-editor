import { describe, expect, it } from 'vitest'
import {
  joinWorkspacePath,
  normalizeWorkspacePath,
  parentWorkspacePath,
  workspaceBasename,
} from './paths'

describe('workspace paths', () => {
  it('normalizes safe relative paths', () => {
    expect(normalizeWorkspacePath('chapters\\intro.typ')).toBe('chapters/intro.typ')
    expect(joinWorkspacePath('assets', 'images', 'avatar.png')).toBe(
      'assets/images/avatar.png',
    )
    expect(parentWorkspacePath('chapters/intro.typ')).toBe('chapters')
    expect(workspaceBasename('chapters/intro.typ')).toBe('intro.typ')
  })

  it.each(['/main.typ', '../main.typ', 'a/../../main.typ', 'C:\\main.typ'])(
    'rejects unsafe path %s',
    (path) => expect(() => normalizeWorkspacePath(path)).toThrow(),
  )
})
