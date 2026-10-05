/**
 * Example A — Minimal Reference。
 *
 * 证明：text → parse → inline reference → visual emphasis → hover。
 * 不依赖任何真实业务域（kind 是随意的 'report'）。
 */
import { createElement, type ReactNode } from 'react'
import {
  ReferenceHoverPanel,
  ReferenceHoverProvider,
  WireInteractionProvider,
  WireText,
  dispatchReferenceOpen,
  normalizeReference,
  scanWireReferences,
  useReferenceHover,
} from 'dsh-reference/runtime'
import type { Context } from '@deepseek-ai/cordis'
import type { ReferenceChipActivateDetail } from 'dsh-reference/runtime'

export const DEMO_TEXT = 'Build completed. See [RP-42](dsh-ref:report:RP-42) for details.'

export function countReferences(text: string): number {
  return scanWireReferences(text).length
}

export function exampleDescriptor() {
  return normalizeReference({ uri: 'dsh-ref:report:RP-42', label: 'RP-42' })!
}

/** 最小交互闭环：hover 有 preview，activate 经 dispatchReferenceOpen（ctx 可为测试桩）。 */
export function MinimalReferenceDemo({ ctx }: { ctx?: Context }): ReactNode {
  return (
    <ReferenceHoverProvider>
      <WireInteractionProvider value={{ onActivate: ctx ? (detail) => void dispatchReferenceOpen(ctx, detail) : undefined }}>
        <article>
          <WireText text={DEMO_TEXT} />
          <HoverPanel />
        </article>
      </WireInteractionProvider>
    </ReferenceHoverProvider>
  )
}

function HoverPanel(): ReactNode {
  useReferenceHover()
  return (
    <ReferenceHoverPanel
      renderContent={(owner) =>
        createElement('div', { 'data-hover-report': owner.descriptor.uri },
          `Report ${owner.descriptor.uri.slice('dsh-resource://'.length)}: all checks passed.`)
      }
    />
  )
}

export type { ReferenceChipActivateDetail }
