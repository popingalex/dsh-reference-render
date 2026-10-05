[中文](./README.zh-CN.md) · English

# dsh-reference-render

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![DSH 0.2.1-alpha.1](https://img.shields.io/badge/DSH-0.2.1--alpha.1-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)
![dsh](https://img.shields.io/badge/dsh-4d6bfe)
![dsh-plugin](https://img.shields.io/badge/dsh--plugin-4d6bfe)

Domain-neutral **structured reference rendering & interaction primitives** for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) conversations: `[label](dsh-ref:<kind>:<id>)` becomes an inline chip with hover preview and click-to-open. This package understands **no business domain** — content comes from other plugins through frozen contracts.

![Eight references: four dot and bar styles, icons on both sides, hover preview and right sidebar](./docs/assets/demo/eight-refs-hover-sidebar.png)

## Install

```bash
dsh plugin --profile web add dsh-reference-render@0.1.0
```

Tested on DSH 0.2.1-alpha.1 only. Full matrix, demo bundles, git install, and troubleshooting: [docs/install.md](./docs/install.md).

To reproduce the screenshots locally (a throwaway profile, two seeded conversations, no API key): [docs/local-demo.md](./docs/local-demo.md).

## Usage

**Emit** — in any message, a plain GFM link becomes a chip; without the plugin it degrades to an ordinary link:

```text
Build completed. See [RP-42](dsh-ref:report:RP-42) for details.
```

**Decorate** — a content plugin claims a reference and supplies its decorations. Dot, bar, and icon are orthogonal; each can sit on either side, up to 3 per side (6 total). An icon without a color follows the system text color (CSS mask); `mode: 'image'` renders an original-color `<img>`:

| Reference | Left | Right |
|---|---|---|
| deployment (claimed) | bar | dot |
| verification (claimed) | — | dot |
| evidence (claimed) | bar | — |
| plan (claimed, icons) | icon, bar, dot | dot, bar, icon |
| unclaimed (`gadget/MYST-2`) | — plain chip, hover and click are no-ops | |

**Contribute** — content plugins claim references through two chain slots and one serial event:

```ts
ctx.effect(() => ctx.slots.inject('reference.hover.content', () =>
  ctx.slots.register({ name: 'reference.hover.content',
    select: (owner) => isOurs(owner.descriptor) ? {} : null }, MyHoverCard)))

ctx.on('reference/open', ({ descriptor }) =>
  isOurs(descriptor) ? (ctx.sidebarRight.openResource(descriptor.uri), { handled: true }) : undefined)
```

Full contribution shapes (chip decorations, resource tab, activation payload): [contracts/reference-contribution.md](./contracts/reference-contribution.md).

## Contracts (frozen v0.1)

| Contract | Doc |
|---|---|
| Reference syntax | [contracts/reference-syntax.md](./contracts/reference-syntax.md) |
| ReferenceDescriptor | [contracts/reference-descriptor.md](./contracts/reference-descriptor.md) / [schema](./contracts/reference-descriptor.schema.json) |
| Render hook | [contracts/render-hook.md](./contracts/render-hook.md) |
| Interaction events | [contracts/reference-interaction-events.md](./contracts/reference-interaction-events.md) |
| Contribution + decorations | [contracts/reference-contribution.md](./contracts/reference-contribution.md) |
| Compatibility | [COMPATIBILITY.md](./COMPATIBILITY.md) |

## Skill: teach your agent or plugin

[`skill/dsh-reference-rendering`](./skill/dsh-reference-rendering/SKILL.md) — a drop-in skill with two modes: **prompt-only** (a rules block that makes any agent emit resolvable `dsh-ref` links; no plugin needed, degrades to plain links) and **plugin integration** (the contribution contracts above, with the four non-negotiables that were silent failures in practice).

## Examples & local demo

Runnable examples live in the repository: [`examples/conversation-demo`](https://github.com/popingalex/dsh-reference-render/tree/main/examples/conversation-demo) (conversation wiring) and [`examples/sidebar-demo`](https://github.com/popingalex/dsh-reference-render/tree/main/examples/sidebar-demo) (content claimant), installed as the `dsh-reference-render-demo` and `dsh-reference-render-sidebar-demo` bundles. Pure source walkthroughs: [`examples/minimal`](https://github.com/popingalex/dsh-reference-render/tree/main/examples/minimal) (emit → parse → chip, no domain) and [`examples/contribution`](https://github.com/popingalex/dsh-reference-render/tree/main/examples/contribution) (multi-plugin cooperation around one protocol) — both run in this repo's test suite.

To reproduce the README screenshots on your machine: [docs/local-demo.md](./docs/local-demo.md).

## Boundary

This renderer owns no business truth (`View ≠ Truth`). Domains are contributed by plugins; an unclaimed reference stays a plain chip, hover shows no panel, and a click does nothing. Removing the plugin leaves the host unchanged.

## License

[MIT](./LICENSE)
