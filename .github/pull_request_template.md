## What changes

One paragraph on the behavior after this change, not the path to it.

## Surfaces touched

- [ ] wire grammar (`src/wire.ts`)
- [ ] descriptor / resource addressing (`src/descriptor.ts`, `src/workspace.ts`)
- [ ] typed events (`src/events.ts`)
- [ ] slot contracts (`reference.hover.content`, `reference.chip.decor`)
- [ ] React primitives (`src/react`, `src/hover`)
- [ ] host seam (`src/integration`, `src/host.mjs`)
- [ ] packaging or CI

Anything checked in the first four groups needs the matching `contracts/*.md` row and a
`COMPATIBILITY.md` note in the same change.

## Evidence

`pnpm verify` output, or the specific tests that cover the change when the gate is
already green on the base commit. Stream-affecting parser changes must keep
`tests/stream-split.spec.ts` green.

## Domain neutrality

This package must keep understanding no business domain. If the change names a concrete
kind, resolver, or endpoint, say which contribution plugin should own it instead.
