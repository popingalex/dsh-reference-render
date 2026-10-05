// @vitest-environment jsdom
import { useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { normalizeReference, type ReferenceDescriptor } from '../src/descriptor'
import { ReferenceChip } from '../src/react'
import {
  ReferenceHoverPanel,
  ReferenceHoverProvider,
  useReferenceHover,
  type ReferenceHoverOwnerProps,
} from '../src/hover'

const descriptor = normalizeReference({ uri: 'dsh-ref:issue:I-1', label: 'I-1' })!
const other = normalizeReference({ uri: 'dsh-ref:issue:I-2', label: 'I-2' })!

function Harness(props: {
  renderContent: (owner: ReferenceHoverOwnerProps) => React.ReactNode
  secondDescriptor?: ReferenceDescriptor
}) {
  const hover = useReferenceHover()
  return (
    <>
      <ReferenceChip
        descriptor={descriptor}
        onHoverStart={(d, anchor) => hover.hoverStart(d, anchor)}
        onHoverEnd={() => hover.hoverEnd()}
      />
      {props.secondDescriptor !== undefined && (
        <ReferenceChip
          descriptor={props.secondDescriptor}
          onHoverStart={(d, anchor) => hover.hoverStart(d, anchor)}
          onHoverEnd={() => hover.hoverEnd()}
        />
      )}
      <ReferenceHoverPanel renderContent={props.renderContent} />
    </>
  )
}

function panel(): HTMLElement | null {
  return document.querySelector('[data-reference-hover-panel]')
}

describe('ReferenceHover（状态机 + reference.hover.content 选择面）', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('pointer enter 后 debounce 到期才打开，renderContent 收到 descriptor 与 signal', () => {
    const renderContent = vi.fn((owner: ReferenceHoverOwnerProps) => <div>预览内容 {owner.descriptor.uri}</div>)
    render(
      <ReferenceHoverProvider>
        <Harness renderContent={renderContent} />
      </ReferenceHoverProvider>,
    )
    fireEvent.mouseOver(screen.getByRole('button', { name: 'I-1' }))
    expect(panel()).toBeNull()
    act(() => vi.advanceTimersByTime(250))
    expect(panel()).not.toBeNull()
    expect(screen.getByText(/预览内容/)).toBeDefined()
    const owner = renderContent.mock.calls[0]![0] as ReferenceHoverOwnerProps
    expect(owner.descriptor.uri).toBe('dsh-resource://issue/I-1')
    expect(owner.signal.aborted).toBe(false)
  })

  it('宽限期内 leave 取消打开（debounce 未到即离开 → 永不打开）', () => {
    const renderContent = vi.fn(() => <div>x</div>)
    render(
      <ReferenceHoverProvider>
        <Harness renderContent={renderContent} />
      </ReferenceHoverProvider>,
    )
    fireEvent.mouseOver(screen.getByRole('button', { name: 'I-1' }))
    fireEvent.mouseOut(screen.getByRole('button', { name: 'I-1' }))
    act(() => vi.advanceTimersByTime(1000))
    expect(panel()).toBeNull()
    expect(renderContent).not.toHaveBeenCalled()
  })

  it('已打开时换锚点立即切换，旧 signal 立即 abort（stale 抑制）', () => {
    const renderContent = vi.fn((owner: ReferenceHoverOwnerProps) => <div>{owner.descriptor.uri}</div>)
    render(
      <ReferenceHoverProvider>
        <Harness renderContent={renderContent} secondDescriptor={other} />
      </ReferenceHoverProvider>,
    )
    fireEvent.mouseOver(screen.getByRole('button', { name: 'I-1' }))
    act(() => vi.advanceTimersByTime(250))
    const firstSignal = (renderContent.mock.calls[0]![0] as ReferenceHoverOwnerProps).signal
    fireEvent.mouseOver(screen.getByRole('button', { name: 'I-2' }))
    expect(screen.getByText('dsh-resource://issue/I-2')).toBeDefined()
    expect(firstSignal.aborted).toBe(true)
    const secondSignal = (renderContent.mock.lastCall![0] as ReferenceHoverOwnerProps).signal
    expect(secondSignal.aborted).toBe(false)
  })

  it('anchor→panel 宽限：leave 后 grace 内 panel hold 保活，resume 后 grace 到期关闭', () => {
    const renderContent = vi.fn(() => <div>x</div>)
    render(
      <ReferenceHoverProvider>
        <Harness renderContent={renderContent} />
      </ReferenceHoverProvider>,
    )
    const chip = screen.getByRole('button', { name: 'I-1' })
    fireEvent.mouseOver(chip)
    act(() => vi.advanceTimersByTime(250))
    expect(panel()).not.toBeNull()

    fireEvent.mouseOut(chip)
    act(() => vi.advanceTimersByTime(100)) // grace=150 未到
    expect(panel()).not.toBeNull()
    fireEvent.mouseOver(panel()!) // hold
    act(() => vi.advanceTimersByTime(1000))
    expect(panel()).not.toBeNull()

    fireEvent.mouseOut(panel()!) // resume
    act(() => vi.advanceTimersByTime(150))
    expect(panel()).toBeNull()
  })

  it('关闭（grace 到期）时 signal abort', () => {
    const renderContent = vi.fn((_owner: ReferenceHoverOwnerProps) => <div>x</div>)
    render(
      <ReferenceHoverProvider>
        <Harness renderContent={renderContent} />
      </ReferenceHoverProvider>,
    )
    const chip = screen.getByRole('button', { name: 'I-1' })
    fireEvent.mouseOver(chip)
    act(() => vi.advanceTimersByTime(250))
    const signal = (renderContent.mock.calls[0]![0] as ReferenceHoverOwnerProps).signal
    fireEvent.mouseOut(chip)
    act(() => vi.advanceTimersByTime(150))
    expect(signal.aborted).toBe(true)
  })

  it('Escape 立即关闭并把焦点还给 anchor', () => {
    const renderContent = vi.fn(() => <div>x</div>)
    render(
      <ReferenceHoverProvider>
        <Harness renderContent={renderContent} />
      </ReferenceHoverProvider>,
    )
    const chip = screen.getByRole('button', { name: 'I-1' })
    fireEvent.mouseOver(chip)
    act(() => vi.advanceTimersByTime(250))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(panel()).toBeNull()
    expect(document.activeElement).toBe(chip)
  })

  it('全 consumer decline（renderContent 返回 null）→ 无面板、无坏 UI', () => {
    const renderContent = vi.fn(() => null)
    render(
      <ReferenceHoverProvider>
        <Harness renderContent={renderContent} />
      </ReferenceHoverProvider>,
    )
    fireEvent.mouseOver(screen.getByRole('button', { name: 'I-1' }))
    act(() => vi.advanceTimersByTime(250))
    expect(panel()).toBeNull()
  })

  it('chip 的 hover 事件携带 descriptor 与 anchor 元素', () => {
    const onHoverStart = vi.fn()
    render(<ReferenceChip descriptor={descriptor} onHoverStart={onHoverStart} />)
    const chip = screen.getByRole('button', { name: 'I-1' })
    fireEvent.mouseOver(chip)
    expect(onHoverStart).toHaveBeenCalledWith(descriptor, chip)
  })

  it('hover 内容 provider 抛错 → 面板不渲染，会话面不受影响', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const renderContent = vi.fn(() => {
      throw new Error('provider boom')
    })
    render(
      <ReferenceHoverProvider>
        <Harness renderContent={renderContent} />
      </ReferenceHoverProvider>,
    )
    fireEvent.mouseOver(screen.getByRole('button', { name: 'I-1' }))
    act(() => vi.advanceTimersByTime(250))
    expect(panel()).toBeNull()
    expect(screen.getByRole('button', { name: 'I-1' })).toBeDefined()
    errorSpy.mockRestore()
  })

  it('面板打开中卸载 provider → 在途 signal abort（dispose during async request）', () => {
    const renderContent = vi.fn((_owner: ReferenceHoverOwnerProps) => <div>x</div>)
    const view = render(
      <ReferenceHoverProvider>
        <Harness renderContent={renderContent} />
      </ReferenceHoverProvider>,
    )
    fireEvent.mouseOver(screen.getByRole('button', { name: 'I-1' }))
    act(() => vi.advanceTimersByTime(250))
    const signal = (renderContent.mock.calls[0]![0] as ReferenceHoverOwnerProps).signal
    expect(signal.aborted).toBe(false)
    view.unmount()
    expect(signal.aborted).toBe(true)
  })

  it('取数迟于换锚到达 → 陈旧结果不得渲染（provider timeout / stale result）', async () => {
    // 贡献方模式：异步取数，只依赖契约——迟到结果仅在 signal 未 abort 时提交。
    function AsyncHoverContent(props: { owner: ReferenceHoverOwnerProps; delay: number }): React.ReactNode {
      const [body, setBody] = useState<string | undefined>()
      useEffect(() => {
        const owner = props.owner
        setTimeout(() => {
          if (!owner.signal.aborted) setBody(owner.descriptor.uri)
        }, props.delay)
      }, [props.owner])
      return body === undefined ? null : <div data-hover-body="">{body}</div>
    }
    const seen: ReferenceHoverOwnerProps[] = []
    const renderContent = (owner: ReferenceHoverOwnerProps) => {
      seen.push(owner)
      return <AsyncHoverContent owner={owner} delay={owner.descriptor.label === 'I-1' ? 500 : 10} />
    }
    render(
      <ReferenceHoverProvider>
        <Harness renderContent={renderContent} secondDescriptor={other} />
      </ReferenceHoverProvider>,
    )
    fireEvent.mouseOver(screen.getByRole('button', { name: 'I-1' }))
    act(() => vi.advanceTimersByTime(250))
    fireEvent.mouseOver(screen.getByRole('button', { name: 'I-2' }))
    await act(async () => {
      vi.advanceTimersByTime(10)
    })
    expect(screen.getByText('dsh-resource://issue/I-2')).toBeDefined()
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    const bodies = document.querySelectorAll('[data-hover-body]')
    expect(bodies).toHaveLength(1)
    expect(bodies[0]!.textContent).toBe('dsh-resource://issue/I-2')
    expect(seen.find((owner) => owner.descriptor.label === 'I-1')!.signal.aborted).toBe(true)
  })
})
