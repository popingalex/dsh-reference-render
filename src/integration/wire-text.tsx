/**
 * WireText — wire 分段渲染原语（contract: render-hook 公开消费面）。
 *
 * 把含 wire 引用的文本切成 text/ref 交错段：文本段交给宿主注入的渲染器
 * （如官方 MarkdownText 绑定），引用段渲染 chip。chip 的 hover/activate
 * 自动接线到（可选的）ReferenceInteractionProvider 提供的控制器；
 * 无 provider 时 hover/activate 干净 no-op（无 consumer 不产生坏 UI）。
 *
 * 流式安全：半截 wire link 不满足闭括号 → 整段按纯文本渲染（wire 语法
 * 结构保证），下一帧文本补全后自然升级为 chip。
 */
import { Component, createContext, Fragment, useContext, type ReactNode } from 'react'
import { splitWireSegments } from '../wire'
import { ReferenceChip, type ReferenceChipActivateDetail } from '../react/ReferenceChip'
import { useReferenceHover, type ReferenceHoverController } from '../hover/ReferenceHover'

export interface ReferenceInteractionBinding {
  /** 激活回调（通常由宿主绑到 dispatchReferenceOpen(ctx, …)）。 */
  onActivate?: ((detail: ReferenceChipActivateDetail) => void) | undefined
  /** hover 控制器（通常来自 ReferenceHoverProvider 的 useReferenceHover）。 */
  hover?: ReferenceHoverController | undefined
}

const WireInteractionContext = createContext<ReferenceInteractionBinding>({})

/** 作用域内 chip 的默认交互绑定（未提供 = no-op）。 */
export function WireInteractionProvider({
  value,
  children,
}: { value: ReferenceInteractionBinding; children: ReactNode }): ReactNode {
  return <WireInteractionContext.Provider value={value}>{children}</WireInteractionContext.Provider>
}

/** 引用段的自定义渲染入参（renderRef 消费面）：交互 handlers 已按作用域接好，转发给 chip 即可。 */
export interface WireRefSegment {
  descriptor: import('../descriptor').ReferenceDescriptor
  label: string
  raw: string
  onActivate?: ((detail: import('../react').ReferenceChipActivateDetail) => void) | undefined
  onHoverStart?: ((descriptor: import('../descriptor').ReferenceDescriptor, anchor: HTMLElement) => void) | undefined
  onHoverEnd?: (() => void) | undefined
}

export interface WireTextProps {
  /** 原始文本（可含 0..n 个 wire 引用）。 */
  text: string
  /** 文本段渲染器；缺省按纯文本 span（保留空白由宿主样式决定）。 */
  renderText?: ((text: string) => ReactNode) | undefined
  /**
   * 引用段渲染器（贡献方接入点）：缺省 ReferenceChip。宿主可用它把已知域
   * 的引用升级为 StatusRefChip 等富形态；返回 null 落回缺省 chip。
   */
  renderRef?: ((segment: WireRefSegment) => ReactNode) | undefined
  /** 覆盖作用域内的激活绑定（局部优先）。 */
  onActivate?: ((detail: ReferenceChipActivateDetail) => void) | undefined
  /** chip 附加类名。 */
  className?: string
  /** 引用与文本段的包裹元素（缺省 <span>，行内场景保持文档流）。 */
  as?: 'span' | 'div'
}

export function WireText({ text, renderText, renderRef, onActivate, className, as = 'span' }: WireTextProps): ReactNode {
  const scoped = useContext(WireInteractionContext)
  let hover: ReferenceHoverController | undefined
  try {
    hover = useReferenceHover()
  } catch {
    // 无 ReferenceHoverProvider 的场景（面板/独立视图）——hover no-op
    hover = scoped.hover
  }
  const segments = splitWireSegments(text)
  const Wrapper = as
  return (
    <Wrapper className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return (
            <SegmentBoundary key={index} fallback={segment.text}>
              <TextSegment text={segment.text} renderText={renderText} />
            </SegmentBoundary>
          )
        }
        const custom = renderRef?.({
          descriptor: segment.descriptor,
          label: segment.label,
          raw: segment.raw,
          onActivate: onActivate ?? scoped.onActivate,
          onHoverStart: hover ? (descriptor, anchor) => hover.hoverStart(descriptor, anchor) : undefined,
          onHoverEnd: hover ? () => hover.hoverEnd() : undefined,
        })
        if (custom !== null && custom !== undefined) return <Fragment key={index}>{custom}</Fragment>
        return (
          <ReferenceChip
            key={index}
            descriptor={segment.descriptor}
            onActivate={onActivate ?? scoped.onActivate}
            onHoverStart={hover
              ? (descriptor, anchor) => hover.hoverStart(descriptor, anchor)
              : undefined}
            onHoverEnd={hover ? () => hover.hoverEnd() : undefined}
          >
            {segment.label !== '' ? segment.label : undefined}
          </ReferenceChip>
        )
      })}
    </Wrapper>
  )
}

function TextSegment({ text, renderText }: { text: string; renderText?: ((text: string) => ReactNode) | undefined }): ReactNode {
  if (renderText) return renderText(text)
  return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
}

/**
 * 段级故障隔离（contract: contribution —— provider failure does not crash
 * conversation）：单个文本段的渲染器崩溃降级为该段原文，其余段照常渲染。
 */
class SegmentBoundary extends Component<{ fallback: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  componentDidCatch(error: unknown): void {
    if (process.env.NODE_ENV !== 'production' || process.env.VITEST === 'true') {
      console.error('[dsh-reference] text segment provider failed:', error)
    }
  }

  render(): ReactNode {
    return this.state.failed ? <span style={{ whiteSpace: 'pre-wrap' }}>{this.props.fallback}</span> : this.props.children
  }
}

/** 激活 → cordis serial 派发的标准绑定（宿主胶水层用）。 */
export function createOpenBinder(
  dispatch: (detail: ReferenceChipActivateDetail) => Promise<unknown> | unknown,
): (detail: ReferenceChipActivateDetail) => void {
  return (detail) => { void dispatch(detail) }
}
