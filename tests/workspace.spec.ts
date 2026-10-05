import { describe, expect, it } from 'vitest'
import { workspaceForSession } from '../src/workspace'

const catalog = [
  { id: 'ws-1', title: 'default-workspace', path: '/demo', sessionIds: ['session-in'] },
]

describe('workspaceForSession', () => {
  it('returns the workspace that lists the session', () => {
    expect(workspaceForSession(catalog, 'session-in')).toEqual({
      id: 'ws-1',
      title: 'default-workspace',
      path: '/demo',
    })
  })

  it('returns undefined when the session is not in any workspace', () => {
    expect(workspaceForSession(catalog, 'session-out')).toBeUndefined()
    expect(workspaceForSession(catalog, undefined)).toBeUndefined()
  })
})
