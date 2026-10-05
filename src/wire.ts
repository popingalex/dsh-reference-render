/**
 * Reference wire adapter。
 *
 * wire 格式（v0.1 定稿）：`[label](dsh-ref:<kind>:<id>)` markdown
 * link 形态——AST 单 link 节点无损、无 hook 时干净降级为 label 纯文本。
 * code fence / inline code 的惰性由上游 markdown parser 保证，不在本层处理。
 */
import {
  normalizeReference,
  parseDshRefUri,
  type ReferenceDescriptor,
} from './descriptor'

export interface WireReferenceMatch {
  descriptor: ReferenceDescriptor
  /** 完整 `[label](target)` 原文 */
  raw: string
  /** wire target，如 `dsh-ref:issue:I-1` */
  target: string
  label: string
  /** 在原文中的起止偏移（endIndex 为独占上界） */
  index: number
  endIndex: number
}

// label 禁止未转义 `]`（GFM 同规则）；target 禁止空白与 `）`
const WIRE_LINK_PATTERN = /\[([^\]]*)\]\((dsh-ref:[^)\s]*)\)/g

/** 扫描纯文本中全部 wire 引用（AST link 节点路径请用 parseWireTarget）。 */
export function scanWireReferences(text: string): WireReferenceMatch[] {
  const matches: WireReferenceMatch[] = []
  for (const m of text.matchAll(WIRE_LINK_PATTERN)) {
    const target = m[2] as string
    const label = m[1] as string
    const descriptor = parseWireTarget(target, label)
    if (!descriptor) continue
    const index = m.index ?? 0
    matches.push({ descriptor, raw: m[0], target, label, index, endIndex: index + m[0].length })
  }
  return matches
}

/**
 * 词汇槽适配面：
 * 返回 undefined = 不认识该 url → 调用方保持默认渲染；
 * 安全 fallback（未知 scheme 经 sanitizeUrl 剥离降级）是宿主现有行为，零新增安全面。
 */
export function parseWireTarget(url: string, label?: string): ReferenceDescriptor | undefined {
  const parts = parseDshRefUri(url)
  if (!parts) return undefined
  return normalizeReference({ uri: url, label: label || undefined, kind: parts.kind })
}

export type WireSegment =
  | { type: 'text'; text: string }
  | { type: 'ref'; descriptor: ReferenceDescriptor; label: string; /** 完整 `[label](target)` 原文（流式重建/测试保真用） */ raw: string }

/**
 * 正文按 wire 引用切片（宿主渲染采用志）：引用段与文本段按原顺序交错，
 * 文本段交给宿主既有的 markdown/文本渲染，引用段渲染 chip。
 * 纯函数——conversation 宿主经此做 dsh-ref 内联渲染。
 */
export function splitWireSegments(text: string): WireSegment[] {
  const matches = scanWireReferences(text)
  if (matches.length === 0) return [{ type: 'text', text }]
  const segments: WireSegment[] = []
  let cursor = 0
  for (const match of matches) {
    if (match.index > cursor) segments.push({ type: 'text', text: text.slice(cursor, match.index) })
    segments.push({ type: 'ref', descriptor: match.descriptor, label: match.label, raw: match.raw })
    cursor = match.endIndex
  }
  if (cursor < text.length) segments.push({ type: 'text', text: text.slice(cursor) })
  return segments
}
