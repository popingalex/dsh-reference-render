/**
 * 双示例插件冒烟：conversation-demo（渲染接线）+ sidebar-demo（内容贡献方）。
 * 协作面：chip 修饰（reference.chip.decor）与 hover 内容（reference.hover.content）
 * 均由内容方经 chain slot 贡献，接线方手工选举——渲染与业务数据互不 import。
 */
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { normalizeReference } from '../src/index'
import { apply as applyWiring, DemoAssistantNode, DemoUserNode } from '../examples/conversation-demo/src/client'
import { apply as applyContent, DemoHoverCard, DEMO_DOMAINS } from '../examples/sidebar-demo/src/client'

function makeSlots() {
  const registered: Array<{ options: Record<string, unknown>; component: unknown }> = []
  const entriesBySlot: Record<string, unknown[]> = {}
  const effects: Array<() => unknown> = []
  const slots = {
    inject: (slot: string, factory: () => unknown) => {
      effects.push(factory as () => unknown)
      ;(factory as unknown as { __slot: string }).__slot = slot
    },
    register: (options: Record<string, unknown>, component: unknown) => {
      registered.push({ options, component })
      const slot = (options as { name: string }).name
      entriesBySlot[slot] ??= []
      entriesBySlot[slot]!.push({ options, component, select: (options as { select?: unknown }).select })
    },
    entries: (slot: string) => entriesBySlot[slot] ?? [],
  }
  const ctx = {
    slots,
    effect: (fn: () => unknown) => { effects.push(fn) },
    on: () => {},
    resources: { register: () => {} },
    sidebarRightTabs: { register: () => {} },
    sidebarRight: { openResource: () => {} },
  }
  const runAll = () => { for (const effect of effects) effect() }
  ;(ctx as unknown as { __slotsRef: unknown }).__slotsRef = entriesBySlot
  return { ctx, registered, entriesBySlot, runAll }
}

describe('conversation-demo（渲染接线）', () => {
  it('registers assistant + user renderers with shadowing rank -1', () => {
    const { ctx, registered, runAll } = makeSlots()
    applyWiring(ctx as never)
    runAll()
    const chat = registered.filter((entry) => entry.options.name === 'conversation.chat.node')
    expect(chat.map((entry) => entry.options.key).sort()).toEqual(['assistant-step', 'user'])
    expect(chat.every((entry) => entry.options.priority === -1)).toBe(true)
  })

  it('renders claimed refs as StatusRefChip via decor election and unclaimed as plain chip', () => {
    const { ctx, runAll } = makeSlots()
    applyContent(ctx as never)
    applyWiring(ctx as never)
    runAll()
    const node = {
      data: {
        blocks: [
          { kind: 'text', text: 'A [DEP-207](dsh-ref:deployment:DEP-207) and [MYST-1](dsh-ref:gadget:MYST-1).' },
        ],
      },
    }
    const { container } = render(
      createElement(DemoAssistantNode, { node }),
    )
    const chips = [...container.querySelectorAll('button.dsh-ref-chip')]
    expect(chips).toHaveLength(2)
    const claimed = chips.find((chip) => chip.textContent?.includes('DEP-207'))!
    expect(claimed.querySelector('[data-ref-chip-status="succeeded"]')).not.toBeNull()
    expect(claimed.getAttribute('data-ref-chip-status-bar')).toBe('#4caf50')
    const plain = chips.find((chip) => chip.textContent?.includes('MYST-1'))!
    expect(plain.querySelector('[data-ref-chip-status]')).toBeNull()
    expect(plain.getAttribute('data-ref-chip-status-bar')).toBeNull()
  })

  it('renders user input refs through the same decor election', () => {
    const { ctx, runAll } = makeSlots()
    applyContent(ctx as never)
    applyWiring(ctx as never)
    runAll()
    const node = {
      data: {
        content: [{ type: 'text', text: '请汇报 [VR-88](dsh-ref:report:VR-88)。' }],
      },
    }
    const { container } = render(createElement(DemoUserNode, { node }))
    expect(container.querySelector('[data-demo-user-bubble]')).not.toBeNull()
    const chip = container.querySelector('button.dsh-ref-chip')!
    expect(chip.textContent).toContain('VR-88')
    expect(chip.querySelector('[data-ref-chip-status="passed"]')).not.toBeNull()
    expect(chip.getAttribute('data-ref-chip-status-bar')).toBeNull() // 有点无条组合
  })

  it('hover panel content elects the contributor entry (content plugin owns domain data)', async () => {
    const { ctx, runAll } = makeSlots()
    applyContent(ctx as never)
    applyWiring(ctx as never)
    runAll()
    vi.useFakeTimers()
    const node = { data: { blocks: [{ kind: 'text', text: '[DEP-207](dsh-ref:deployment:DEP-207)' }] } }
    const { container } = render(createElement(DemoAssistantNode, { node }))
    const chip = container.querySelector('button.dsh-ref-chip')!
    act(() => { fireEvent.mouseEnter(chip) })
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    const panel = container.querySelector('[data-reference-hover-panel]')
    expect(panel?.querySelector('[data-demo-hover="deployment/DEP-207"]')).not.toBeNull()
    expect(panel?.textContent).toContain('部署 DEP-207')
    vi.useRealTimers()
  })
})

describe('sidebar-demo（内容贡献方）', () => {
  it('registers providers, tab definition/body/title, decor and hover entries', () => {
    const { ctx, registered, runAll } = makeSlots()
    applyContent(ctx as never)
    runAll()
    expect(registered.some((entry) => entry.options.name === 'sidebar.right.pane.tab')).toBe(true)
    expect(registered.some((entry) => entry.options.name === 'sidebar.right.pane.tab.title')).toBe(true)
    expect(registered.some((entry) => entry.options.name === 'reference.hover.content')).toBe(true)
    expect(registered.some((entry) => entry.options.name === 'reference.chip.decor')).toBe(true)
  })

  it('hover card claims exactly the demo domains and renders domain content', () => {
    expect(Object.keys(DEMO_DOMAINS)).toHaveLength(4)
    const descriptor = normalizeReference({ uri: 'dsh-ref:service:SRV-1' })!
    const { container } = render(createElement(DemoHoverCard, { descriptor }))
    expect(container.querySelector('[data-demo-hover="service/SRV-1"]')?.textContent).toContain('服务 SRV-1')
  })
})
