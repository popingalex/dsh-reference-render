---
name: dsh-reference-rendering
description: Teach a DSH agent or plugin to emit and consume structured inline references — [label](dsh-ref:kind:id) wire syntax, decorations, hover/sidebar contribution contracts, and the no-plugin degradation path. Use when the user's plugin should render clickable reference chips, or when their prompts/rules should produce resolvable inline references without installing anything.
---

# Structured inline references for DSH

Two independent modes. Pick by what the user has:

- **Mode A — prompt-only** (nothing to install): the agent emits `[label](dsh-ref:<kind>:<id>)` in its replies. Without the renderer plugin this shows as an ordinary markdown link that still reads well; with the plugin installed it becomes a chip with hover preview and click-to-open.
- **Mode B — plugin integration** (user is writing a DSH plugin): contribute content and claim activation around the same syntax using the `dsh-reference-render` primitives.

## Mode A — emit references from prompts and rules

Add this block to the agent's rules / system prompt / AGENTS.md:

```text
行内资源引用：当回答提到一个真实存在、可解析、适合用户继续打开的资源时，
用 markdown 链接书写：[标签](dsh-ref:<kind>:<id>)，例如 [WI-0001](dsh-ref:issue:WI-0001)。
- 只引用当前工作区真实存在、可解析的资源；严禁编造 ID。
- 新建资源必须等权威操作成功返回真实 ID 之后，才允许生成指向它的引用。
- 普通文字不强制写成引用；不要为了展示能力而堆砌引用。
- kind 使用宿主工作区既有的资源词表（issue、report、deployment、knowledge、
  evidence、service、plan……）；标签保持简短（编号或标题）。
- 会话中已出现的引用、以及工具结果中返回的资源 ID，都是真实可解析的——按原样书写。
```

Why this syntax: it is a plain GFM link. Any renderer without the plugin shows `[label](dsh-ref:kind:id)` as a normal link labeled `label` — readable, no JSON, no HTML. With the renderer installed, the same text becomes an inline chip with hover preview and click-to-open. Emitting it is always safe.

Parsing (if the user's own tooling needs to read these back):

```js
const WIRE = /\[([^\]]*)\]\((dsh-ref:[^)\s]*)\)/g
// target = "dsh-ref:<kind>:<id>"; kind has no whitelist; id may contain : / #
// malformed or half-streamed targets simply do not match — degrade to plain text
```

## Mode B — plugin integration (dsh-reference-render primitives)

For a plugin that should claim references of its own kinds (chip decorations, hover preview, click-to-open). Requires `dsh-reference-render` installed in the same profile.

### Non-negotiables (each one was a silent failure in practice)

1. **Declare before contribute.** A chain slot must be declared in the consuming registration's `children` table. A contributor's `slots.inject(slot, factory)` factory **never runs** for an undeclared slot — silently.
2. **Dispatch `reference/open` from `ctx.root`.** Cordis serial events only bubble to ancestors. A listener in a sibling plugin scope never fires from a sibling dispatch — no error is reported.
3. **Stable slot-component identity.** Never wrap a slot component in an HOC that creates a new function each render: React remounts the whole subtree and resets provider state every frame. Bind services to a module-level reference instead.
4. **The sidebar tab definition's `title` is required.** `claim()` calls `definition.title(address)` unconditionally; a missing title throws only as an unhandled rejection.

### Contribute hover preview + chip decoration + activation

```ts
// your-plugin client entry
export const inject = ['slots', 'sidebarRight']   // strict accessor: missing entry = throw

export function apply(ctx) {
  // hover preview — chain slot, first match wins; return null to decline
  ctx.effect(() => ctx.slots.inject('reference.hover.content', () =>
    ctx.slots.register({
      name: 'reference.hover.content',
      select: (owner) => isOurs(owner.descriptor) ? {} : null,
    }, MyHoverCard)))

  // chip decorations — data only; the wiring plugin renders StatusRefChip with it
  ctx.effect(() => ctx.slots.inject('reference.chip.decor', () =>
    ctx.slots.register({
      name: 'reference.chip.decor',
      select: (owner) => isOurs(owner.descriptor) ? {
        typeLabel: '部署', status: 'succeeded', statusColor: '#4caf50', statusBar: 'bind',
        decorations: { left: [{ kind: 'icon', src: ICON_SVG_DATA_URI }] },
      } : null,
    }, function DecorData() { return null })))

  // activation — typed cordis serial, first taker wins; decline = return undefined
  ctx.on('reference/open', ({ descriptor }) =>
    isOurs(descriptor) ? (ctx.sidebarRight.openResource(descriptor.uri), { handled: true }) : undefined)
}
```

`decorations` per side, up to 3 each (6 total): `{ kind: 'dot' | 'bar' | 'icon', color?, src?, mode?: 'tint' | 'image', size? }`. `icon` without `color` follows the system text color (CSS mask); `mode: 'image'` renders an original-color `<img>`; `src` accepts https: or data:image/ only.

### Resource detail page (click-through target)

Register a `ResourceProvider` (async generator of `{ ok, value }` frames, abort-aware) plus a sidebar tab whose `patterns` claim your `dsh-resource://<kind>/**` addresses, and register the tab body/title into `sidebar.right.pane.tab` / `.title`. See `contracts/reference-contribution.md` in the dsh-reference-render repository for the full shapes, and `examples/sidebar-demo` for a working implementation.

### Verify your integration

1. Restart the profile after install (`dump-config` must list your bundle layer).
2. Send a message containing `[label](dsh-ref:<your-kind>:<id>)` — input and output both render chips.
3. Hover: your preview card. Click: your detail page. An unclaimed kind: plain chip, no panel, click is a no-op.
