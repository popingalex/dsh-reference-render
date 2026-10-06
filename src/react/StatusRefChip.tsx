/**
 * 统一状态 chip（单一视觉出口）。
 *
 * type/status/label 的标准呈现：宿主只接数据（status 来源=各自权威流）与
 * 交互（activate/hover 接线），视觉实现唯一（本组件）——识别可以多格式，渲染必须一个样子。
 */
import type { ReactNode } from 'react'
import type { ReferenceDescriptor } from '../descriptor'
import { ReferenceChip, type ReferenceChipActivateDetail } from './ReferenceChip'

/** 权威流四态的标准用色（开放默认表，宿主可经 statusColor 覆盖）。 */
export const STATUS_REF_STATUS_COLORS: Readonly<Record<string, string>> = {
  live: '#4caf50',
  loading: '#ffb74d',
  failed: '#e57373',
  none: 'rgba(128,128,128,.5)',
}

export interface StatusRefChipProps {
  descriptor: ReferenceDescriptor
  /** 宿主词表的类型标签（如「事务」）；与显示文本同名时不重复显示 */
  typeLabel?: string | undefined
  /** 覆盖显示文本；缺省走 ReferenceChip 的 label → title → alias → uri 链 */
  label?: string | undefined
  /**
   * 业务状态（open/in-progress/done 等；状态只反映业务状态，
   * 解析失败/服务不可达不是状态）。缺省 = 不显示状态点（无业务状态可标）。
   */
  status?: string | undefined
  /** 业务状态用色覆盖（宿主按需）；缺省按 STATUS_REF_STATUS_COLORS 查表 */
  statusColor?: string | undefined
  /**
   * 左状态条独立控制（2×2 组合能力：点与条正交）：
   * - undefined（缺省）：维持绑定语义——条随状态点（有点即条，同色）；
   * - string：条用该色独立显示（与状态点有无/颜色无关）；
   * - null：显式无条（即使有状态点）。
   */
  statusBar?: string | null | undefined
  /** 广义装饰（点/条/图标 × 左右位，每侧各最多 3 个）；与便捷 status/statusBar 字段叠加。 */
  decorations?: import('./decorations').RefDecorationSides | undefined
  /** 权威流不可用时的占位文本（如「未解析」）——缺省仍显示 label，仅状态点为 none */
  children?: ReactNode
  onActivate?: ((detail: ReferenceChipActivateDetail) => void) | undefined
  onHoverStart?: ((descriptor: ReferenceDescriptor, anchor: HTMLElement) => void) | undefined
  onHoverEnd?: (() => void) | undefined
  disabled?: boolean | undefined
}

export function StatusRefChip({
  descriptor,
  typeLabel,
  label,
  status,
  statusColor,
  statusBar,
  decorations,
  children,
  onActivate,
  onHoverStart,
  onHoverEnd,
  disabled,
}: StatusRefChipProps) {
  const labelText = label ?? ''
  // 类型标签去重：label 已含类型名（前部匹配）时不重复显示
  const trimmedType = (typeLabel ?? '').trim()
  const showKind = trimmedType !== '' && trimmedType !== labelText.trim()
    && !labelText.trim().toLowerCase().startsWith(trimmedType.toLowerCase())
  // 状态点：仅当宿主给出业务状态时显示——解析失败/服务不可达不标状态点
  const showStatusDot = status !== undefined && status !== ''
  const color = statusColor ?? (status !== undefined ? STATUS_REF_STATUS_COLORS[status] ?? STATUS_REF_STATUS_COLORS.none : undefined)
  // 便捷字段换算：状态点→右侧点装饰；状态条→borderLeft（贴边条，渲染方统一）。
  // 显式 decorations 提供了某一侧时，该侧全权归调用方（便捷字段不再隐含叠加）。
  const barColor = statusBar === undefined ? (showStatusDot ? color : undefined) : (statusBar === null ? undefined : statusBar)
  const merged: import('./decorations').RefDecorationSides = {
    left: decorations?.left,
    right: decorations?.right ?? (
      showStatusDot && color !== undefined
        ? [{ kind: 'dot', color }]
        : []),
  }
  return (
    <ReferenceChip
      descriptor={descriptor}
      onActivate={onActivate}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      disabled={disabled}
      // 左状态条（border 视觉）：缺省随状态点；statusBar 显式覆盖时点与条正交
      statusBarColor={barColor}
      decorations={merged.left === undefined && merged.right === undefined ? undefined : merged}
    >
      {showKind ? <span data-ref-chip-kind="">{typeLabel}</span> : null}
      <span data-ref-chip-label="">{children ?? labelText}</span>
      {showStatusDot && status !== undefined ? (
        <span data-ref-chip-status={status} title={status} hidden />
      ) : null}
    </ReferenceChip>
  )
}
