# dsh-reference

Domain-neutral **structured reference rendering & interaction primitives** for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) conversations and panels.

Turn structured text references into prominent inline chips, with hover previews, activation routing, and a contribution contract that lets **other plugins** supply domain content — while this package understands **no business domain at all**.

```text
Build completed. See [RP-42](dsh-ref:report:RP-42) for details.
                 └ rendered as an inline chip: hover → preview, click → open
```

## Why

DSH conversations carry structured references (issues, reports, deployments, knowledge…). Plain markdown links degrade to inert text. `dsh-reference` provides the missing primitive layer:

- **wire syntax** — `[label](dsh-ref:<kind>:<id>)`, a GFM-link-compatible form that degrades safely in any renderer and is streaming-safe by construction;
- **ReferenceDescriptor** — a domain-neutral identity (`uri` + open-vocabulary `kind`), never carrying canonical business state;
- **inline chips** — accessible, styled, single visual implementation;
- **hover previews** — debounce/grace lifecycle with AbortSignal stale-suppression, content contributed via a chain slot;
- **activation** — `reference/open` typed cordis serial event (first-bail-wins) routing to whoever claims the reference;
- **authoring guidance** — a systemPrompt section teaching agents the syntax and its discipline (never invent IDs).

## Install

```bash
# into a DSH profile (tested path)
dsh plugin --profile web add <path-to-dsh-reference-0.1.0.tgz>
# npm / GitHub (after publication)
dsh plugin --profile web add dsh-reference
dsh plugin --profile web add github:dsh-reference/dsh-reference
```

See [COMPATIBILITY.md](./COMPATIBILITY.md) for the tested DSH/Node matrix and known constraints.

## Usage

### Render wire references (any React surface)

```tsx
import { WireText } from 'dsh-reference/runtime'

<WireText
  text={'Build completed. See [RP-42](dsh-ref:report:RP-42).'}
  renderText={(text) => <MarkdownText text={text} streaming={streaming} labels={labels} />}
/>
```

### Contribute hover content / claim activation (your plugin)

```ts
// hover preview — chain slot, first-match wins
ctx.effect(() => ctx.slots.inject('reference.hover.content', () =>
  ctx.slots.register({
    name: 'reference.hover.content',
    select: (owner) => owner.descriptor.kind === 'deployment' ? {} : null,
  }, DeploymentHoverCard)))

// activation — typed serial event, first-taker wins
ctx.on('reference/open', ({ descriptor }) =>
  descriptor.kind === 'deployment' ? (openDeployment(descriptor), referenceHandled()) : undefined)
```

### Conversation integration

The official `conversation.chat.node` keyed slot has **no public link-component seam** in DSH 0.2.1-alpha.1; this package therefore ships the building blocks rather than a takeover: `decorateChatNode` (community-standard in-place decorator with clean restore) + `WireText` segment renderer. Hosts that own a chat node body compose them; see [contracts/render-hook.md](./contracts/render-hook.md).

## Contracts (frozen v0.1)

| Contract | Doc |
|---|---|
| Reference syntax | [contracts/reference-syntax.md](./contracts/reference-syntax.md) |
| ReferenceDescriptor | [contracts/reference-descriptor.md](./contracts/reference-descriptor.md) / [schema](./contracts/reference-descriptor.schema.json) |
| Render hook | [contracts/render-hook.md](./contracts/render-hook.md) |
| Interaction events | [contracts/reference-interaction-events.md](./contracts/reference-interaction-events.md) |
| Contribution | [contracts/reference-contribution.md](./contracts/reference-contribution.md) |
| Compatibility | [COMPATIBILITY.md](./COMPATIBILITY.md) |

## Examples (executable, run in CI)

- [examples/minimal](./examples/minimal) — text → parse → chip → hover, zero business domain.
- [examples/contribution](./examples/contribution) — three fake domains (deployment/verification/evidence) contributing hover content and claiming activation around one domain-neutral protocol.

## Verify

```bash
pnpm verify   # typecheck → tests (incl. stream-split regression + security gate) → build → pack audit → sanitize scan
```

## Boundary

This renderer owns **no business truth**. It does not resolve domains, cache status, or duplicate canonical state — `View ≠ Truth`. Domains are contributed by plugins through the frozen contracts above.

## License

[MIT](./LICENSE)
