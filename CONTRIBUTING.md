# Contributing

## Ground rules

1. **Contracts are frozen** — changes to `contracts/*` semantics or the wire grammar require a major version and a written compatibility note in `COMPATIBILITY.md`.
2. **Domain neutrality** — PRs introducing business-domain semantics (specific kinds, resolvers, endpoints) will be rejected. Domains belong in contribution plugins.
3. **Evidence before change** — behavior changes need tests; the full gate is `pnpm verify` (lint, typecheck, tests incl. stream-split regression + security gate, build, pack audit, sanitize scan). CI runs the same.
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

Maintainers publish. Tag the release `vX.Y.Z` with `X.Y.Z` equal to `version` in `package.json`, then create the GitHub Release from that tag: `.github/workflows/release.yml` re-runs `pnpm verify` and publishes the packed tarball to npm with provenance.

Provenance requires the publishing npm account to have proven authorization enabled; a token publish from a maintainer machine (`npm publish --access public`) is the fallback. Before the publish step, `.github/workflows/release.yml` also runs `pnpm sanitize:release`, which adds the git-history and commit-metadata surfaces to the disclosure scan. The personal-identity patterns that surface needs live in the gitignored `scripts/private-rules.local.json`, so the scanner does not publish what it looks for; a release run without that file fails rather than scanning half the surface.

A release carries a `CHANGELOG.md` entry for its version, and a `COMPATIBILITY.md` note whenever `contracts/*` or the wire grammar changes.
