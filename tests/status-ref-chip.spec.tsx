// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { normalizeReference } from '../src/descriptor'
import { StatusRefChip } from '../src/react/StatusRefChip'

afterEach(cleanup)

const descriptor = normalizeReference({ uri: 'dsh-ref:issue:I-1', label: 'I-1' })!

describe('StatusRefChip（单一视觉出口）', () => {
  it('renders type label + label + business status dot', () => {
    render(<StatusRefChip descriptor={descriptor} typeLabel="事务" label="I-1" status="open" />)
    const button = screen.getByRole('button')
    expect(button.className.split(' ')).toContain('dsh-ref-chip')
    expect(button.textContent).toContain('事务')
    expect(button.textContent).toContain('I-1')
    expect(button.querySelector('[data-ref-chip-status="open"]')).toBeDefined()
  })

  it('suppresses the type label when it equals the display text', () => {
    render(<StatusRefChip descriptor={descriptor} typeLabel="I-1" label="I-1" status="open" />)
    const button = screen.getByRole('button')
    expect(button.querySelector('[data-ref-chip-kind]')).toBeNull()
  })

  it('suppresses the type label when the label starts with it（部署 部署 D101 去重）', () => {
    render(<StatusRefChip descriptor={descriptor} typeLabel="部署" label="部署 D101" status="done" />)
    const button = screen.getByRole('button')
    expect(button.querySelector('[data-ref-chip-kind]')).toBeNull()
    expect(button.textContent).toContain('部署 D101')
    expect(button.querySelector('[data-ref-chip-status="done"]')).toBeDefined()
  })

  it('解析失败/无业务状态 → 不显示状态点（404 不是状态）', () => {
    render(<StatusRefChip descriptor={descriptor} typeLabel="部署" label="部署 D101" />)
    const button = screen.getByRole('button')
    expect(button.querySelector('[data-ref-chip-status]')).toBeNull()
  })

  it('delegates activation to onActivate', () => {
    const onActivate = vi.fn()
    render(<StatusRefChip descriptor={descriptor} label="I-1" status="open" onActivate={onActivate} />)
    screen.getByRole('button').click()
    expect(onActivate).toHaveBeenCalledTimes(1)
    expect(onActivate.mock.calls[0]?.[0]?.descriptor?.uri).toBe('dsh-resource://issue/I-1')
  })
})

describe('StatusRefChip 2×2（状态点 × 状态条 正交组合）', () => {
  const base = { uri: 'dsh-resource://demo/X' }

  function chipProps(extra: Record<string, unknown>) {
    return { descriptor: normalizeReference(base)!, ...extra }
  }

  it('有点 + 有条（缺省绑定：条随点同色）', () => {
    const { container } = render(<StatusRefChip {...chipProps({ status: 'succeeded', statusColor: '#4caf50' })} />)
    const chip = container.querySelector('button')!
    expect(chip.querySelector('[data-ref-chip-status="succeeded"]')).not.toBeNull()
    expect(chip.getAttribute('data-ref-chip-status-bar')).toBe('#4caf50')
  })

  it('有点 + 无条（statusBar=null 显式关条）', () => {
    const { container } = render(<StatusRefChip {...chipProps({ status: 'passed', statusColor: '#4caf50', statusBar: null })} />)
    const chip = container.querySelector('button')!
    expect(chip.querySelector('[data-ref-chip-status="passed"]')).not.toBeNull()
    expect(chip.getAttribute('data-ref-chip-status-bar')).toBeNull()
    expect(chip.style.borderLeftColor).toBe('')
  })

  it('无点 + 有条（statusBar 独立给色）', () => {
    const { container } = render(<StatusRefChip {...chipProps({ statusBar: '#64b5f6' })} />)
    const chip = container.querySelector('button')!
    expect(chip.querySelector('[data-ref-chip-status]')).toBeNull()
    expect(chip.getAttribute('data-ref-chip-status-bar')).toBe('#64b5f6')
    expect(chip.style.borderLeftColor).toBe('rgb(100, 181, 246)')
  })

  it('无点 + 无条（两者皆缺省）', () => {
    const { container } = render(<StatusRefChip {...chipProps({})} />)
    const chip = container.querySelector('button')!
    expect(chip.querySelector('[data-ref-chip-status]')).toBeNull()
    expect(chip.getAttribute('data-ref-chip-status-bar')).toBeNull()
  })
})
