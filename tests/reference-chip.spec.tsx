// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { normalizeReference } from '../src/descriptor'
import { REFERENCE_CHIP_CLASS, ReferenceChip } from '../src/react'

afterEach(cleanup)

const descriptor = normalizeReference({ uri: 'dsh-ref:issue:I-1', label: 'I-1' })!

describe('ReferenceChip（inline presentation）', () => {
  it('renders the label on an accessible button carrying the reference uri', () => {
    render(<ReferenceChip descriptor={descriptor} />)
    const button = screen.getByRole('button', { name: 'I-1' })
    expect(button.className.split(' ')).toContain(REFERENCE_CHIP_CLASS)
    expect(button.getAttribute('data-reference-uri')).toBe('dsh-resource://issue/I-1')
  })

  it('display fallback: label → title → metadata.alias → uri', () => {
    const titled = normalizeReference({ uri: 'dsh-ref:issue:I-2', title: 'Issue I-2' })!
    render(
      <>
        <ReferenceChip descriptor={titled} />
        <ReferenceChip descriptor={normalizeReference({ uri: 'dsh-resource://x/y' })!} />
      </>,
    )
    expect(screen.getByRole('button', { name: 'Issue I-2' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'dsh-resource://x/y' })).toBeDefined()
  })

  it('pointer click activates with activation=pointer', () => {
    const onActivate = vi.fn()
    render(<ReferenceChip descriptor={descriptor} onActivate={onActivate} />)
    fireEvent.click(screen.getByRole('button'), { detail: 1 })
    expect(onActivate).toHaveBeenCalledWith({ descriptor, activation: 'pointer' })
  })

  it('keyboard activation (Enter/Space → native click, detail=0) reports activation=keyboard', () => {
    const onActivate = vi.fn()
    render(<ReferenceChip descriptor={descriptor} onActivate={onActivate} />)
    const button = screen.getByRole('button')
    fireEvent.click(button) // fireEvent 生成的 click 无指针 detail，等价键盘激活路径
    expect(onActivate).toHaveBeenCalledWith({ descriptor, activation: 'keyboard' })
  })

  it('no onActivate → clean no-op（无 consumer 不产生坏 UI）', () => {
    render(<ReferenceChip descriptor={descriptor} />)
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow()
  })

  it('disabled chip never activates', () => {
    const onActivate = vi.fn()
    render(<ReferenceChip descriptor={descriptor} onActivate={onActivate} disabled />)
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button'), { detail: 1 })
    expect(onActivate).not.toHaveBeenCalled()
  })

  it('children override the display text', () => {
    render(
      <ReferenceChip descriptor={descriptor} onActivate={vi.fn()}>
        <strong>自定义</strong>
      </ReferenceChip>,
    )
    expect(screen.getByRole('button', { name: '自定义' })).toBeDefined()
  })
})
