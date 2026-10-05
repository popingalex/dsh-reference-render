# Contributing

## Ground rules

1. **Contracts are frozen** — changes to `contracts/*` semantics or the wire grammar require a major version and a written compatibility note in `COMPATIBILITY.md`.
2. **Domain neutrality** — PRs introducing business-domain semantics (specific kinds, resolvers, endpoints) will be rejected. Domains belong in contribution plugins.
3. **Evidence before change** — behavior changes need tests; the full gate is `pnpm verify` (typecheck, tests incl. stream-split regression + security gate, build, pack audit, sanitize scan). CI runs the same.
4. **Stream safety** — any parser change must keep the every-token-boundary regression suite green (`tests/stream-split.spec.ts`).

## Dev loop

```bash
pnpm install
pnpm test        # vitest
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm build       # tsdown → lib/client.js + lib/runtime.js (+d.ts)
pnpm verify      # full gate
```

## Releasing

Maintainers publish. `pnpm verify` must pass before a release. This repository does not carry a release plan.
