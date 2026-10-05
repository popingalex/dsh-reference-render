/**
 * dsh-reference-render-demo — conversation 渲染接线示例插件（dsh-reference-render 官方示例）。
 *
 * 只负责「渲染接线」，不理解任何业务域（内容全部来自贡献方插件
 * dsh-reference-render-sidebar-demo——两插件围绕 domain-neutral 契约协作）：
 *  1. assistant-step + user 两个 keyed renderer（shadowing rank -1）：输入与
 *     输出消息的文本块都经 WireText 出 chip；demo 域外的引用是素 chip。
 *  2. hover 面板宿主：ReferenceHoverProvider + ReferenceHoverPanel；面板内容
 *     经 `reference.hover.content` chain slot 手工选举——内容由贡献方插件提供，
 *     本插件对业务域零知识。
 *
 * 构建期相对打包 dsh-reference-render 源码；生产宿主应改为正常 npm 依赖。
 */
import { Fragment, createElement } from 'react'
import {
  ReferenceHoverPanel,
  ReferenceHoverProvider,
  StatusRefChip,
  WireText,
  dispatchReferenceOpen,
  ensureReferenceStyles,
  workspaceForSession,
} from '../../../src/index'
import type { ReferenceDescriptor, ReferenceWorkspaceRef } from '../../../src/index'

/* ====================== hover chain 手工选举（消费贡献方内容） ====================== */

/**
 * slots 服务引用（apply 时绑定）。组件经模块级引用读取而非 props 注入——
 * 若用 HOC 包装注入，每次渲染产生新组件类型，React 会整树 remount，
 * hover Provider 状态被无限重置（真机实测教训）。
 */
let slotsRef: { entries(slot: string): readonly unknown[] } | undefined

/**
 * 激活派发（apply 时绑定根 scope ctx）。serial 只向祖先冒泡——listener 注册在
 * 内容方插件的兄弟 scope，必须从根派发才能跨插件触达。
 */
let activateRef: ((
  detail: { descriptor: ReferenceDescriptor; activation: 'keyboard' | 'pointer' | 'programmatic' },
  workspace: ReferenceWorkspaceRef | undefined,
) => void) | undefined

interface WorkspaceListFace {
  list: {
    getSnapshot(): {
      items: readonly {
        workspaceId: string
        title?: string
        path?: string
        sessionIds: readonly string[]
      }[]
    }
  }
}

let workspacesRef: WorkspaceListFace | undefined

function workspaceOf(sessionId: string | undefined): ReferenceWorkspaceRef | undefined {
  const items = workspacesRef?.list.getSnapshot().items ?? []
  return workspaceForSession(
    items.map((item) => ({
      id: item.workspaceId,
      sessionIds: item.sessionIds,
      ...(item.title ? { title: item.title } : {}),
      ...(item.path ? { path: item.path } : {}),
    })),
    sessionId,
  )
}

interface ChainEntry {
  select?: ((owner: unknown) => unknown) | undefined
  component: unknown
}

/** 从 slots 服务读 chain entries 并选举：首个 select 非 null 者返回 {matched, component}，全 null 落空。 */
function electChain(slots: { entries(slot: string): readonly unknown[] } | undefined, slot: string, owner: unknown): { matched: unknown; component: unknown } | null {
  if (slots === undefined) return null
  const entries = slots.entries(slot) as readonly ChainEntry[]
  for (const entry of entries) {
    const matched = entry.select?.(owner)
    if (matched !== null && matched !== undefined) {
      return { matched, component: entry.component }
    }
  }
  return null
}

function renderHoverChain(slots: { entries(slot: string): readonly unknown[] } | undefined, owner: { descriptor: ReferenceDescriptor; signal: AbortSignal; workspace?: ReferenceWorkspaceRef }) {
  const elected = electChain(slots, 'reference.hover.content', owner)
  if (elected === null) return null
  return createElement(elected.component as never, { matched: elected.matched, ...owner })
}

/**
 * renderRef：向内容方（reference.chip.decor chain）选举业务修饰；
 * 未认领 → null → 素 chip（干净降级）。视觉组件（StatusRefChip）与交互
 * handlers 由接线方持有，数据（matched）来自贡献方。
 */
function makeRenderRef(slots: { entries(slot: string): readonly unknown[] } | undefined, workspace: ReferenceWorkspaceRef | undefined) {
  return (segment: { descriptor: ReferenceDescriptor; label: string; raw: string; onActivate?: ((detail: never) => void) | undefined; onHoverStart?: ((d: ReferenceDescriptor, a: HTMLElement) => void) | undefined; onHoverEnd?: (() => void) | undefined }) => {
    const elected = electChain(slots, 'reference.chip.decor', { descriptor: segment.descriptor, workspace })
    if (elected === null) return null
    const decor = elected.matched as import('../../../src/hover/chip-decor').ReferenceChipDecor
    return createElement(StatusRefChip, {
      descriptor: segment.descriptor,
      label: segment.label,
      typeLabel: decor.typeLabel,
      status: decor.status,
      statusColor: decor.statusColor,
      statusBar: decor.statusBar === 'bind' ? undefined : decor.statusBar,
      decorations: decor.decorations as import('../../../src/index').RefDecorationSides | undefined,
      onActivate: segment.onActivate as never,
      onHoverStart: segment.onHoverStart as never,
      onHoverEnd: segment.onHoverEnd as never,
    })
  }
}

/* ====================== assistant 输出渲染 ====================== */

/** assistant 渲染器：文本块出 chip（含 2×2 状态组合），hover 面板消费贡献方内容。 */
export function DemoAssistantNode(props: Record<string, unknown>) {
  const node = props.node as { data: { blocks: ReadonlyArray<{ kind: string; text?: string }> } } | undefined
  const blocks = node?.data?.blocks ?? []
  const workspace = workspaceOf(typeof props.sessionId === 'string' ? props.sessionId : undefined)
  // hover 三件套（chip 与 panel）必须在同一个 ReferenceHoverProvider 子树内。
  return createElement(
    ReferenceHoverProvider,
    null,
    createElement(
      Fragment,
      null,
      blocks.map((block, index) => {
        if (block.kind === 'text' && typeof block.text === 'string') {
          return createElement(WireText, {
            key: index,
            text: block.text,
            as: 'div',
            renderRef: makeRenderRef(slotsRef, workspace),
            onActivate: (detail) => activateRef?.(detail, workspace),
          })
        }
        if (block.kind === 'reasoning') {
          return createElement('details', { key: index, 'data-demo-reasoning': '' }, '…')
        }
        return null
      }),
      createElement(ReferenceHoverPanel, {
        renderContent: (owner: { descriptor: ReferenceDescriptor; signal: AbortSignal }) =>
          renderHoverChain(slotsRef, { ...owner, ...(workspace ? { workspace } : {}) }),
      }),
    ),
  )
}

/* ====================== user 输入渲染 ====================== */

/** user 渲染器：输入消息同样 chip 化（右对齐气泡；demo 级保真）。 */
export function DemoUserNode(props: Record<string, unknown>) {
  const node = props.node as { data: { content: ReadonlyArray<{ type?: string; text?: string }> } } | undefined
  const blocks = node?.data?.content ?? []
  const texts = blocks.filter((block) => block.type === 'text' && typeof block.text === 'string') as Array<{ text: string }>
  const workspace = workspaceOf(typeof props.sessionId === 'string' ? props.sessionId : undefined)
  return createElement(
    ReferenceHoverProvider,
    null,
    createElement(
      'div',
      { 'data-demo-user': '', style: { display: 'flex', justifyContent: 'flex-end', padding: '4px 0' } },
      createElement(
        'div',
        {
          'data-demo-user-bubble': '',
          style: {
            maxWidth: '78%', padding: '6px 12px', borderRadius: 12,
            background: 'rgba(127, 127, 127, .12)', border: '1px solid rgba(127, 127, 127, .25)',
            whiteSpace: 'pre-wrap', lineHeight: 1.55,
          },
        },
        texts.map((block, index) => createElement(WireText, {
          key: index,
          text: block.text,
          renderRef: makeRenderRef(slotsRef, workspace),
          onActivate: (detail) => activateRef?.(detail, workspace),
        })),
      ),
    ),
    createElement(ReferenceHoverPanel, {
      renderContent: (owner: { descriptor: ReferenceDescriptor; signal: AbortSignal }) =>
        renderHoverChain(slotsRef, { ...owner, ...(workspace ? { workspace } : {}) }),
    }),
  )
}

/* ====================== apply ====================== */

/** cordis 服务注入声明：缺一访问即 throw（client runner 严格访问面）。 */
export const inject = ['slots', 'workspaces']

export function apply(ctx: Record<string, unknown> & {
  effect?: (fn: () => unknown, label?: string) => unknown
}): void {
  if (typeof document === 'undefined') return
  ensureReferenceStyles(document)

  const slots = ctx.slots as {
    inject(slot: string, factory: () => unknown): unknown
    register(options: Record<string, unknown>, component: unknown): unknown
    entries(slot: string): readonly unknown[]
  } | undefined
  if (slots === undefined) return
  slotsRef = slots
  workspacesRef = (ctx as { workspaces?: WorkspaceListFace }).workspaces
  const rootCtx = (ctx as unknown as { root?: unknown }).root ?? ctx
  activateRef = (detail, workspace) => {
    void dispatchReferenceOpen(rootCtx as never, workspace ? { ...detail, workspace } : detail)
  }

  // assistant-step + user 双渲染器（shadowing rank -1：官方默认 0，低者渲染）；
  // 组件为模块级稳定身份（不可用 HOC 注入，见 slotsRef 注释）。
  // children 声明 = 授权内容方注入这两个 chain slot（未声明时贡献方注册静默不执行）。
  const demoChatChildren = {
    'reference.hover.content': { kind: 'chain', scope: 'root' },
    'reference.chip.decor': { kind: 'chain', scope: 'root' },
  }
  ctx.effect?.(() => slots.inject('conversation.chat.node', () =>
    slots.register(
      { name: 'conversation.chat.node', key: 'assistant-step', priority: -1, children: demoChatChildren },
      DemoAssistantNode,
    )), 'demo: assistant renderer')
  ctx.effect?.(() => slots.inject('conversation.chat.node', () =>
    slots.register(
      { name: 'conversation.chat.node', key: 'user', priority: -1, children: demoChatChildren },
      DemoUserNode,
    )), 'demo: user renderer')
}
