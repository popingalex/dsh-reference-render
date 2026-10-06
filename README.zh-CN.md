[English](./README.md) · 中文

# dsh-reference-render

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![DSH 0.2.1-alpha.1](https://img.shields.io/badge/DSH-0.2.1--alpha.1-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)

面向 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 对话的**域中立结构化引用渲染**：`[标签](dsh-ref:<kind>:<id>)` 变成内联 chip——点/条/图标装饰可放左右两侧，悬浮预览、点击打开。渲染器**不理解任何业务领域**；内容由其它插件经冻结契约供给。

![八个引用：点条样式、双侧图标、悬浮预览与右侧栏](./docs/assets/demo/eight-refs-hover-sidebar.png)

## 安装

```bash
dsh plugin --profile web add dsh-reference-render@0.1.0
```

仅在 DSH 0.2.1-alpha.1 上测试——见 [COMPATIBILITY.md](./COMPATIBILITY.md) 与 [docs/install.md](./docs/install.md)（示例 bundle、git 安装、故障排查）。

## 使用

**输出**——普通 GFM 链接变成 chip；未装插件时降级为普通链接：

```text
Build completed. See [RP-42](dsh-ref:report:RP-42) for details.
```

**装饰**——内容插件认领引用并供给点/条/图标装饰，左右两侧各最多 3 个。图标不设色则跟随文本色；`mode: 'image'` 原色 `<img>` 渲染。未认领的引用保持素 chip——悬浮与点击均为无操作。

**贡献**——两个 chain slot 与一个 serial 事件：

```ts
ctx.effect(() => ctx.slots.inject('reference.hover.content', () =>
  ctx.slots.register({ name: 'reference.hover.content',
    select: (owner) => isOurs(owner.descriptor) ? {} : null }, MyHoverCard)))

ctx.on('reference/open', ({ descriptor }) =>
  isOurs(descriptor) ? (ctx.sidebarRight.openResource(descriptor.uri), { handled: true }) : undefined)
```

## 参考

- 冻结契约：[contracts/](./contracts)——语法、描述符（+[schema](./contracts/reference-descriptor.schema.json)）、渲染钩子、交互事件、[贡献与装饰](./contracts/reference-contribution.md)、[COMPATIBILITY](./COMPATIBILITY.md)
- Agent/插件 skill：[skill/dsh-reference-rendering](./skill/dsh-reference-rendering/SKILL.md)——纯提示词输出规则，或完整插件集成
- 示例：[conversation-demo](https://github.com/popingalex/dsh-reference-render/tree/main/examples/conversation-demo)（渲染接线）· [sidebar-demo](https://github.com/popingalex/dsh-reference-render/tree/main/examples/sidebar-demo)（内容认领方）· [minimal](https://github.com/popingalex/dsh-reference-render/tree/main/examples/minimal) / [contribution](https://github.com/popingalex/dsh-reference-render/tree/main/examples/contribution)（源码走读）
- 本地复现截图：[docs/local-demo.md](./docs/local-demo.md)

渲染器不拥有业务真相（`View ≠ Truth`）：未认领引用保持素 chip，卸载插件宿主零残留。

## License

[MIT](./LICENSE)
