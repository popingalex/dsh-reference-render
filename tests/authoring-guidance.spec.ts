/**
 * Structured Reference Authoring Guidance host 半测试。
 *
 * 契约冻结点：
 *  - 宿主装载即注册恰好一个具名 section（name 唯一、text 非空字符串）；
 *  - 教学 = wire 语法本体（`[label](dsh-ref:<kind>:<id>)` 模板与可照抄示例）；
 *  - 四条纪律齐备：不编造 ID / 权威操作先行 / 不强制转换普通文字 / 不堆砌；
 *  - D3：syntax 表述与消息作者无关（无 author 分叉措辞，无 Producer 概念）；
 *  - 文本不含 `{{`（section 默认走 prompt 变量插值，插值语法必须零出现）；
 *  - loader 重入（同名重复注册）吞 duplicate，其它错误原样上抛。
 */
import { describe, expect, it } from 'vitest'
import {
  AUTHORING_GUIDANCE_SECTION_NAME,
  AUTHORING_GUIDANCE_TEXT,
  apply,
} from '../src/host.mjs'
import { scanWireReferences } from '../src/wire'
import type { Context } from '@deepseek-ai/cordis'

interface RegisteredSection {
  name: string
  order: number
  text: string
}

function fakeCtx(throwOnSection?: Error) {
  const sections: RegisteredSection[] = []
  const ctx = {
    sections,
    systemPrompt: {
      section(input: RegisteredSection) {
        if (throwOnSection !== undefined) throw throwOnSection
        sections.push(input)
      },
    },
  }
  return ctx as unknown as Context & { sections: RegisteredSection[] }
}

describe('Structured Reference Authoring Guidance（host 半）', () => {
  it('注册恰好一个具名 section，name 唯一、text 非空、order 为数字', () => {
    const ctx = fakeCtx()
    apply(ctx)
    expect(ctx.sections).toHaveLength(1)
    const section = ctx.sections[0]!
    expect(section.name).toBe(AUTHORING_GUIDANCE_SECTION_NAME)
    expect(section.name.length).toBeGreaterThan(0)
    expect(typeof section.text).toBe('string')
    expect(section.text.length).toBeGreaterThan(0)
    expect(typeof section.order).toBe('number')
  })

  it('文本中的示例是可被 wire scanner 识别的真实引用（教学=语法本体）', () => {
    // 从教学文本里提取具体示例（跳过 `<kind>` 形态模板），必须能被
    // scanWireReferences 原样扫出且 canonical 化正确——教学示例与解析器零漂移。
    const example = AUTHORING_GUIDANCE_TEXT.match(/\[[^\]]+\]\(dsh-ref:[a-z][a-z0-9-]*:[^)\s]+\)/)
    expect(example).not.toBeNull()
    const matches = scanWireReferences(example![0])
    expect(matches).toHaveLength(1)
    const scanned = matches[0]!
    expect(scanned.descriptor.kind).toBe('issue')
    expect(scanned.descriptor.uri).toBe('dsh-resource://issue/I-0001')
    expect(AUTHORING_GUIDANCE_TEXT).toContain('dsh-ref:<kind>:<id>')
  })

  it('四条纪律齐备（不编造/权威先行/不强制/不堆砌）', () => {
    expect(AUTHORING_GUIDANCE_TEXT).toContain('严禁编造 ID')
    expect(AUTHORING_GUIDANCE_TEXT).toContain('权威操作成功返回真实 ID')
    expect(AUTHORING_GUIDANCE_TEXT).toContain('不强制写成引用')
    expect(AUTHORING_GUIDANCE_TEXT).toContain('不要为了展示能力而堆砌引用')
  })

  it('D3：syntax 与消息作者无关（无 author 分叉措辞/Producer 概念）', () => {
    expect(AUTHORING_GUIDANCE_TEXT).not.toMatch(/assistant|user 消息|用户消息|Producer|producer|Consumer/)
  })

  it('正文零 `{{`（section 默认 prompt 变量插值）', () => {
    expect(AUTHORING_GUIDANCE_TEXT).not.toContain('{{')
  })

  it('重复注册（loader 重入）吞 duplicate；其它错误原样上抛', () => {
    const dup = fakeCtx(new Error(`section name ${JSON.stringify(AUTHORING_GUIDANCE_SECTION_NAME)} is duplicated`))
    expect(() => apply(dup)).not.toThrow()

    const broken = fakeCtx(new Error('systemPrompt service unavailable'))
    expect(() => apply(broken)).toThrow('systemPrompt service unavailable')
  })
})
