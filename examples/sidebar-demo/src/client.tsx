/**
 * dsh-reference-render-sidebar-demo — 内容贡献方示例插件（dsh-reference-render 官方示例）。
 *
 * 与 dsh-reference-render-demo（渲染接线）演示多插件协作：本插件不理解渲染接线，
 * 只围绕 domain-neutral 引用契约贡献内容——
 *  1. 资源详情页：三个协议的 ResourceProvider（帧流）+ 资源 tab 定义 +
 *     useResource body/title；reference/open 接管 → ctx.sidebarRight.openResource。
 *  2. 悬浮预览：向 `reference.hover.content` chain slot 贡献 entry
 *     （select 认领 demo 域地址；渲染接线插件负责消费选举）。
 *
 * demo 域假数据（真插件里这里来自各自 canonical 服务）。
 * 构建期相对打包 dsh-reference-render 源码；生产宿主应改为正常 npm 依赖。
 */
import { createElement } from 'react'
import { referenceHandled } from '../../../src/index'
import type { ReferenceChipDecor } from '../../../src/hover/chip-decor'
import type { ReferenceDescriptor } from '../../../src/index'

interface DemoDomainEntry {
  kind: string
  id: string
  typeLabel: string
  summary: string
  /** 展示用状态词；undefined= 无状态点（2×2 组合的"无点"行）。 */
  status?: string
  /** 状态点用色。 */
  statusColor?: string
  /** 左状态条独立控制：'bind'=随点（缺省语义），null=无条，色值=独立条色。 */
  statusBar?: 'bind' | null | string
  /**
   * true：内容跟工作区走，只在 `reference/open` 带 workspace 时认领。
   * false：内容不跟工作区，只在事件没有 workspace 时认领。
   */
  workspaceBound: boolean
  /** 广义装饰（点/条/图标 × 左右位，每侧各最多 3 个）；与便捷字段叠加。 */
  decorations?: {
    left?: Array<Record<string, unknown>>
    right?: Array<Record<string, unknown>>
  }
}

/** 2×2 对照域表：状态点 × 状态条 四种组合各一例，外加服务发现一例。 */
export const DEMO_DOMAINS: Record<string, DemoDomainEntry> = {
  'deployment/DEP-207': { kind: 'deployment', id: 'DEP-207', typeLabel: '部署', summary: '部署 DEP-207 已完成，服务健康检查通过。', status: 'succeeded', statusColor: '#4caf50', statusBar: 'bind', workspaceBound: true },
  'report/VR-88': { kind: 'report', id: 'VR-88', typeLabel: '验证', summary: '验证运行 VR-88：全部断言 PASS。', status: 'passed', statusColor: '#4caf50', statusBar: null, workspaceBound: true },
  'evidence/EV-15': { kind: 'evidence', id: 'EV-15', typeLabel: '记录', summary: '证据 EV-15：日志摘录（含校验和）。', statusBar: '#64b5f6', workspaceBound: true },
  'service/SRV-1': { kind: 'service', id: 'SRV-1', typeLabel: '服务', summary: '服务 SRV-1 在线，探针 3/3 通过。', status: 'live', statusColor: '#64b5f6', statusBar: 'bind', workspaceBound: false },
  // 图标装饰三例：SVG tint（color 缺省跟随系统文本）/ 原色图片 / 六位全满
  'knowledge/KN-ICON': { kind: 'knowledge', id: 'KN-ICON', typeLabel: '知识', summary: '知识卡片 KN-ICON：SVG 图标 tint 模式，未设色=跟随系统文本色。', statusBar: '#64b5f6', workspaceBound: true,
    decorations: { left: [{ kind: 'icon', src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M8 1l2.1 4.9L15 7l-4 3.4L12.2 15 8 12.3 3.8 15 5 10.4 1 7l4.9-1.1z'/%3E%3C/svg%3E" }, { kind: 'bar', color: '#64b5f6' }] } },
  'asset/PIC-1': { kind: 'asset', id: 'PIC-1', typeLabel: '素材', summary: '素材 PIC-1：彩色图片图标（image 模式，原色渲染）。', status: 'ready', statusColor: '#4caf50', workspaceBound: true,
    decorations: { right: [{ kind: 'dot', color: '#4caf50' }, { kind: 'icon', src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect x='1' y='2' width='14' height='11' rx='2' fill='%234dabf7'/%3E%3Ccircle cx='5.5' cy='6' r='1.6' fill='%23ffd43b'/%3E%3Cpath d='M2 11l3.5-3.5 2.5 2.5 3-3 3 4z' fill='%2374c0fc'/%3E%3C/svg%3E", mode: 'image', size: 12 }] } },
  'plan/PLAN-9': { kind: 'plan', id: 'PLAN-9', typeLabel: '计划', summary: '计划 PLAN-9：前后各 3 个装饰（2×3 六位全满）。', status: 'active', statusColor: '#ffb74d', statusBar: null, workspaceBound: true,
    decorations: {
      left: [{ kind: 'icon', src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect x='2' y='2' width='12' height='12' rx='2'/%3E%3C/svg%3E" }, { kind: 'bar', color: '#64b5f6' }, { kind: 'dot', color: '#4caf50' }],
      right: [{ kind: 'bar', color: '#4caf50' }, { kind: 'icon', src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='5'/%3E%3C/svg%3E" }, { kind: 'dot', color: '#ffb74d' }],
    } },
}

/** 工作区关联的条目只认带 workspace 的打开；不关联的条目只认没有 workspace 的打开。 */
export function claimsDomain(
  entry: DemoDomainEntry | undefined,
  workspace: { id: string } | undefined,
): boolean {
  if (entry === undefined) return false
  return entry.workspaceBound ? workspace !== undefined : workspace === undefined
}

export function addressOf(descriptor: ReferenceDescriptor): string {
  return descriptor.uri.replace('dsh-resource://', '')
}

export function domainOf(descriptor: ReferenceDescriptor): DemoDomainEntry | undefined {
  return DEMO_DOMAINS[addressOf(descriptor)]
}

/* ============================== 悬浮预览贡献 ============================== */

/** 贡献方 hover 卡片（chain slot entry 的 component；由渲染接线插件消费选举）。 */
export function DemoHoverCard(props: Record<string, unknown>) {
  const descriptor = props.descriptor as ReferenceDescriptor
  const domain = domainOf(descriptor)
  if (domain === undefined) return null
  return createElement(
    'div',
    { 'data-demo-hover': addressOf(descriptor) },
    createElement(
      'strong',
      null,
      ...(domain.statusColor !== undefined ? [createElement('span', {
        'data-demo-status-dot': '',
        style: { display: 'inline-block', width: 7, height: 7, borderRadius: 999, background: domain.statusColor, marginRight: 5, verticalAlign: 'middle' },
      })] : []),
      `${domain.typeLabel} ${domain.id} `,
    ),
    createElement('span', { style: { opacity: 0.75 } }, domain.status !== undefined ? `(${domain.status})` : '(无状态)'),
    createElement('div', null, domain.summary),
  )
}

/* ============================== 资源详情页 ============================== */

interface RemoteFailureLike {
  name: string
  message: string
  code: string
  details: Record<string, unknown>
  isDSHRemoteError: boolean
}

function demoFailure(message: string): RemoteFailureLike {
  return { name: 'RemoteError', message, code: 'gateway/not-found', details: {}, isDSHRemoteError: true }
}

type Frame = { ok: true; value: DemoDomainEntry & { revision: number } } | { ok: false; error: RemoteFailureLike }

/** 一个 demo 协议的帧流 provider（首帧=当前内容；abort 即刻终止）。 */
function makeProvider(kind: string) {
  return {
    protocol: kind,
    async *open(address: string, openCtx: { signal: AbortSignal }): AsyncGenerator<Frame> {
      const entry = DEMO_DOMAINS[address.replace('dsh-resource://', '')]
      if (entry === undefined) {
        yield { ok: false, error: demoFailure(`demo: unknown address ${address}`) }
        return
      }
      if (openCtx.signal.aborted) return
      yield { ok: true, value: { ...entry, revision: 1 } }
      await new Promise<void>((resolve) => {
        openCtx.signal.addEventListener('abort', () => resolve(), { once: true })
      })
    },
  }
}

/** 资源 tab body：useResource 四态视图。 */
export function DemoResourceBody(props: Record<string, unknown>) {
  const useTabInfo = props.useTabInfo as (() => { tab: { navigation: { address: string } } }) | undefined
  const useResource = props.useResource as ((address: string) => { status: string; value: unknown }) | undefined
  if (useTabInfo === undefined || useResource === undefined) {
    return createElement('div', { 'data-demo-resource': 'unwired' }, 'demo resource body')
  }
  const address = useTabInfo().tab.navigation.address
  const snapshot = useResource(address)
  const entry = snapshot.value as (DemoDomainEntry & { revision: number }) | undefined
  const hasValue = entry !== undefined && (snapshot.status === 'live' || snapshot.status === 'ok')
  return createElement(
    'div',
    { 'data-demo-resource': address },
    createElement(
      'div',
      { 'data-demo-resource-status': snapshot.status },
      hasValue ? `${entry.typeLabel} ${entry.id} · ${entry.status ?? '无状态'}` : `${snapshot.status}…`,
    ),
    hasValue ? createElement('div', null, entry.summary) : null,
  )
}

/** tab 标题（address 尾段）。 */
export function DemoResourceTitle(props: Record<string, unknown>) {
  const useTabInfo = props.useTabInfo as (() => { tab: { navigation: { address: string } } }) | undefined
  const address = useTabInfo?.().tab.navigation.address ?? ''
  const id = address.split('/').pop() ?? address
  return createElement('span', { 'data-demo-resource-title': address }, `资源 ${id}`)
}

const DEMO_TAB_ID = 'dsh-reference-render-sidebar-demo/resource-object'

/* ============================== apply ============================== */

/** cordis 服务注入声明：缺一访问即 throw（client runner 严格访问面）。 */
export const inject = ['slots', 'sidebarRight', 'resources', 'sidebarRightTabs']

export function apply(ctx: Record<string, unknown> & {
  effect?: (fn: () => unknown, label?: string) => unknown
}): void {
  const slots = ctx.slots as {
    inject(slot: string, factory: () => unknown): unknown
    register(options: Record<string, unknown>, component: unknown): unknown
  } | undefined
  const typedCtx = ctx as unknown as {
    on(event: string, handler: (payload: { descriptor: ReferenceDescriptor }) => unknown): unknown
    sidebarRight?: { openResource(address: string): void }
    resources?: { register(provider: unknown): unknown }
    sidebarRightTabs?: { register(definition: unknown): unknown }
    effect(fn: () => unknown, label?: string): unknown
  }

  // 1) 资源 provider ×4
  typedCtx.resources?.register(makeProvider('deployment'))
  typedCtx.resources?.register(makeProvider('report'))
  typedCtx.resources?.register(makeProvider('evidence'))
  typedCtx.resources?.register(makeProvider('service'))

  // 2) 资源 tab 定义 + body/title
  typedCtx.sidebarRightTabs?.register({
    id: DEMO_TAB_ID,
    kind: 'demo-reference-object',
    patterns: ['dsh-resource://deployment/**', 'dsh-resource://report/**', 'dsh-resource://evidence/**', 'dsh-resource://service/**'],
    multiple: true,
    title: (address: string) => `资源 ${address.split('/').pop() ?? address}`,
  })
  if (slots !== undefined) {
    ctx.effect?.(() => slots.inject('sidebar.right.pane.tab', () =>
      slots.register({ name: 'sidebar.right.pane.tab', key: DEMO_TAB_ID }, DemoResourceBody)), 'sidebar-demo: tab body')
    ctx.effect?.(() => slots.inject('sidebar.right.pane.tab.title', () =>
      slots.register({ name: 'sidebar.right.pane.tab.title', key: DEMO_TAB_ID }, DemoResourceTitle)), 'sidebar-demo: tab title')
    // 3) chip 修饰贡献（reference.chip.decor chain：状态点/色条等业务修饰数据）
    // 与悬浮预览贡献（reference.hover.content chain）；消费= 渲染接线插件的手工选举
    ctx.effect?.(() => slots.inject('reference.chip.decor', () =>
      slots.register(
        { name: 'reference.chip.decor', select: (owner: { descriptor: ReferenceDescriptor; workspace?: { id: string } }) => {
          const domain = domainOf(owner.descriptor)
          if (domain === undefined || !claimsDomain(domain, owner.workspace)) return null
          const decor: ReferenceChipDecor = {
            typeLabel: domain.typeLabel,
            status: domain.status,
            statusColor: domain.statusColor,
            statusBar: domain.statusBar,
            decorations: domain.decorations as ReferenceChipDecor['decorations'],
          }
          return decor
        } },
        // decor entry 的 component 不被消费方渲染（matched 即数据）——放空组件占位
        function DecorData(): null { return null },
      )), 'sidebar-demo: chip decor')

    ctx.effect?.(() => slots.inject('reference.hover.content', () =>
      slots.register(
        { name: 'reference.hover.content', select: (owner: { descriptor: ReferenceDescriptor; workspace?: { id: string } }) => claimsDomain(domainOf(owner.descriptor), owner.workspace) ? {} : null },
        DemoHoverCard,
      )), 'sidebar-demo: hover content')
  }

  // 4) 激活接管：demo 域 → sidebarRight.openResource
  typedCtx.on('reference/open', (payload: { descriptor: ReferenceDescriptor; workspace?: { id: string } }) => {
    if (!claimsDomain(domainOf(payload.descriptor), payload.workspace)) return undefined
    typedCtx.sidebarRight?.openResource(payload.descriptor.uri)
    return referenceHandled()
  })
}
