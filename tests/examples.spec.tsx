/**
 * Examples 的可执行验收（CI 中真正运行）：
 *  - Example A：text → parse → chip → hover（无业务域）
 *  - Example B：多 provider 围绕 domain-neutral protocol 协作（真实 cordis serial）
 */
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import { Context } from '@deepseek-ai/cordis'
import { createElement } from 'react'
import { MinimalReferenceDemo, countReferences, DEMO_TEXT, exampleDescriptor } from '../examples/minimal/src/demo'
import {
  ContributionDemo,
  applyContribution,
  fixtureReferenceCount,
  slotEntries,
} from '../examples/contribution/src/plugin'
import { dispatchReferenceOpen, normalizeReference, useReferenceHover } from '../src/index'
import type { Context as CordisContext } from '@deepseek-ai/cordis'

describe('Example A — minimal reference', () => {
  it('parses exactly one reference out of the demo text', () => {
    expect(countReferences(DEMO_TEXT)).toBe(1)
    expect(exampleDescriptor().uri).toBe('dsh-resource://report/RP-42')
  })

  it('renders inline chip and opens hover preview with content', async () => {
    vi.useFakeTimers()
    const { container } = render(createElement(MinimalReferenceDemo, {}))
    const chip = container.querySelector('button.dsh-ref-chip')!
    expect(chip.textContent).toBe('RP-42')
    act(() => { fireEvent.mouseEnter(chip) })
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    const panel = container.querySelector('[data-reference-hover-panel]')
    expect(panel).not.toBeNull()
    expect(panel!.querySelector('[data-hover-report]')).not.toBeNull()
    expect(panel!.textContent).toContain('all checks passed')
    vi.useRealTimers()
  })

  it('activate dispatches reference/open on a real cordis context', async () => {
    const ctx = new Context() as CordisContext
    const handled = vi.fn((context: { descriptor: { uri: string } }) => { void context; return { handled: true } as const })
    ctx.on('reference/open', handled)
    const { container } = render(createElement(MinimalReferenceDemo, { ctx }))
    fireEvent.click(container.querySelector('button.dsh-ref-chip')!, { detail: 1 })
    expect(handled).toHaveBeenCalledTimes(1)
    const context = handled.mock.calls[0]![0] as { descriptor: { uri: string } }
    expect(context.descriptor.uri).toBe('dsh-resource://report/RP-42')
    expect(await dispatchReferenceOpen(ctx, { descriptor: exampleDescriptor(), activation: 'programmatic' }))
      .toEqual({ handled: true })
  })
})

describe('Example B — plugin contribution', () => {
  it('fixture carries three domain references', () => {
    expect(fixtureReferenceCount()).toBe(3)
  })

  it('contribution plugin registers one hover provider and claims its domains via serial', async () => {
    const ctx = new Context()
    const disposer = applyContribution(ctx as never)
    expect(slotEntries(ctx as never)).toHaveLength(1)
    // 未认领域 → decline（undefined）
    const unknown = normalizeReference({ uri: 'dsh-ref:knowledge:kn-1' })!
    expect(await dispatchReferenceOpen(ctx, { descriptor: unknown, activation: 'pointer' })).toBeUndefined()
    // 认领域 → handled
    const claimed = normalizeReference({ uri: 'dsh-ref:deployment:DEP-207' })!
    expect(await dispatchReferenceOpen(ctx, { descriptor: claimed, activation: 'pointer' })).toEqual({ handled: true })
    disposer()
  })

  it('renders all three fixtures as chips; hover preview resolves domain content by slot selection', async () => {
    vi.useFakeTimers()
    const ctx = new Context()
    applyContribution(ctx as never)
    const { container } = render(createElement(ContributionDemo, { ctx }))
    const chips = container.querySelectorAll('button.dsh-ref-chip')
    expect(chips).toHaveLength(3)
    expect([...chips].map((chip) => chip.textContent)).toEqual(['DEP-207', 'VR-88', 'EV-15'])
    // hover 到第一个 chip → chain slot select 命中 → 域内容渲染
    act(() => { fireEvent.mouseEnter(chips[0]!) })
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    const panel = container.querySelector('[data-reference-hover-panel]')
    expect(panel!.querySelector('[data-hover-domain="deployment/DEP-207"]')).not.toBeNull()
    vi.useRealTimers()
  })
})

void useReferenceHover
