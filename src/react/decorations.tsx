/**
 * 引用装饰系统（contract: reference-chip-decor 扩展）。
 *
 * 三种装饰——色点（dot）、色条（bar）、图标（icon）——各自可独立放置在
 * 引用对象左侧或右侧；前后两组各最多 3 个（每类一个），共 6 个装饰位。
 *
 * icon 两种渲染模式：
 * - tint（缺省）：CSS mask 渲染，`color` 缺省 `currentColor`（跟随系统文本色）；
 *   适合单色 SVG/图形，图片会被着色为剪影。
 * - image：普通 `<img>` 原色渲染（彩色图片/多色 SVG；SVG 走 <img> 不执行脚本）。
 *
 * 安全面：icon 的 src 一律经 `<img src>` 或 CSS mask-image 加载，不内联
 * 渲染任何标记——SVG 不可能携带脚本执行（外链/`javascript:` 一律拒绝）。
 */
import { createElement, type CSSProperties, type ReactNode } from 'react'

/** 图标来源：http(s) URL 或 data: URI（data:image/*）。 */
export type RefIconSource = string

export type RefDecoration =
  | { kind: 'dot'; color?: string | undefined; size?: number | undefined }
  | { kind: 'bar'; color?: string | undefined; size?: number | undefined }
  | { kind: 'icon'; src: RefIconSource; color?: string | undefined; mode?: 'tint' | 'image' | undefined; size?: number | undefined }

export interface RefDecorationSides {
  left?: RefDecoration[] | undefined
  right?: RefDecoration[] | undefined
}

const SAFE_SRC = /^(https:\/\/|data:image\/)/i

function safeSrc(src: string): string | undefined {
  if (!SAFE_SRC.test(src)) return undefined
  return src
}

function DecorationNode({ decoration }: { decoration: RefDecoration }): ReactNode {
  if (decoration.kind === 'dot') {
    const size = decoration.size ?? 6
    return createElement('span', {
      'data-ref-decor': 'dot',
      style: {
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: 999,
        background: decoration.color ?? 'currentColor',
        flex: 'none',
      },
    })
  }
  if (decoration.kind === 'bar') {
    const width = decoration.size ?? 3
    return createElement('span', {
      'data-ref-decor': 'bar',
      style: {
        display: 'inline-block',
        width,
        height: width * 4 + 2,
        borderRadius: 2,
        background: decoration.color ?? 'currentColor',
        flex: 'none',
      },
    })
  }
  // icon
  const src = safeSrc(decoration.src)
  if (src === undefined) return null
  const size = decoration.size ?? 12
  if (decoration.mode === 'image') {
    return createElement('img', {
      'data-ref-decor': 'icon-image',
      src,
      alt: '',
      loading: 'lazy',
      referrerPolicy: 'no-referrer',
      style: { width: size, height: size, flex: 'none', verticalAlign: 'middle', borderRadius: 2 },
    })
  }
  // tint：mask 渲染，color 缺省 currentColor（跟随系统文本色）
  const style: CSSProperties = {
    display: 'inline-block',
    width: size,
    height: size,
    flex: 'none',
    backgroundColor: decoration.color ?? 'currentColor',
    WebkitMaskImage: `url("${src}")`,
    maskImage: `url("${src}")`,
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
  }
  return createElement('span', { 'data-ref-decor': 'icon-tint', style })
}

const PER_SIDE_MAX = 3

/** 外侧优先序：bar 恒在最外（紧贴 chip 边缘），dot 最靠内容；同类型保持原序。 */
const OUTWARD_ORDER: Record<RefDecoration['kind'], number> = { bar: 0, icon: 1, dot: 2 }

function clamp(list: RefDecoration[] | undefined): RefDecoration[] {
  if (list === undefined || list.length === 0) return []
  return list.slice(0, PER_SIDE_MAX)
}

/**
 * 视觉排序（用户裁决：色条恒在最外侧）：
 * left 侧渲染序 = [bar, icon, dot, ...原序同类型]；right 侧镜像（bar 最靠右）。
 * 数组顺序不影响视觉位置。
 */
function ordered(list: RefDecoration[], side: 'left' | 'right'): RefDecoration[] {
  const withIndex = list.map((decoration, index) => ({ decoration, index }))
  const sorted = withIndex.sort((a, b) => {
    const byKind = OUTWARD_ORDER[a.decoration.kind] - OUTWARD_ORDER[b.decoration.kind]
    return byKind !== 0 ? byKind : a.index - b.index
  })
  const orderedList = sorted.map((entry) => entry.decoration)
  return side === 'right' ? orderedList.reverse() : orderedList
}

/** 渲染一组装饰（side 决定 gap 方向语义由外层 flex 处理）。 */
export function Decorations({
  decorations,
  side,
}: { decorations: RefDecorationSides | undefined; side: 'left' | 'right' }): ReactNode {
  const list = ordered(clamp(decorations?.[side]), side)
  if (list.length === 0) return null
  return createElement(
    'span',
    { 'data-ref-decorations': side, 'aria-hidden': true, style: { display: 'inline-flex', alignItems: 'center', gap: 3 } },
    list.map((decoration, index) => createElement(DecorationNode, { key: index, decoration })),
  )
}
