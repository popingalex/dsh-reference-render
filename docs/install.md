# Install reference

Full install, update, uninstall, source-install, and troubleshooting reference. The main [README](../README.md) keeps only the shortest paths.

## Requirements

- A working `dsh web` (create the profile from the web template first — `dsh plugin add` on a profile that does not exist creates one with no app bundle, and boot then shows nothing)
- Node.js `^22.19` or `>=24`, pnpm 10+
- Replace `web` with your profile name

## Version policy

This package is tested only on **DSH 0.2.1-alpha.1**. `engines.dsh` pins that exact version. `@latest` and a caret range will track later releases this package has not been tested with. The host's install-time check reads the `@deepseek-ai/dsh*` entries in `peerDependencies` and rejects an install whose runtime does not satisfy them; `engines.dsh` itself is declarative.

| Your DSH | Install |
|---|---|
| **0.2.1-alpha.1** | `dsh plugin --profile web add dsh-reference-render@0.1.0` |
| anything else | No supported release. Move DSH to 0.2.1-alpha.1 first |

## Install

From the registry:

```bash
dsh plugin --profile web add dsh-reference-render@0.1.0
```

From a source checkout's tarball:

```bash
git clone <this repo> && cd dsh-reference-render && pnpm install && pnpm build && npm pack
dsh plugin --profile web add ./dsh-reference-render-0.1.0.tgz
```

`dsh plugin add` appends the package to the profile bundle list and applies the package `cordis.patch.yml`. Leave the profile's own `cordis.patch.yml` unchanged — a second insert of `id: dsh-reference-render` is refused at boot as a duplicate loader entry id.

Confirm the layer before restarting:

```bash
dsh --profile web --dump-config | grep -A1 'id: dsh-reference-render'
```

Restart DSH Web after install. The host half registers a systemPrompt section, so a restart is required. A later client-only change is picked up by a hard refresh (Cmd/Ctrl+Shift+R).

### Demo bundles

The primitives ship chips, hover, and open. Conversation wiring and content claimants are separate demo bundles — install all three into the same profile to see the full surface:

```bash
dsh plugin --profile web add dsh-reference-render-demo@0.2.4
dsh plugin --profile web add dsh-reference-render-sidebar-demo@0.1.2
```

### Update

```bash
dsh plugin --profile web add dsh-reference-render@<version>
```

Pin the version. Restart afterwards. A client-only change needs only a hard refresh.

### Uninstall

```bash
dsh plugin --profile web remove dsh-reference-render
```

That removes the dependency and the bundle layer and leaves no core patch. Then restart.

### Git install

```text
1. git clone <this repo> && cd dsh-reference-render && pnpm install && pnpm build
2. dsh --profile web --from-default-profile web
3. dsh plugin --profile web add <clone directory>
4. dsh --profile web --dump-config | grep -A1 'id: dsh-reference-render'
5. Restart DSH Web
```

A git install fetches source. `prepare` builds `lib/` after that fetch. pnpm skips a git dependency's `prepare` until the profile's `pnpm-workspace.yaml` lists it under `allowBuilds`. That entry is permission for the package to run code on the machine at install time.

A registry install and a tarball (`npm pack`) already contain `lib/`. They do not need that permission.

## Troubleshooting

| What you see | What to do |
|---|---|
| No profile, or boot shows an empty UI | Run `dsh --profile web --from-default-profile web`, then `dsh plugin add` |
| Boot reports a duplicate loader entry id | The profile `cordis.patch.yml` still has a handwritten `id: dsh-reference-render` row. Remove that row. Keep the layer `dsh plugin add` wrote into the bundle list |
| `ERR_PNPM_ADDING_TO_ROOT` | This web template marks the profile as a pnpm workspace root. Add `ignore-workspace-root-check=true` to that profile's `.npmrc` and run the same `dsh plugin add`. Logs are under the profile's `.plugin-manager/logs` |
| Git install has no `lib/` | Allow this package under `allowBuilds` in the profile `pnpm-workspace.yaml`, then install again |
| Chips do not appear in the conversation | Install the demo bundles too (see above) — the primitives alone ship no conversation wiring |
| Boot renames or drops a bundle after you rename packages | `dsh.profile.bundles` in the profile `package.json` is an explicit ordered list; a renamed package must be renamed there too, or its layer is silently skipped |

See [COMPATIBILITY.md](../COMPATIBILITY.md) for the tested DSH/Node matrix.
