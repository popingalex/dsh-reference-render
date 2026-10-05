/**
 * Security gate。
 *
 * 契约：
 *  - label 中的 HTML/脚本片段必须作为纯文本渲染（React 转义 + 无 dangerouslySetInnerHTML）；
 *  - malformed / 未知 scheme 引用不得成为 opaque identity（normalizeReference 返回 undefined）；
 *  - chip 不产出行内 onclick=HTML、不执行任意 URL（渲染面无 href 注入点）；
 *  - 包面无 secret/私有 endpoint（sanitization 由 scripts/sanitize-scan.mjs 在 verify 承担）。
 */
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { normalizeReference, parseDshRefUri, parseResourceAddress } from '../src/descriptor'
import { ReferenceChip } from '../src/react/ReferenceChip'
import { scanWireReferences } from '../src/wire'

describe('label escaping', () => {
  it('renders html/script payloads in label as inert text', () => {
    const descriptor = normalizeReference({
      uri: 'dsh-ref:report:R-1',
      label: '<img src=x onerror="window.__pwned=1">',
    })!
    const { container } = render(<ReferenceChip descriptor={descriptor} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('<img src=x')
    expect(container.querySelector('button')!.innerHTML).not.toContain('<img')
  })

  it('renders quote/attribute-break payloads as text (no attribute injection)', () => {
    const descriptor = normalizeReference({
      uri: 'dsh-ref:issue:I-9',
      label: '" onmouseover="alert(1)',
    })!
    const { container } = render(<ReferenceChip descriptor={descriptor} />)
    const button = container.querySelector('button')!
    // 属性集合不受 label 内容影响（React 属性白名单语义）
    expect(Array.from(button.attributes).map((attribute) => attribute.name).sort())
      .toEqual(['class', 'data-reference-uri', 'type'])
    expect(button.getAttribute('data-reference-uri')).toBe('dsh-resource://issue/I-9')
  })

  it('no raw html pass-through anywhere in the chip tree', () => {
    const descriptor = normalizeReference({ uri: 'dsh-ref:e:E-1', label: '<script>alert(1)</script>' })!
    const { container } = render(<ReferenceChip descriptor={descriptor} />)
    expect(container.querySelector('script')).toBeNull()
    expect(container.innerHTML).not.toContain('<script>')
  })
})

describe('malformed and unsafe references degrade to non-identity', () => {
  it('broken dsh-ref uris return undefined (no opaque identity)', () => {
    expect(normalizeReference({ uri: 'dsh-ref:issue:' })).toBeUndefined()
    expect(normalizeReference({ uri: 'dsh-ref::I-1' })).toBeUndefined()
    expect(normalizeReference({ uri: 'dsh-ref:nocolon' })).toBeUndefined()
    expect(parseDshRefUri('dsh-ref:issue:')).toBeUndefined()
  })

  it('unknown schemes are not dsh references (parser refuses, renderer keeps text)', () => {
    expect(parseDshRefUri('javascript:alert(1)')).toBeUndefined()
    expect(parseResourceAddress('javascript:alert(1)')).toBeUndefined()
    expect(scanWireReferences('[x](javascript:alert(1))')).toHaveLength(0)
    expect(scanWireReferences('[x](data:text/html,<script>)')).toHaveLength(0)
  })

  it('wire scan never resolves html-ish targets into chips', () => {
    const matches = scanWireReferences('[click](<script>alert(1)</script>) [x](dsh-ref:ok:1)')
    expect(matches).toHaveLength(1)
    expect(matches[0]!.descriptor.uri).toBe('dsh-resource://ok/1')
  })
})
