/**
 * Hover 内容契约（hover 内容契约）。
 *
 * 裁定：hover 的内容选择走 **chain Slot**（`reference.hover.content`），不声明
 * Cordis `reference/hover` serial 事件——原则"data/decision arbitration → Cordis serial；React placement/composition → Slot chain；不建两套 registry 重复做 selection"。first-match 语义（priority 升序、首个非 null
 * 当选、全 null 落空）由 Slot chain cardinality 原生提供。
 *
 * 消费方接入（二段注册，与 sidebar tab body 同范式）：
 *
 * ```ts
 * ctx.effect(() => ctx.slots.inject('reference.hover.content', () =>
 *   ctx.slots.register({
 *     name: 'reference.hover.content',
 *     select: (owner) => isIssueUri(owner.descriptor.uri) ? {} : null,
 *     priority: 0, // 升序遍历，数值越低优先级越高
 *   }, IssueHoverCard)))
 * ```
 */
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type { ReferenceDescriptor } from '../descriptor'

/** Hover 面板当前展示目标的 owner props。 */
export interface ReferenceHoverOwnerProps {
  descriptor: ReferenceDescriptor
  /**
   * 本次 hover 的信号：hover 换锚点或关闭即 abort。
   * 消费者组件内的异步取数（useResource / remote）必须尊重此 signal。
   */
  signal: AbortSignal
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /**
     * 引用 hover 预览内容，chain（first-match）选择。
     * owner = 当前 hover 的 descriptor 与 AbortSignal；全 entry select 返回
     * null 时面板整体不渲染（无 consumer 不产生坏 UI）。
     */
    'reference.hover.content': { kind: 'chain'; scope: 'root'; owner: ReferenceHoverOwnerProps }
  }
}
