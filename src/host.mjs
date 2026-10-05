/**
 * Host 半（node 侧 cordis 装载的 main）。
 *
 * main 保持 JS（TS client 源会让 cordis 加载失败）。本半只承担：
 * Structured Reference Authoring Guidance——wire 语法属主是本插件，教学层
 * 随属主走：宿主装载本插件即自动获得 systemPrompt 段，无需宿主侧任何代码。
 * parsing/rendering/hover/open 全在 client 半与消费宿主，本半不参与。
 *
 * kind 词表是开放词表（域中立）：此处仅提供 authoring 教学用的默认参考表，
 * 宿主可经 patch row config.vocabulary 覆盖（config 面可选）。
 */
export const inject = ['systemPrompt']

export const AUTHORING_GUIDANCE_SECTION_NAME = 'dsh-reference:structured-reference-authoring'

/** 默认教学词表（示例性、非白名单——解析器不做 kind 校验）。 */
export const DEFAULT_AUTHORING_VOCABULARY = Object.freeze([
  'work', 'issue', 'fact', 'knowledge', 'wiki', 'code',
  'run', 'build', 'deployment', 'service',
  'skill', 'asset', 'artifact',
  'requirement', 'system', 'module', 'function', 'behavior', 'architecture',
  'plan', 'evidence', 'test-case', 'test-report', 'commit', 'mr',
  'agent', 'session',
])

/** 构建教学段正文（单一定义，测试对四条纪律断言）。正文不得出现 `{{` 序列。 */
export function buildAuthoringGuidanceText(vocabulary = DEFAULT_AUTHORING_VOCABULARY) {
  return [
    '行内资源引用（structured reference）：当你的回答提到一个真实存在、可解析、适合用户继续打开的资源时，用 markdown 链接书写它，格式为 `[标签](dsh-ref:<kind>:<id>)`，例如 `[I-0001](dsh-ref:issue:I-0001)`。',
    '- 只引用当前工作区真实存在、可解析的资源；严禁编造 ID。',
    '- 新建资源必须等权威操作成功返回真实 ID 之后，才允许生成指向它的引用。',
    '- 普通文字不强制写成引用；不要为了展示能力而堆砌引用。',
    '- kind 使用宿主工作区既有的资源词表；标签保持简短（编号或标题）。',
    `- 词表参考（以宿主实际支持为准）：${vocabulary.join('、')}。`,
    '- 会话中已出现的引用（无论出自谁的消息）、以及工具结果中返回的资源 ID，都是真实可解析的——回答涉及时按原样书写引用。',
  ].join('\n')
}

/** 兼容导出：默认词表教学段正文。 */
export const AUTHORING_GUIDANCE_TEXT = buildAuthoringGuidanceText()

export function apply(ctx, config) {
  const vocabulary = Array.isArray(config?.vocabulary) && config.vocabulary.length > 0
    ? config.vocabulary
    : undefined
  const text = vocabulary ? buildAuthoringGuidanceText(vocabulary) : AUTHORING_GUIDANCE_TEXT
  try {
    ctx.systemPrompt.section({
      name: AUTHORING_GUIDANCE_SECTION_NAME,
      order: 22,
      text,
    })
  } catch (error) {
    // 同名 section 重复注册会 throw（SystemPrompt 注册表语义）——loader 重入
    // mount 时保留首份即可。
    if (!/duplicate/i.test(String(error?.message ?? error))) throw error
  }
}
