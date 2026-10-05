# Changelog

All notable changes to this project are documented here. Format: Keep a Changelog; versioning: SemVer.

## [0.1.0] - 2026-10-05

First public release candidate (contract freeze v0.1).

### Added
- Bundle row id `dsh-reference-render`, plugin `name` export, and `locale/en.json` + `locale/zh.json` display metadata for the plugin manager.
- Companion demo bundles (repository `examples/`, not part of this tarball): `dsh-reference-render-demo@0.2.5` (conversation wiring: assistant and user renderers, hover panel host) and `dsh-reference-render-sidebar-demo@0.1.6` (content claimant: demo domains, resource tab, hover cards, chip decorations). Install all three to reproduce the README screenshots.
- `dsh.manifestVersion` 1, `publishConfig.access` `public`, and `icon.svg` for the plugin-manager card. Install docs pin `dsh-reference-render@0.1.0` on DSH 0.2.1-alpha.1.
- `reference/open` carries `workspace` when the session belongs to one, and omits it when the session belongs to none. Example content claims on that field: deployment, verification, and evidence require a workspace; service SRV-1 requires none.
- `prepare` builds `lib/` so a git install can load the client half after `allowBuilds` permission. Registry installs and tarballs ship `lib/` and do not need that permission.
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
