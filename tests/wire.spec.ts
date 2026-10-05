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

describe('畸形输入退化（负向面）', () => {
  it('嵌套畸形标记：不抛错，切片重建无损等于原文', () => {
    for (const text of [
      '[a](dsh-ref:issue:[b](dsh-ref:issue:I-1))',
      '[[x]](dsh-ref:issue:I-1)',
      '[a](dsh-ref:issue:I-1(unclosed',
      '[a](dsh-ref::I-1)',
      '[a](dsh-ref:issue:)',
      '[a](dsh-ref:issue:I-1) 尾随 [b](dsh-ref:)',
    ]) {
      const segments = splitWireSegments(text)
      const rebuilt = segments.map((segment) => (segment.type === 'text' ? segment.text : segment.raw)).join('')
      expect(rebuilt).toBe(text)
    }
  })

  it('同一段文本内多处畸形引用：全部按原文降级，合法引用照常识别', () => {
    const text = '坏 [a](dsh-ref:broken) 坏 [b](dsh-ref:) 好 [I-1](dsh-ref:issue:I-1) 坏 [c](dsh-ref:issue:)'
    const refs = scanWireReferences(text)
    expect(refs).toHaveLength(1)
    expect(refs[0]!.descriptor.uri).toBe('dsh-resource://issue/I-1')
    const segments = splitWireSegments(text)
    expect(segments.filter((segment) => segment.type === 'ref')).toHaveLength(1)
    expect(segments.filter((segment) => segment.type === 'text')).toHaveLength(2)
  })

  it('超长输入：解析完成且引用偏移保持自洽', () => {
    const filler = '这是一段用于压力测试的中文与 english 混合正文。\n'.repeat(2000)
    const text = `${filler}[I-1](dsh-ref:issue:I-1)${filler}[KB-2](dsh-ref:knowledge:KB-2)${filler}`
    const refs = scanWireReferences(text)
    expect(refs.map((ref) => ref.descriptor.uri)).toEqual([
      'dsh-resource://issue/I-1',
      'dsh-resource://knowledge/KB-2',
    ])
    for (const ref of refs) {
      expect(text.slice(ref.index, ref.endIndex)).toBe(ref.raw)
    }
    const segments = splitWireSegments(text)
    expect(segments).toHaveLength(5)
    expect(segments.reduce((total, segment) => total + (segment.type === 'text' ? segment.text.length : segment.raw.length), 0))
      .toBe(text.length)
  })

  it('纯畸形长输入：零引用且整段作为文本返回', () => {
    const text = '[x](dsh-ref:broken)'.repeat(500)
    expect(scanWireReferences(text)).toEqual([])
    expect(splitWireSegments(text)).toEqual([{ type: 'text', text }])
  })
})
