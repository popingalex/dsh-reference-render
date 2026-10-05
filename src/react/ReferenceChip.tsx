/**
 * 行内引用 chip（inline presentation）。
 *
 * presentation 组件不持有 ctx / transport：激活经注入回调
 * `onActivate`，由插件胶水层映射到 `dispatchReferenceOpen`。
 * 键盘可达性由原生 button 语义承担（Enter/Space 触发 click）；激活来源用
 * click event.detail 区分——detail > 0 为指针点击，detail === 0 为键盘激活
 * （浏览器键盘激活 click 的平台信号）。
 */
import type { MouseEvent, ReactNode } from 'react'
import type { ReferenceActivation } from '../events'
import type { ReferenceDescriptor } from '../descriptor'

export interface ReferenceChipActivateDetail {
  descriptor: ReferenceDescriptor
  activation: ReferenceActivation
}

export interface ReferenceChipProps {
  descriptor: ReferenceDescriptor
  /** 覆盖显示文本；缺省 label → title → metadata.alias → uri */
  children?: ReactNode
  /** 注入的激活回调；缺省时点击为干净 no-op（无 consumer 不产生坏 UI） */
  onActivate?: ((detail: ReferenceChipActivateDetail) => void) | undefined
  /** pointer enter（anchor 元素随行交付，供 hover 控制器定位）；缺省无 hover 行为 */
  onHoverStart?: ((descriptor: ReferenceDescriptor, anchor: HTMLElement) => void) | undefined
  /** pointer leave */
  onHoverEnd?: (() => void) | undefined
  disabled?: boolean | undefined
  className?: string
  /**
   * 左侧状态条颜色（CSS 色值）——**只用于有业务状态的事物**（open/in-progress/done）。
   * 无状态资源（服务/知识等）**不传此值** = 不显示左状态条（chip 仍保留底色等与正文区分）。
   */
  statusBarColor?: string | undefined
}

export const REFERENCE_CHIP_CLASS = 'dsh-ref-chip'

function displayText(descriptor: ReferenceDescriptor): string {
  if (descriptor.label) return descriptor.label
  if (descriptor.title) return descriptor.title
  const alias = descriptor.metadata?.['alias']
  if (typeof alias === 'string' && alias) return alias
  return descriptor.uri
}

export function ReferenceChip({
  descriptor,
  children,
  onActivate,
  onHoverStart,
  onHoverEnd,
  disabled = false,
  className,
  statusBarColor,
}: ReferenceChipProps) {
  const text = children ?? displayText(descriptor)
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (disabled || !onActivate) return
    const activation: ReferenceActivation = event.detail > 0 ? 'pointer' : 'keyboard'
    onActivate({ descriptor, activation })
  }
  const classes = className ? `${REFERENCE_CHIP_CLASS} ${className}` : REFERENCE_CHIP_CLASS
  const showStatusBar = typeof statusBarColor === 'string' && statusBarColor !== ''
  return (
    <button
      type="button"
      className={classes}
      data-reference-uri={descriptor.uri}
      data-ref-chip-status-bar={showStatusBar ? statusBarColor : undefined}
      title={descriptor.title}
      disabled={disabled}
      onClick={handleClick}
      onMouseEnter={onHoverStart ? (event) => onHoverStart(descriptor, event.currentTarget) : undefined}
      onMouseLeave={onHoverEnd}
      style={showStatusBar ? { borderLeftColor: statusBarColor } : undefined}
    >
      {text}
    </button>
  )
}
