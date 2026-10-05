/**
 * DSH Loader client entry：以 loader entry 身份装载（inject/apply 为 entry
 * 有效性所需的最小面），同时导出运行时面供宿主包经 module table require。
 * 装载时注入包样式（幂等）。
 */
import { ensureReferenceStyles } from './styles'

export * from './index'

export const name = 'dsh-reference-render'

export const inject: string[] = []

export function apply(): void {
  if (typeof document !== 'undefined') ensureReferenceStyles(document)
}
