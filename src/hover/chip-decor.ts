/**
 * Chip 修饰契约（contract: reference-chip-decor）。
 *
 * 状态点/状态条等业务修饰的**数据**由贡献方插件经 chain slot 贡献；
 * 视觉组件（StatusRefChip）与交互由渲染接线方持有——数据与视觉分离，
 * 两类插件围绕 domain-neutral 契约协作，互不 import。
 *
 * 消费范式（渲染接线方，renderRef 内手工选举）：
 *
 * ```ts
 * renderRef: (segment) => {
 *   const entry = elect(slots, 'reference.chip.decor', { descriptor: segment.descriptor })
 *   if (entry === null) return null          // 未认领 → 素 chip（干净降级）
 *   return createElement(StatusRefChip, { descriptor, label, ...entry.matched, ...handlers })
 * }
 * ```
 */
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type { ReferenceDescriptor } from '../descriptor'

/** 一次 chip 修饰：全部字段可选，渲染方按需取用（交给 StatusRefChip 同名 props）。 */
export interface ReferenceChipDecor {
  typeLabel?: string | undefined
  label?: string | undefined
  status?: string | undefined
  statusColor?: string | undefined
  /** 左状态条独立控制：'bind'=随点（缺省语义），null=无条，色值=独立条色。 */
  statusBar?: 'bind' | null | string | undefined
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /**
     * 引用 chip 业务修饰，chain（first-match）选择。
     * owner = 目标 descriptor；select 返回 null = 不认领（素 chip 降级）。
     */
    'reference.chip.decor': { kind: 'chain'; scope: 'root'; owner: { descriptor: ReferenceDescriptor } }
  }
}
