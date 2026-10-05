# Local demo: reproduce the screenshots

Everything needed to reproduce the README screenshots (inline chips, the 2×2 status dot/bar matrix, icons on both sides, hover previews, the resource sidebar) on your own machine. This is an optional walkthrough — the plugin itself installs with the two commands in the main README.

## What you will build

A throwaway DSH profile with three bundles:

| Bundle | Role |
|---|---|
| `dsh-reference-render` | primitives: wire parsing, chips, hover lifecycle, `reference/open` |
| `dsh-reference-render-demo` | conversation wiring: assistant **and user** renderers, hover panel host |
| `dsh-reference-render-sidebar-demo` | content claimant: demo domains (deployment / verification / evidence / service / knowledge / asset / plan), resource sidebar tab, hover cards, chip decorations |

and two seeded conversations — one inside a workspace, one outside it — whose input and output messages carry `dsh-ref` references. The demo content claims per workspace: deployment, verification, and evidence claim only inside a workspace; service SRV-1 claims only outside one; anything unclaimed (e.g. `gadget/MYST-2`) stays a plain chip with hover and click doing nothing.

## Steps

```bash
# 1. build the three bundles from this repo
pnpm install && pnpm build
(cd examples/conversation-demo && npx tsdown && npm pack)
(cd examples/sidebar-demo    && npx tsdown && npm pack)
npm pack

# 2. a throwaway home + profile from the official web template
export DSH_HOME=$(mktemp -d)
dsh --profile demo --from-default-profile web

# 3. install the three tarballs (adjust paths to your checkout)
dsh plugin --profile demo add ./dsh-reference-render-0.1.0.tgz
dsh plugin --profile demo add ./examples/conversation-demo/dsh-reference-render-demo-<version>.tgz
dsh plugin --profile demo add ./examples/sidebar-demo/dsh-reference-render-sidebar-demo-<version>.tgz

# 4. seed the two demo conversations (workspace-in + workspace-out, no API key)
node examples/demo-seed.mjs --home "$DSH_HOME"

# 5. confirm all three layers landed, then boot
dsh --profile demo --dump-config | grep dsh-reference
dsh --profile demo --no-open --host 127.0.0.1 --port 18699
```

Open the printed `http://127.0.0.1:18699/?token=…` URL.

## Seeded conversations

The screenshots' conversations are recorded session logs, not live model output — no API key needed. A conversation is one multi-frame zstd file under `$DSH_HOME/sessions/<projectKey>/<sessionId>/session.v4.jsonl.zstd`:

- **first frame contains only the `session` header line**; every later event goes in a later frame (a single-frame file is rejected silently at list time)
- events after the header carry a `seq` counter starting at 0; message events carry `"surfaceOp": "append"`
- a `session/title` event's `messageSeqs` must cite the seq of a user/message event
- the session must also be listed in `$DSH_HOME/storages/workspace.json` → `tables.workspaces.<id>.sessionIds`, and a session whose `cwd` differs from every registered workspace path needs its own workspace entry there

The exact event stream used for the README screenshots (input + output refs, the 2×2 matrix, the icon rows) is in the repository under `docs/assets/demo/` notes and the examples' `README.md`. A practical shortcut: install the demo bundles, create an empty session in each workspace, and paste a message containing wire references through the composer — the input renders chips exactly like the seeded output does.

## What each screenshot shows

| Element | Where |
|---|---|
| 2×2 dot/bar matrix | deployment (dot+bar), verification (dot only), evidence (bar only) |
| plain-chip control | `gadget/MYST-2` — unclaimed, no decorations, hover/click no-op |
| icons both sides | knowledge KN-ICON (SVG tint, follows text color), asset PIC-1 (image mode), plan PLAN-9 (3 left + 3 right) |
| resource sidebar | click a claimed chip — `sidebarRight.openResource` with a frame-stream provider |
