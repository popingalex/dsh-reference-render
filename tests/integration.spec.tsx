/**
 * Integration contract tests（contribution contract + lifecycle/dispose）。
 *
 * 冻结点：
 *  - decorateChatNode：官方 keyed slot entries 原地装饰 + restores 干净回滚 + WeakSet 防重复；
 *  - WireText：text/ref 交错渲染、无 provider 时 hover/activate no-op、label 缺省链；
 *  - contribution：provider 贡献 hover 内容经 chain slot（ui-slots 真实例），
 *    provider 失败不炸对话面、async 结果不得覆盖更新 hover 目标（AbortSignal）。
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Context } from '@deepseek-ai/cordis'
import { StrictMode, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { decorateChatNode, WireText, CHAT_NODE_SLOT } from '../src/integration'
import { normalizeReference } from '../src/descriptor'

function fakeEntry(component: unknown, key = 'assistant-step') {
  return { options: { key }, component, inject: undefined as import('../src/integration/decorate-chat-node').ChatNodeEntryLike['inject'] }
}

function fakeCtx(...entries: ReturnType<typeof fakeEntry>[]) {
  return { slots: { entries: () => entries } } as never
}

describe('decorateChatNode', () => {
  function Inner(props: Record<string, unknown>) {
    return createElement('div', { 'data-testid': 'inner' }, String(props.text ?? ''))
  }

  it('identity (no wrap) leaves entries untouched and decorate is a no-op', () => {
    const entry = fakeEntry(Inner)
    const restore = decorateChatNode(fakeCtx(entry))
    expect(entry.component).toBe(Inner)
    restore()
  })

  it('wraps the target key component and restores cleanly on dispose', () => {
    const entry = fakeEntry(Inner)
    const Wrapped = (props: Record<string, unknown>) =>
      createElement('section', { 'data-testid': 'wrapped' }, createElement(Inner, props))
    const restore = decorateChatNode(fakeCtx(entry), { wrap: () => Wrapped as never })
    expect(entry.component).toBe(Wrapped)
    restore()
    expect(entry.component).toBe(Inner)
  })

  it('does not touch other keys', () => {
    const assistant = fakeEntry(Inner)
    const user = fakeEntry(Inner, 'user')
    const Wrapped = () => createElement('i')
    decorateChatNode(fakeCtx(assistant, user), { wrap: () => Wrapped as never })
    expect(assistant.component).toBe(Wrapped)
    expect(user.component).toBe(Inner)
  })

  it('double decoration is idempotent (WeakSet on original component)', () => {
    const entry = fakeEntry(Inner)
    const Wrapped = () => createElement('i')
    const wrap = vi.fn(() => Wrapped as never)
    const restore1 = decorateChatNode(fakeCtx(entry), { wrap })
    const restore2 = decorateChatNode(fakeCtx(entry), { wrap })
    expect(wrap).toHaveBeenCalledTimes(1)
    restore1()
    restore2()
    expect(entry.component).toBe(Inner)
  })

  it('injectFace merges over original inject result', () => {
    const entry = fakeEntry(Inner)
    entry.inject = () => ({ a: 1 })
    const restore = decorateChatNode(fakeCtx(entry), {
      injectFace: (_args, original) => ({ ...original, b: 2 }),
    })
    expect(entry.inject!()).toEqual({ a: 1, b: 2 })
    restore()
    expect(entry.inject!()).toEqual({ a: 1 })
  })
})

describe('WireText', () => {
  it('splits text and refs in order; chip label from wire label', () => {
    const { container } = render(
      <WireText text={'Build done. See [RP-42](dsh-ref:report:RP-42).'} />,
    )
    const chips = container.querySelectorAll('button.dsh-ref-chip')
    expect(chips).toHaveLength(1)
    expect(chips[0]!.textContent).toBe('RP-42')
    expect(chips[0]!.getAttribute('data-reference-uri')).toBe('dsh-resource://report/RP-42')
    expect(container.textContent).toContain('Build done. See')
  })

  it('no provider: activate and hover are clean no-ops (no crash)', () => {
    const { container } = render(<WireText text={'[X](dsh-ref:issue:X-1)'} />)
    const chip = container.querySelector('button')!
    expect(() => {
      fireEvent.click(chip)
      fireEvent.mouseEnter(chip)
      fireEvent.mouseLeave(chip)
    }).not.toThrow()
  })

  it('onActivate receives descriptor with pointer activation', () => {
    const onActivate = vi.fn()
    const { container } = render(<WireText text={'[X](dsh-ref:issue:X-1)'} onActivate={onActivate} />)
    fireEvent.click(container.querySelector('button')!, { detail: 1 })
    expect(onActivate).toHaveBeenCalledTimes(1)
    const detail = onActivate.mock.calls[0]![0]
    expect(detail.descriptor.uri).toBe('dsh-resource://issue/X-1')
    expect(detail.activation).toBe('pointer')
  })

  it('renderText hook renders text segments through host binding', () => {
    const { container } = render(
      <WireText
        text={'a [X](dsh-ref:issue:X-1) b'}
        renderText={(text) => createElement('em', { 'data-seg': text })}
      />,
    )
    expect(container.querySelectorAll('em')).toHaveLength(2)
  })
})

describe('provider failure isolation', () => {
  it('a crashing text provider degrades to fallback text; rest of the face stays alive', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(
      <WireText
        text={'crashme [X](dsh-ref:issue:X-1) tail'}
        renderText={(text) => {
          if (text.includes('crashme')) throw new Error('provider crash')
          return createElement('span', null, text)
        }}
      />,
    )
    expect(container.querySelector('button.dsh-ref-chip')).not.toBeNull()
    expect(container.textContent).toContain('crashme')
    expect(container.textContent).toContain('tail')
    spy.mockRestore()
  })

  it('serial event: first handler to take over wins; all decline → undefined', async () => {
    const ctx = new Context()
    const second = vi.fn()
    ctx.on('reference/open', () => ({ handled: true }) as const)
    ctx.on('reference/open', second)
    const { dispatchReferenceOpen } = await import('../src/events')
    const descriptor = normalizeReference({ uri: 'dsh-ref:issue:W-1' })!
    const result = await dispatchReferenceOpen(ctx, { descriptor, activation: 'programmatic' })
    expect(result).toEqual({ handled: true })
    expect(second).not.toHaveBeenCalled()
  })
})

// StrictMode 冒烟：装饰 + WireText + hover provider 在严格模式下无副作用告警崩坏
describe('StrictMode smoke', () => {
  it('WireText renders identically under StrictMode', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(
        createElement(StrictMode, null, createElement(WireText, { text: '[S](dsh-ref:issue:S-1)' })),
      )
    })
    expect(container.querySelectorAll('button.dsh-ref-chip')).toHaveLength(1)
    await act(async () => { root.unmount() })
    container.remove()
  })
})

void screen
void CHAT_NODE_SLOT

describe('WireText renderRef extension', () => {
  it('routes ref segments through renderRef; null falls back to default chip', () => {
    const seen: string[] = []
    const { container } = render(
      createElement(WireText, {
        text: '[A](dsh-ref:issue:A-1) mid [B](dsh-ref:build:B-2)',
        renderRef: (segment) => {
          seen.push(segment.descriptor.uri)
          if (segment.descriptor.kind === 'issue') {
            return createElement('em', { 'data-rich': '' }, segment.label)
          }
          return null
        },
      }),
    )
    expect(seen).toEqual(['dsh-resource://issue/A-1', 'dsh-resource://build/B-2'])
    expect(container.querySelector('em[data-rich]')?.textContent).toBe('A')
    expect(container.querySelectorAll('button.dsh-ref-chip')).toHaveLength(1)
    expect(container.querySelector('button.dsh-ref-chip')?.textContent).toBe('B')
  })
})
