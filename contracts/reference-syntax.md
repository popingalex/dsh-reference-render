# Contract: Reference Syntax（v0.1 冻结）

> 状态：**FROZEN v0.1**（2026-10-05）
> 优先规则：已有稳定语法优先兼容——本语法即既有稳定语法的原样公开。

## 语法

```ebnf
reference      = "[" label "](dsh-ref:" kind ":" id ")"
label          = *( 非 "]" 字符 )        （GFM 同规则；"]" 需转义）
kind           = 1*( 非空白/非")"/非":" 字符 ）   （开放词表，无白名单）
id             = 1*( 非空白/非")" 字符 ）        （可含 ":" "/" "#"）
```

正则（实现正本 `src/wire.ts`）：

```js
/\[([^\]]*)\]\((dsh-ref:[^)\s]*)\)/g
```

示例：

```text
Build completed. See [RP-42](dsh-ref:report:RP-42).
部署 [DEP-207](dsh-ref:deployment:DEP-207) succeeded.
知识 [kn-0f3e](dsh-ref:knowledge:kn-0f3e) 已归档。
```

## 正式要求逐项

| 要求 | 满足方式 |
|---|---|
| human readable | GFM link 形态，无 hook 时降级为 label 纯文本 |
| LLM easy to emit | 单行 markdown link；authoring guidance 随包教学（host 半） |
| stream friendly | 闭括号前不构成完整语法 → 整体按纯文本；补全帧自然升级（tests/stream-split.spec.ts 全边界回归） |
| safe fallback | 解析失败返回 undefined，调用方保持默认渲染；不造 opaque identity |
| no JSON blob | 载荷全部在 URI 中，无嵌套 JSON |
| no HTML | URI 与 label 均为纯文本；渲染层 React 转义（tests/security.spec.tsx） |
| deterministic parsing | 纯函数、无全局状态；同输入恒同输出 |
| malformed input degrades safely | 见 tests/wire.spec.ts「rejects malformed targets」与 security.spec |

## 归一化（canonical 地址）

`dsh-ref:<kind>:<id>` → `dsh-resource://<kind>/<id>`（默认规则，`src/descriptor.ts#defaultCanonicalAddress`）；原始 alias 记入 `metadata.alias` 供往返。协议 owner 可用专属 adapter 覆盖转换，canonical 结果不回改。

## kind 词表

**开放词表**——解析器不做 kind 白名单（域中立）。host 半提供 authoring 教学用默认参考表（`DEFAULT_AUTHORING_VOCABULARY`），宿主可经 patch row `config.vocabulary` 覆盖。词表是教学提示，不是机械约束。

## 兼容性

v0.1 语法与产品内已验证语法逐字一致（externals/dsh-reference-renderer 同源）。后续版本如需扩展（如 namespace 前缀），必须保持 v0.1 输入的解析结果不变。
