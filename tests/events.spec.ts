import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { dispatchReferenceOpen, referenceHandled, type ReferenceOpenContext } from '../src/events'
import { normalizeReference } from '../src/descriptor'

function openContext(): ReferenceOpenContext {
  return {
    descriptor: normalizeReference({ uri: 'dsh-ref:issue:I-1', label: 'I-1' })!,
    activation: 'pointer',
  }
}

describe('reference/open（typed Cordis event，ctx.serial）', () => {
  it('no listener → undefined（无 consumer 时干净 no-op）', async () => {
    const ctx = new Context()
    expect(await dispatchReferenceOpen(ctx, openContext())).toBeUndefined()
    await ctx.fiber.dispose()
  })

  it('one handler → first-bail-wins 返回 handled', async () => {
    const ctx = new Context()
    ctx.on('reference/open', () => referenceHandled())
    expect(await dispatchReferenceOpen(ctx, openContext())).toEqual({ handled: true })
    await ctx.fiber.dispose()
  })

  it('decline（undefined / false / null）→ 继续问下一个 listener', async () => {
    const ctx = new Context()
    const later = vi.fn(() => referenceHandled())
    ctx.on('reference/open', () => undefined)
    ctx.on('reference/open', () => false)
    ctx.on('reference/open', () => null)
    ctx.on('reference/open', later)
    expect(await dispatchReferenceOpen(ctx, openContext())).toEqual({ handled: true })
    expect(later).toHaveBeenCalledOnce()
    await ctx.fiber.dispose()
  })

  it('registration order decides（先注册先询问）', async () => {
    const ctx = new Context()
    ctx.on('reference/open', () => referenceHandled())
    const second = vi.fn(() => referenceHandled())
    ctx.on('reference/open', second)
    await dispatchReferenceOpen(ctx, openContext())
    expect(second).not.toHaveBeenCalled()
    await ctx.fiber.dispose()
  })

  it('async listener supported', async () => {
    const ctx = new Context()
    ctx.on('reference/open', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      return referenceHandled()
    })
    expect(await dispatchReferenceOpen(ctx, openContext())).toEqual({ handled: true })
    await ctx.fiber.dispose()
  })

  it('listener throw 向上传播（serial 不吞错；胶水层负责隔离）', async () => {
    const ctx = new Context()
    ctx.on('reference/open', () => {
      throw new Error('boom')
    })
    await expect(dispatchReferenceOpen(ctx, openContext())).rejects.toThrow('boom')
    await ctx.fiber.dispose()
  })

  it('plugin unload removes the listener（cordis effect 生命周期）', async () => {
    const ctx = new Context()
    const fiber = ctx.plugin({
      apply: (scope) => {
        scope.on('reference/open', () => referenceHandled())
      },
    })
    await fiber
    expect(await dispatchReferenceOpen(ctx, openContext())).toEqual({ handled: true })
    await fiber.dispose()
    expect(await dispatchReferenceOpen(ctx, openContext())).toBeUndefined()
    await ctx.fiber.dispose()
  })
})
