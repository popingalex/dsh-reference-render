/**
 * Conversation chat node 装饰器（contract: reference-contribution）。
 *
 * 采用社区标准「原地装饰」模式（dsh-annotation / dsh-smooth-stream 同款）：
 * 读取 `conversation.chat.node`（官方 keyed slot）既有 entry，把目标 key 的
 * component 原地替换为包装组件；restores 数组支持干净回滚（dispose 卸载）。
 * WeakSet 防重复包装（HMR/多次接线安全）。
 *
 * 本模块不改变默认渲染：wrap 未提供时为 identity 透传——公开包不替宿主做
 * 正文决策（authority 边界）；需要 wire 分段渲染的宿主用 `WireText`（wire-text.tsx）
 * 自行组装自己的 node body。
 */
import { createElement, memo, type ComponentType } from 'react'
import type { Context } from '@deepseek-ai/cordis'

export const CHAT_NODE_SLOT = 'conversation.chat.node'

/** ui-slots StoredEntry 的装饰所需最小面（避免依赖宿主内部类型）。 */
export interface ChatNodeEntryLike {
  options: { key?: string }
  component: unknown
  inject?: ((...args: unknown[]) => Record<string, unknown>) | undefined
}

export interface ChatNodeSlotsLike {
  entries(slot: string): readonly unknown[]
}

type AnyComponent = ComponentType<Record<string, unknown>>

export interface DecorateChatNodeOptions {
  /** 目标 keyed entry（默认官方助手节点 key 'assistant-step'）。 */
  key?: string
  /**
   * 包装函数：入参是原组件，返回新组件。缺省 = identity（无行为变化，
   * 仅验证接线）。组件接收原 props 原样透传。
   */
  wrap?: ((inner: AnyComponent) => AnyComponent) | undefined
  /**
   * inject 面合并：在原 entry.inject 结果上叠加额外注入（原结果优先级低）。
   * 缺省 = 保留原 inject 原样。
   */
  injectFace?: ((args: unknown[], original: Record<string, unknown>) => Record<string, unknown>) | undefined
}

function isComponent(value: unknown): value is AnyComponent {
  return typeof value === 'function' || (typeof value === 'object' && value !== null && '$$typeof' in value)
}

/**
 * 装饰 `conversation.chat.node` 的目标 entry。
 * @returns 反装饰函数：恢复原 component/inject（dispose 挂 ctx.effect）。
 */
/** 模块级装饰登记：跨多次接线（HMR/重连）幂等；restore 时解除登记。 */
const decoratedEntries = new WeakSet<object>()

export function decorateChatNode(
  ctx: Context & { slots: ChatNodeSlotsLike },
  options: DecorateChatNodeOptions = {},
): () => void {
  const key = options.key ?? 'assistant-step'
  const restores: Array<() => void> = []

  const decorateAll = (): void => {
    const entries = ctx.slots.entries(CHAT_NODE_SLOT) as readonly ChatNodeEntryLike[]
    for (const entry of entries) {
      if (entry.options.key !== key) continue
      const current = entry.component
      if (!isComponent(current) || decoratedEntries.has(entry)) continue

      const originalInject = entry.inject
      let touched = false
      if (options.wrap !== undefined) {
        const next = options.wrap(current)
        entry.component = next
        restores.push(() => { entry.component = current })
        touched = true
      }
      if (options.injectFace !== undefined) {
        const nextInject = (...args: unknown[]): Record<string, unknown> => {
          const original = originalInject?.(...args) ?? {}
          return options.injectFace!(args, original)
        }
        entry.inject = nextInject
        restores.push(() => { entry.inject = originalInject })
        touched = true
      }
      if (touched) {
        decoratedEntries.add(entry)
        restores.push(() => { decoratedEntries.delete(entry) })
      }
    }
  }

  decorateAll()
  return () => { for (const restore of restores) restore() }
}

/** identity 透传包装（缺省 wrap；用于纯 injectFace 注入场景）。 */
export function passthroughWrap(inner: AnyComponent): AnyComponent {
  const Wrapped = memo(function PassthroughWrapped(props: Record<string, unknown>) {
    return createElement(inner, props)
  })
  Wrapped.displayName = `ReferencePassthrough(${inner.displayName ?? inner.name ?? 'Anonymous'})`
  return Wrapped
}
