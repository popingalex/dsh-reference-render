/**
 * dsh-reference 的 typed Cordis 事件契约。
 *
 * 只声明并派发 `reference/open`：hover 内容选择走 chain slot
 * （见 hover/contract.ts），不建第二套 selection registry。
 *
 * dispatch mode：open 是"多插件可能接管、第一个处理成功者胜出、
 * 允许 async"→ `ctx.serial`（first-bail-wins）。decline = 返回 undefined/false/null；
 * listener throw 会向上传播（cordis serial 不吞错），调用方胶水层负责失败隔离。
 */
import type { Context } from '@deepseek-ai/cordis'
import type { ReferenceDescriptor } from './descriptor'

export type ReferenceActivation = 'keyboard' | 'pointer' | 'programmatic'

export interface ReferenceOpenContext {
  descriptor: ReferenceDescriptor
  activation: ReferenceActivation
}

export interface ReferenceOpenResult {
  readonly handled: true
}

// decline 值（undefined/false/null）进入返回类型：与 cordis isBailed 语义一致，
// listener 三者皆可表达"不接管"（"listener returns undefined to decline" 的放宽全集）。
export type ReferenceOpenReply =
  | Promise<ReferenceOpenResult | null | false | undefined>
  | ReferenceOpenResult
  | null
  | false
  | undefined

declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * 请求打开一个引用。serial 派发：listener 返回 non-null/false/undefined
     * 即视为接管并短路；全部 decline 时调用方保持默认行为（无操作）。
     * @mode serial
     */
    'reference/open'(context: ReferenceOpenContext): ReferenceOpenReply
  }
}

/** 派发 reference/open；undefined = 无人接管（走默认/无操作路径）。 */
export async function dispatchReferenceOpen(
  ctx: Context,
  context: ReferenceOpenContext,
): Promise<ReferenceOpenResult | undefined> {
  const result = await ctx.serial('reference/open', context)
  return result !== null && result !== false && result !== undefined ? result : undefined
}

/** listener 接管时的标准返回值。 */
export function referenceHandled(): ReferenceOpenResult {
  return { handled: true }
}
