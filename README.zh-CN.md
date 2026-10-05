[English](./README.md) · 中文

# dsh-reference-render

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![DSH 0.2.1-alpha.1](https://img.shields.io/badge/DSH-0.2.1--alpha.1-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)
![dsh](https://img.shields.io/badge/dsh-4d6bfe)
![dsh-plugin](https://img.shields.io/badge/dsh--plugin-4d6bfe)

面向 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 对话的**域中立结构化引用渲染与交互原语**：`[标签](dsh-ref:<kind>:<id>)` 变成内联 chip，支持悬浮预览与点击打开。本包**不理解任何业务领域**——内容由其它插件经冻结契约供给。

![八个引用：四种点条样式、双侧图标、悬浮预览与右侧栏](./docs/assets/demo/eight-refs-hover-sidebar.png)

## 安装

```bash
dsh plugin --profile web add dsh-reference-render@0.1.0
```

仅在 DSH 0.2.1-alpha.1 上测试。完整矩阵、示例 bundle、git 安装与故障排查：[docs/install.md](./docs/install.md)。

本地复现 README 截图（一次性 profile、两个种子会话、无需 API key）：[docs/local-demo.md](./docs/local-demo.md)。

## 使用

**输出**——消息里的普通 GFM 链接就是 chip；没装插件时降级为普通链接：

```text
Build completed. See [RP-42](dsh-ref:report:RP-42) for details.
```

**装饰**——内容插件认领引用并供给装饰。色点、色条、图标三者正交，各自可放左侧或右侧，每侧最多 3 个（共 6 位）。图标不设色则跟随系统文本色（CSS mask）；`mode: 'image'` 原色 `<img>` 渲染：

| 引用 | 左侧 | 右侧 |
|---|---|---|
| 部署（已认领） | 色条 | 色点 |
| 验证（已认领） | — | 色点 |
| 记录（已认领） | 色条 | — |
| 计划（已认领，含图标） | 图标、色条、色点 | 色点、色条、图标 |
| 未认领（`gadget/MYST-2`） | —— 素 chip，悬浮与点击均为无操作 | |

**贡献**——内容插件经两个 chain slot 与一个 serial 事件认领引用：

```ts
ctx.effect(() => ctx.slots.inject('reference.hover.content', () =>
  ctx.slots.register({ name: 'reference.hover.content',
    select: (owner) => isOurs(owner.descriptor) ? {} : null }, MyHoverCard)))

ctx.on('reference/open', ({ descriptor }) =>
  isOurs(descriptor) ? (ctx.sidebarRight.openResource(descriptor.uri), { handled: true }) : undefined)
```

完整贡献形状（chip 装饰、资源页、激活载荷）：[contracts/reference-contribution.md](./contracts/reference-contribution.md)。

## 契约（v0.1 冻结）

| 契约 | 文档 |
|---|---|
| 引用语法 | [contracts/reference-syntax.md](./contracts/reference-syntax.md) |
| ReferenceDescriptor | [contracts/reference-descriptor.md](./contracts/reference-descriptor.md) / [schema](./contracts/reference-descriptor.schema.json) |
| 渲染钩子 | [contracts/render-hook.md](./contracts/render-hook.md) |
| 交互事件 | [contracts/reference-interaction-events.md](./contracts/reference-interaction-events.md) |
| 贡献 + 装饰 | [contracts/reference-contribution.md](./contracts/reference-contribution.md) |
| 兼容性 | [COMPATIBILITY.md](./COMPATIBILITY.md) |

## Skill：教你的 agent 或插件

[`skill/dsh-reference-rendering`](./skill/dsh-reference-rendering/SKILL.md)——即插即用 skill，双模式：**纯提示词**（一段 rules 块让任意 agent 输出可解析的 dsh-ref 链接；无需插件，降级为普通链接）与**插件集成**（上述贡献契约，含四条实战静默失败的硬纪律）。

## 示例与本地演示

可运行示例在仓库中：[`examples/conversation-demo`](https://github.com/popingalex/dsh-reference-render/tree/main/examples/conversation-demo)（对话渲染接线）与 [`examples/sidebar-demo`](https://github.com/popingalex/dsh-reference-render/tree/main/examples/sidebar-demo)（内容认领方），以 `dsh-reference-render-demo` 与 `dsh-reference-render-sidebar-demo` bundle 安装。纯源码走读：[`examples/minimal`](https://github.com/popingalex/dsh-reference-render/tree/main/examples/minimal)（输出 → 解析 → chip，零领域）与 [`examples/contribution`](https://github.com/popingalex/dsh-reference-render/tree/main/examples/contribution)（多插件围绕同一协议协作）——均在仓库测试套件中运行。

本地复现 README 截图：[docs/local-demo.md](./docs/local-demo.md)。

## 边界

本渲染器不拥有业务真相（`View ≠ Truth`）。领域由插件贡献；未认领引用保持素 chip、无悬浮面板、点击无操作。卸载插件宿主零残留。

## License

[MIT](./LICENSE)
