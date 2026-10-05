/**
 * Example B — Plugin Contribution。
 *
 * 模拟 conversation（fake deployment / verification / evidence 域）：
 *   Deployment [DEP-207](dsh-ref:deployment:DEP-207) succeeded.
 *   Verification [VR-88](dsh-ref:report:VR-88) passed.
 *   Evidence [EV-15](dsh-ref:evidence:EV-15) was recorded.
 *
 * 证明：多个 provider 插件围绕同一个 domain-neutral reference protocol 协作，
 * renderer 不理解业务世界。本例用内存 slots 桩 + 真实 cordis serial 事件。
 */
import { createElement, type ReactNode } from 'react'
import {
  ReferenceHoverPanel,
  ReferenceHoverProvider,
  WireInteractionProvider,
  WireText,
  dispatchReferenceOpen,
  referenceHandled,
  scanWireReferences,
  useReferenceHover,
} from 'dsh-reference-render/runtime'
import type { Context } from '@deepseek-ai/cordis'

export const CONVERSATION_FIXTURE = [
  'Deployment [DEP-207](dsh-ref:deployment:DEP-207) succeeded.',
  'Verification [VR-88](dsh-ref:report:VR-88) passed.',
  'Evidence [EV-15](dsh-ref:evidence:EV-15) was recorded.',
].join('\n\n')

/** 贡献方插件的领域数据（fake——真插件里这里来自各自 canonical 服务）。 */
export const FAKE_DOMAINS: Record<string, { kind: string; id: string; summary: string; status: string }> = {
  'deployment/DEP-207': { kind: 'deployment', id: 'DEP-207', summary: 'Deploy to production fleet', status: 'succeeded' },
  'report/VR-88': { kind: 'report', id: 'VR-88', summary: 'Regression verification run', status: 'passed' },
  'evidence/EV-15': { kind: 'evidence', id: 'EV-15', summary: 'Log excerpt with checksum', status: 'recorded' },
}

/** 贡献方插件 client 半：hover 内容 + open 接管（一个真实插件会拆成 N 个）。 */
export function applyContribution(ctx: Context): () => void {
  // hover 内容贡献（真实插件用二段注册 ctx.slots.inject(name, () => ctx.slots.register(...))；
  // 本 demo 直接登记 entry，语义等价）
  const injectDisposer = ctxRegister(ctx, {
    name: 'reference.hover.content',
    select: (owner: unknown) => {
      const uri = (owner as { descriptor: { uri: string } }).descriptor.uri
      const address = uri.replace('dsh-resource://', '')
      return FAKE_DOMAINS[address] !== undefined ? {} : null
    },
    priority: 0,
  }, DomainHoverCard)
  // open 接管（typed serial；只认领自己认识的 kind）
  const offOpen = ctx.on('reference/open', ({ descriptor }) => {
    const address = descriptor.uri.replace('dsh-resource://', '')
    if (FAKE_DOMAINS[address] === undefined) return undefined
    return referenceHandled()
  })
  return () => { injectDisposer(); offOpen() }
}

type SlotEntry = { name: string; select: (owner: unknown) => unknown; priority?: number; component: unknown }

interface SlotsStub {
  injected?: Array<() => void>
  registered?: SlotEntry[]
}

/**
 * slots 面：真实 DSH client 由官方 ui-slots 服务提供（ctx.slots）。
 * 本例在裸 Context（无 ui-slots）时惰性建内存桩，语义与 ui-slots 最小对齐。
 */
function slotsOf(ctx: Context): SlotsStub {
  const host = ctx as unknown as { slots?: SlotsStub }
  host.slots ??= {}
  return host.slots
}

function ctxRegister(ctx: Context, options: Omit<SlotEntry, 'component'>, component: SlotEntry['component']): () => void {
  const entry: SlotEntry = { ...options, component }
  const slots = slotsOf(ctx)
  const registered = slots.registered ?? (slots.registered = [])
  registered.push(entry)
  return () => { slots.registered = registered.filter((existing) => existing !== entry) }
}

export function slotEntries(ctx: Context): SlotEntry[] {
  return (ctx as unknown as { slots: { registered?: SlotEntry[] } }).slots.registered ?? []
}

/** 贡献方 hover 卡片：按 descriptor 查 fake 域数据，provider 崩溃由宿主边界兜底。 */
export function DomainHoverCard({ owner }: { owner: { descriptor: { uri: string } } }): ReactNode {
  const address = owner.descriptor.uri.replace('dsh-resource://', '')
  const domain = FAKE_DOMAINS[address]
  if (domain === undefined) return null
  return createElement('div', { 'data-hover-domain': address },
    `${domain.kind} ${domain.id}: ${domain.summary} (${domain.status})`)
}

/** 模拟 conversation：三句 fixture 全走 WireText（renderer 不理解 deployment/report/evidence）。 */
export function ContributionDemo({ ctx }: { ctx: Context }): ReactNode {
  return (
    <ReferenceHoverProvider>
      <WireInteractionProvider value={{ onActivate: (detail) => void dispatchReferenceOpen(ctx, detail) }}>
        {CONVERSATION_FIXTURE.split('\n\n').map((paragraph, index) => (
          createElement('p', { key: index }, createElement(WireText, { text: paragraph })))
        )}
        <ReferenceHoverPanel
          renderContent={(owner) => {
            const entries = slotEntries(ctx)
            for (const entry of entries) {
              if (entry.select(owner) !== null && entry.component === DomainHoverCard) {
                return createElement(DomainHoverCard as never, { owner })
              }
            }
            return null
          }}
        />
      </WireInteractionProvider>
    </ReferenceHoverProvider>
  )
}

export function fixtureReferenceCount(): number {
  return scanWireReferences(CONVERSATION_FIXTURE).length
}

void useReferenceHover
