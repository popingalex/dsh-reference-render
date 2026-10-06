[中文](./README.zh-CN.md) · English

# dsh-reference-render

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![DSH 0.2.1-alpha.1](https://img.shields.io/badge/DSH-0.2.1--alpha.1-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)

Domain-neutral **structured reference rendering** for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) conversations: `[label](dsh-ref:<kind>:<id>)` becomes an inline chip — dot/bar/icon decorations on either side, hover preview, click-to-open. The renderer understands **no business domain**; content comes from other plugins through frozen contracts.

![Eight references: dot and bar styles, icons on both sides, hover preview and right sidebar](./docs/assets/demo/eight-refs-hover-sidebar.png)

## Install

```bash
dsh plugin --profile web add dsh-reference-render@0.1.0
```

Tested on DSH 0.2.1-alpha.1 only — see [COMPATIBILITY.md](./COMPATIBILITY.md) and [docs/install.md](./docs/install.md) (demo bundles, git install, troubleshooting).

## Usage

**Emit** — a plain GFM link becomes a chip; without the plugin it degrades to an ordinary link:

```text
Build completed. See [RP-42](dsh-ref:report:RP-42) for details.
```

**Decorate** — a content plugin claims a reference and supplies dot/bar/icon decorations for either side, up to 3 per side. An icon without a color follows the text color; `mode: 'image'` renders an original-color `<img>`. Unclaimed references stay plain chips — hover and click are no-ops.

**Contribute** — two chain slots and one serial event:

```ts
ctx.effect(() => ctx.slots.inject('reference.hover.content', () =>
  ctx.slots.register({ name: 'reference.hover.content',
    select: (owner) => isOurs(owner.descriptor) ? {} : null }, MyHoverCard)))

ctx.on('reference/open', ({ descriptor }) =>
  isOurs(descriptor) ? (ctx.sidebarRight.openResource(descriptor.uri), { handled: true }) : undefined)
```

## Reference

- Frozen contracts: [contracts/](./contracts) — syntax, descriptor (+[schema](./contracts/reference-descriptor.schema.json)), render hook, interaction events, [contribution & decorations](./contracts/reference-contribution.md), [COMPATIBILITY](./COMPATIBILITY.md)
- Skill for agents/plugins: [skill/dsh-reference-rendering](./skill/dsh-reference-rendering/SKILL.md) — prompt-only emission rules, or full plugin integration
- Examples: [conversation-demo](https://github.com/popingalex/dsh-reference-render/tree/main/examples/conversation-demo) (wiring) · [sidebar-demo](https://github.com/popingalex/dsh-reference-render/tree/main/examples/sidebar-demo) (content claimant) · [minimal](https://github.com/popingalex/dsh-reference-render/tree/main/examples/minimal) / [contribution](https://github.com/popingalex/dsh-reference-render/tree/main/examples/contribution) (source walkthroughs)
- Reproduce the screenshots locally: [docs/local-demo.md](./docs/local-demo.md)

The renderer owns no business truth (`View ≠ Truth`): unclaimed references stay plain chips, and removing the plugin leaves the host unchanged.

## License

[MIT](./LICENSE)
