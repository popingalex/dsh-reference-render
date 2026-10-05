/**
 * 从工作区目录里找出某个会话所属的工作区。
 * 目录项是宿主 `workspaces.list` 的结构子集，本模块不依赖宿主包。
 */
import type { ReferenceWorkspaceRef } from './events'

export interface WorkspaceCatalogItem {
  readonly id: string
  readonly title?: string
  readonly path?: string
  readonly sessionIds: readonly string[]
}

/** 会话不在任何一项的 sessionIds 里时返回 undefined。 */
export function workspaceForSession(
  items: readonly WorkspaceCatalogItem[],
  sessionId: string | undefined,
): ReferenceWorkspaceRef | undefined {
  if (sessionId === undefined || sessionId === '') return undefined
  const hit = items.find((item) => item.sessionIds.includes(sessionId))
  if (hit === undefined) return undefined
  const ref: ReferenceWorkspaceRef = { id: hit.id }
  if (hit.title !== undefined && hit.title !== '') return { ...ref, title: hit.title, ...(hit.path ? { path: hit.path } : {}) }
  if (hit.path !== undefined && hit.path !== '') return { ...ref, path: hit.path }
  return ref
}
