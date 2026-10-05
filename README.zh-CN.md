# dsh-reference

面向 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness)对话与面板的**域中立结构化引用渲染与交互原语**。

把结构化文本中的引用变成显著的内联 chip，支持悬浮预览、激活路由，以及让**其他插件**供给领域内容的贡献契约——而本包自身**不理解任何业务领域**。

```text
Build completed. See [RP-42](dsh-ref:report:RP-42) for details.
                 └ 渲染为内联 chip：悬浮 → 预览，点击 → 打开
```

## 为什么

DSH 对话承载结构化引用（事务、报告、部署、知识……）。普通 markdown link 会降级为惰性文本。`dsh-reference` 提供缺失的原语层：

- **wire 语法**——`[label](dsh-ref:<kind>:<id>)`，与 GFM link 兼容，在任何渲染器中安全降级，结构上天然流式安全；
- **ReferenceDescriptor**——域中立身份（`uri` + 开放词表 `kind`），绝不携带 canonical 业务状态；
- **内联 chip**——可访问、有样式、单一视觉实现；
- **悬浮预览**——debounce/宽限生命周期 + AbortSignal 陈旧抑制，内容由 chain slot 贡献；
- **激活**——`reference/open` typed cordis serial 事件（first-bail-wins），路由到认领该引用的一方；
- **authoring guidance**——systemPrompt 段，教学语法与纪律（严禁编造 ID）。

## 安装

```bash
# 装入 DSH profile（已实测路径）
dsh plugin --profile web add <path-to-dsh-reference-0.1.0.tgz>
# npm / GitHub（发布后）
dsh plugin --profile web add dsh-reference
dsh plugin --profile web add github:dsh-reference/dsh-reference
```

已测 DSH/Node 矩阵与已知约束见 [COMPATIBILITY.md](./COMPATIBILITY.md)。

## 用法

### 渲染 wire 引用（任意 React 面）

```tsx
import { WireText } from 'dsh-reference/runtime'

<WireText
  text={'Build completed. See [RP-42](dsh-ref:report:RP-42).'}
  renderText={(text) => <MarkdownText text={text} streaming={streaming} labels={labels} />}
/>
```

### 贡献悬浮内容 / 认领激活（你的插件）

```ts
// 悬浮预览——chain slot，first-match 胜出
ctx.effect(() => ctx.slots.inject('reference.hover.content', () =>
  ctx.slots.register({
    name: 'reference.hover.content',
    select: (owner) => owner.descriptor.kind === 'deployment' ? {} : null,
  }, DeploymentHoverCard)))

// 激活——typed serial 事件，首个接管者胜出
ctx.on('reference/open', ({ descriptor }) =>
  descriptor.kind === 'deployment' ? (openDeployment(descriptor), referenceHandled()) : undefined)
```

### 对话集成

官方 `conversation.chat.node` keyed slot 在 DSH 0.2.1-alpha.1 **没有公开的 link 组件 seam**；因此本包交付构建块而非接管：`decorateChatNode`（社区标准的原地装饰器 + 干净回滚）+ `WireText` 分段渲染器。拥有 chat node body 的宿主自行组装；见 [contracts/render-hook.md](./contracts/render-hook.md)。

## 契约（v0.1 冻结）

| 契约 | 文档 |
|---|---|
| 引用语法 | [contracts/reference-syntax.md](./contracts/reference-syntax.md) |
| ReferenceDescriptor | [contracts/reference-descriptor.md](./contracts/reference-descriptor.md) / [schema](./contracts/reference-descriptor.schema.json) |
| 渲染钩子 | [contracts/render-hook.md](./contracts/render-hook.md) |
| 交互事件 | [contracts/reference-interaction-events.md](./contracts/reference-interaction-events.md) |
| 贡献契约 | [contracts/reference-contribution.md](./contracts/reference-contribution.md) |
| 兼容性 | [COMPATIBILITY.md](./COMPATIBILITY.md) |

## 示例（可执行，CI 中真实运行）

- [examples/minimal](./examples/minimal)——text → parse → chip → hover，零业务域。
- [examples/contribution](./examples/contribution)——三个 fake 域（deployment/verification/evidence）围绕同一个域中立协议贡献悬浮内容与认领激活。

## 验证

```bash
pnpm verify   # typecheck → tests（含流式全边界回归 + 安全门）→ build → pack 审计 → 脱敏扫描
```

## 边界

本渲染器**不拥有任何业务真相**。不 resolve 领域、不缓存状态、不复制 canonical 状态——`View ≠ Truth`。领域由插件经上述冻结契约贡献。

## License

[MIT](./LICENSE)
