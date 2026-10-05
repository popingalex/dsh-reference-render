# Changelog

All notable changes to this project are documented here. Format: Keep a Changelog; versioning: SemVer.

## [0.1.0] - 2026-10-05

First public release candidate (contract freeze v0.1).

### Added
- Wire syntax `[label](dsh-ref:<kind>:<id>)` with deterministic parsing and safe degradation (`src/wire.ts`).
- `ReferenceDescriptor` v0.1 with reserved `namespace` field and canonical `dsh-resource://` normalization (`src/descriptor.ts`).
- Inline chips: `ReferenceChip` (with optional `statusBarColor` for stateful resources), `StatusRefChip` (kind label + business status dot).
- Hover lifecycle: `useReferenceHoverController` / `ReferenceHoverProvider` / `ReferenceHoverPanel` with AbortSignal stale suppression (open delay 250ms, close grace 150ms defaults).
- `reference/open` typed cordis serial event contract (first-bail-wins; decline = undefined/false/null).
- `reference.hover.content` chain slot declaration (SlotMap declare-merge) for hover content contribution.
- Conversation integration building blocks: `decorateChatNode` (in-place decorator with clean restore, HMR-safe dedup), `WireText` segment renderer with per-segment failure isolation (`SegmentBoundary`), `WireInteractionProvider`.
- Host-half authoring guidance systemPrompt section (configurable kind vocabulary via patch row config).
- Self-contained stylesheet injection (`ensureReferenceStyles`).
- Contracts frozen under `contracts/`; executable examples under `examples/`; `pnpm verify` gate (typecheck, tests incl. stream-split regression + security gate, build, pack audit, sanitize scan).
