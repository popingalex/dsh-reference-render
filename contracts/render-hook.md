# Contract: Render Hook（v0.1 冻结）

> 状态：**FROZEN v0.1** ｜ 正本实现：`src/wire.ts#splitWireSegments`、`src/integration/wire-text.tsx`

## 管道

```text
structured text
      ↓ splitWireSegments(text)          —— 纯函数切片（ref 段携带完整 raw 保真）
text[] / ref[] 交错段
      ↓ 文本段 → 宿主渲染绑定（如 MarkdownText）
      ↓ 引用段 → ReferenceChip / StatusRefChip
inline projection
```

## 输入/输出

| 项 | 定义 |
|---|---|
| input | 原始字符串（可含 0..n 个 wire 引用；不做 markdown 全文解析） |
| output | `WireSegment[]`：`{type:'text', text}` 与 `{type:'ref', descriptor, label, raw}` 按原序交错 |
| fallback | 无引用 → 单一 text 段（宿主默认路径零变化） |
| error semantics | 解析失败不 throw；malformed 引用留在 text 段 |
| stream behavior | 半截引用（闭括号前）恒为 text 段；补全帧升级为 ref 段。全边界回归：`tests/stream-split.spec.ts` |
| escaping | 渲染层 React 转义；label 中的 HTML/script 载荷为惰性文本（`tests/security.spec.tsx`） |
| lifecycle | WireText 无外部 provider 时 hover/activate 干净 no-op；段级渲染器崩溃降级为段原文（SegmentBoundary），不炸对话面 |

## 宿主接线（三种合法路径）

1. **WireText 组装**（推荐给自持 node body 的宿主）：`<WireText text renderText renderText绑定官方 MarkdownText>`。
2. **装饰器**：`decorateChatNode(ctx, {wrap})` 原地包装官方 keyed entry（dsh-annotation 模式；`restore()` 干净回滚）。
3. **独立面**：面板/设置页等非对话面直接消费 `scanWireReferences`/`splitWireSegments` + chip 组件。

## 错误语义明确项

- `onActivate` 缺省 → 点击 no-op（无 consumer 不产生坏 UI）。
- hover 无 Provider → hover no-op。
- 段渲染 provider throw → 该段降级原文，其余段与 chip 照常。
