/**
 * 装饰系统（contract: 色点/色条/图标 × 左右位）。
 *
 * 冻结点：
 *  - ReferenceChip.decorations：前后各最多 3 个（每类一个超限截断）；
 *  - icon tint 模式：color 缺省 currentColor（跟随系统文本色）；image 模式原色；
 *  - 安全面：src 仅 http(s)/data:image，javascript:/其它 scheme 拒绝渲染；
 *  - StatusRefChip 便捷字段换算：条→左位、点→右位，显式 decorations 追加同侧。
 */
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { normalizeReference, ReferenceChip, StatusRefChip } from '../src/index'

const SVG_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='6'/%3E%3C/svg%3E"
const base = normalizeReference({ uri: 'dsh-ref:report:X-1' })!

describe('ReferenceChip.decorations 六装饰位', () => {
  it('renders left and right decorations around the label in order', () => {
    const { container } = render(
      <ReferenceChip
        descriptor={base}
        decorations={{
          left: [{ kind: 'bar', color: '#4caf50' }, { kind: 'icon', src: SVG_ICON }],
          right: [{ kind: 'dot', color: '#ffb74d' }],
        }}
      >
        X-1
      </ReferenceChip>,
    )
    const left = container.querySelectorAll('[data-ref-decorations="left"] [data-ref-decor]')
    const right = container.querySelectorAll('[data-ref-decorations="right"] [data-ref-decor]')
    expect(left).toHaveLength(2)
    expect(left[0]!.getAttribute('data-ref-decor')).toBe('bar')
    expect(left[1]!.getAttribute('data-ref-decor')).toBe('icon-tint')
    expect(right).toHaveLength(1)
    expect(right[0]!.getAttribute('data-ref-decor')).toBe('dot')
    // 顺序：左装饰在文本前、右装饰在文本后
    const button = container.querySelector('button')!
    const html = button.innerHTML
    expect(html.indexOf('data-ref-decorations="left"')).toBeLessThan(html.indexOf('X-1'))
    expect(html.lastIndexOf('X-1')).toBeLessThan(html.indexOf('data-ref-decorations="right"'))
    void right
  })

  it('clamps each side to 3 decorations', () => {
    const four: import('../src/index').RefDecoration[] = [
      { kind: 'dot' }, { kind: 'bar', color: 'red' }, { kind: 'icon', src: SVG_ICON }, { kind: 'dot', color: 'blue' },
    ]
    const { container } = render(
      <ReferenceChip descriptor={base} decorations={{ right: four }}>X</ReferenceChip>,
    )
    expect(container.querySelectorAll('[data-ref-decor]')).toHaveLength(3)
  })

  it('icon tint defaults to currentColor; image mode renders an img', () => {
    const { container, rerender } = render(
      <ReferenceChip descriptor={base} decorations={{ left: [{ kind: 'icon', src: SVG_ICON }] }}>X</ReferenceChip>,
    )
    const tint = container.querySelector('[data-ref-decor="icon-tint"]') as HTMLElement
    expect(tint.style.backgroundColor).toBe('currentcolor')
    expect(tint.style.maskImage).toContain('data:image/svg+xml')
    rerender(
      <ReferenceChip descriptor={base} decorations={{ left: [{ kind: 'icon', src: SVG_ICON, mode: 'image', color: 'red' }] }}>X</ReferenceChip>,
    )
    expect(container.querySelector('img[data-ref-decor="icon-image"]')).not.toBeNull()
  })

  it('refuses unsafe icon sources (no javascript:, no unknown data:)', () => {
    const { container } = render(
      <ReferenceChip
        descriptor={base}
        decorations={{ left: [{ kind: 'icon', src: 'javascript:alert(1)' }, { kind: 'icon', src: 'data:text/html,x' }] }}
      >
        X
      </ReferenceChip>,
    )
    expect(container.querySelectorAll('[data-ref-decor]')).toHaveLength(0)
  })
})

describe('StatusRefChip decorations 换算与叠加', () => {
  it('status → right dot, statusBar → left bar (bound default), both visible', () => {
    const { container } = render(<StatusRefChip descriptor={base} status="succeeded" statusColor="#4caf50" label="X" />)
    expect(container.querySelectorAll('[data-ref-decorations="left"] [data-ref-decor="bar"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-ref-decorations="right"] [data-ref-decor="dot"]')).toHaveLength(1)
    const dot = container.querySelector('[data-ref-decor="dot"]') as HTMLElement
    expect(dot.style.background).toBe('rgb(76, 175, 80)')
  })

  it('explicit side takes full ownership (no implied append, no quota surprise)', () => {
    const { container } = render(
      <StatusRefChip
        descriptor={base}
        status="passed"
        statusColor="#4caf50"
        label="X"
        decorations={{ right: [{ kind: 'icon', src: SVG_ICON }] }}
      />,
    )
    // right 由调用方全权：只有 icon；便捷 status 的点不再隐含叠加
    const right = [...container.querySelectorAll('[data-ref-decorations="right"] [data-ref-decor]')]
    expect(right.map((node) => node.getAttribute('data-ref-decor'))).toEqual(['icon-tint'])
    // 左侧未提供 → 便捷换算仍生效（有点则条随点）
    expect(container.querySelectorAll('[data-ref-decorations="left"] [data-ref-decor="bar"]')).toHaveLength(1)
  })

  it('decorations carry aria-hidden (pure visuals, invisible to AT)', () => {
    const { container } = render(
      <ReferenceChip descriptor={base} decorations={{ left: [{ kind: 'bar', color: 'red' }, { kind: 'icon', src: SVG_ICON }], right: [{ kind: 'dot' }] }}>X</ReferenceChip>,
    )
    for (const group of container.querySelectorAll('[data-ref-decorations]')) {
      expect(group.getAttribute('aria-hidden')).toBe('true')
    }
  })
})
