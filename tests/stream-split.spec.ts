/**
 * Stream partial reference regression suite（流式 token 边界必测项成套）。
 *
 * 契约：流式到达的半截 wire 引用必须安全降级——任一 token 边界切片下，
 * scanWireReferences/splitWireSegments 只允许两种结果：
 *   a) 完整引用被识别（切片点恰好构成完整语法）；
 *   b) 该片段按纯文本处理。
 * 禁止：半截 chip（descriptor 缺失却渲染 chip）、崩溃、错误吞掉段落。
 */
import { describe, expect, it } from 'vitest'
import { scanWireReferences, splitWireSegments } from '../src/wire'

const COMPLETE = 'Build completed. See [RP-42](dsh-ref:report:RP-42) for details.'

/** 逐字符切片点全集（每个前缀都是一次流式到达状态）。 */
function allPrefixes(text: string): string[] {
  const prefixes: string[] = []
  for (let i = 1; i <= text.length; i++) prefixes.push(text.slice(0, i))
  return prefixes
}

describe('stream split at every token boundary', () => {
  it('never yields a chip whose descriptor is missing', () => {
    for (const prefix of allPrefixes(COMPLETE)) {
      const matches = scanWireReferences(prefix)
      for (const match of matches) {
        // 每个被识别的引用必须是完整语法：raw 能在原文中完整定位
        expect(match.raw).toMatch(/^\[[^\]]*\]\(dsh-ref:[^)\s]*\)$/)
        expect(match.descriptor.uri).toContain('dsh-resource://')
      }
    }
  })

  it('degrades partial refs to text segments (never throws, never emits broken chip)', () => {
    for (const prefix of allPrefixes(COMPLETE)) {
      expect(() => splitWireSegments(prefix)).not.toThrow()
      const segments = splitWireSegments(prefix)
      const reconstructed = segments
        .map((segment) => segment.type === 'text' ? segment.text : segment.raw)
        .join('')
      // 切片保真：段拼接 === 原前缀（不丢字、不改字）
      expect(reconstructed).toBe(prefix)
      // ref 段数与完整语法识别数一致：没有凭空造出的 chip
      expect(segments.filter((segment) => segment.type === 'ref'))
        .toHaveLength(scanWireReferences(prefix).length)
    }
  })

  it('final frame upgrades to exactly one ref segment', () => {
    const segments = splitWireSegments(COMPLETE)
    const refs = segments.filter((segment) => segment.type === 'ref')
    expect(refs).toHaveLength(1)
    expect(refs[0]!.descriptor.uri).toBe('dsh-resource://report/RP-42')
  })

  it('split inside label / target / both stays text', () => {
    const partials = [
      'See [R-4', // label 截断
      'See [RP-42](dsh-ref:re', // target 截断
      'See [RP-42](dsh-ref:', // scheme 截断
      'See [RP-42](dsh-ref:report', // kind 后无冒号
      'See [RP-42](dsh-ref:report:', // id 空
      'See [RP-42](dsh-ref:report:RP-42', // 缺右括号
      'See [RP-42](dsh-ref:report:RP-42)', // 完整（对照）
    ]
    const recognized = partials.filter((partial) => scanWireReferences(partial).length > 0)
    expect(recognized).toEqual(['See [RP-42](dsh-ref:report:RP-42)'])
  })

  it('multiple refs across split boundary keep order and content', () => {
    const text = '[A](dsh-ref:work:W-1) mid [B](dsh-ref:build:B-2)'
    for (const prefix of allPrefixes(text)) {
      const segments = splitWireSegments(prefix)
      const refs = segments.filter((segment) => segment.type === 'ref')
      expect(refs.length).toBeLessThanOrEqual(2)
      const labels = refs.map((segment) => (segment as { label: string }).label)
      expect(labels).toEqual([...labels].sort()) // A 先于 B（同序）
    }
  })
})
