# Example B — Plugin Contribution

`src/plugin.tsx`: three fake domains (deployment / verification / evidence) contribute hover content via the `reference.hover.content` chain slot and claim activation via the `reference/open` serial event — demonstrating multiple plugins cooperating around one domain-neutral protocol while the renderer understands none of them.

Run: `pnpm test` (acceptance in `tests/examples.spec.tsx`, "Example B" block).
