import { describe, expect, it } from 'vitest'
import { parseWireTarget, scanWireReferences, splitWireSegments } from '../src/wire'

describe('scanWireReferences', () => {
  it('finds a single reference with exact offsets', () => {
    const text = '已完成 [I-1](dsh-ref:issue:I-1)。'
    const [m] = scanWireReferences(text)
    expect(m).toBeDefined()
    expect(m!.raw).toBe('[I-1](dsh-ref:issue:I-1)')
    expect(m!.target).toBe('dsh-ref:issue:I-1')
    expect(m!.label).toBe('I-1')
    expect(m!.index).toBe(4) // 「已完成」3 字 + 空格
    expect(m!.endIndex).toBe(4 + m!.raw.length)
    expect(text.slice(m!.index, m!.endIndex)).toBe(m!.raw)
  })

  it('finds multiple references in order', () => {
    const text = '先看 [I-1](dsh-ref:issue:I-1) 再看 [KB-2](dsh-ref:knowledge:KB-0002)，完。'
    const matches = scanWireReferences(text)
    expect(matches.map((m) => m.descriptor.uri)).toEqual([
      'dsh-resource://issue/I-1',
      'dsh-resource://knowledge/KB-0002',
    ])
    expect(matches[0]!.endIndex).toBeLessThanOrEqual(matches[1]!.index)
  })

  it('ignores non-reference links', () => {
    const text = '[docs](https://example.com) 和 [s](dsh-session:abc) 不算'
    expect(scanWireReferences(text)).toEqual([])
  })

  it('ignores malformed targets', () => {
    expect(scanWireReferences('[x](dsh-ref:broken)')).toEqual([])
    expect(scanWireReferences('[x](dsh-ref:)')).toEqual([])
  })

  it('supports CJK labels and empty labels', () => {
    const [cjk] = scanWireReferences('见 [缺陷单 I-1](dsh-ref:issue:I-1)')
    expect(cjk!.label).toBe('缺陷单 I-1')
    const [empty] = scanWireReferences('[](dsh-ref:issue:I-1)')
    expect(empty!.label).toBe('')
    expect(empty!.descriptor.label).toBeUndefined()
  })
})

describe('parseWireTarget（词汇槽 resolve 半边契约）', () => {
  it('parses a dsh-ref target into a canonical descriptor', () => {
    const d = parseWireTarget('dsh-ref:issue:I-1', 'I-1')
    expect(d).toBeDefined()
    expect(d!.uri).toBe('dsh-resource://issue/I-1')
    expect(d!.kind).toBe('issue')
    expect(d!.label).toBe('I-1')
    expect(d!.metadata!.alias).toBe('dsh-ref:issue:I-1')
  })

  it('declines unknown schemes so the host keeps its default rendering', () => {
    expect(parseWireTarget('https://example.com')).toBeUndefined()
    expect(parseWireTarget('dsh-session:abc')).toBeUndefined()
    expect(parseWireTarget('dsh-resource://file/session/1/a.md')).toBeUndefined()
  })

  it('treats an empty label as absent', () => {
    const d = parseWireTarget('dsh-ref:issue:I-1', '')
    expect(d!.label).toBeUndefined()
  })
})

describe('splitWireSegments（conversation 宿主切片采用面）', () => {
  it('无引用 → 单一文本段（宿主零行为变化）', () => {
    const segments = splitWireSegments('普通文本 [x](https://example.com) 不含引用。')
    expect(segments).toEqual([{ type: 'text', text: '普通文本 [x](https://example.com) 不含引用。' }])
  })

  it('引用与文本交错：段序保持、ref 段携带 descriptor 与 label', () => {
    const segments = splitWireSegments('先看 [I-1](dsh-ref:issue:I-1) 再收尾')
    expect(segments).toEqual([
      { type: 'text', text: '先看 ' },
      { type: 'ref', descriptor: expect.objectContaining({ uri: 'dsh-resource://issue/I-1' }), label: 'I-1', raw: '[I-1](dsh-ref:issue:I-1)' },
      { type: 'text', text: ' 再收尾' },
    ])
  })

  it('连续引用各自成段，文本段偏移无缝', () => {
    const segments = splitWireSegments('[A](dsh-ref:issue:A)[B](dsh-ref:issue:B)')
    expect(segments).toHaveLength(2)
    expect(segments.every((s) => s.type === 'ref')).toBe(true)
  })

  it('引用在结尾：尾段不产生空文本', () => {
    const segments = splitWireSegments('见 [KB](dsh-ref:knowledge:KB-1)')
    expect(segments).toHaveLength(2)
    expect(segments[1]!.type).toBe('ref')
  })
})
