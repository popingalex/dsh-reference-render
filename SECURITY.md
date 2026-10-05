# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | ✅ |

## Reporting

Report vulnerabilities privately to the maintainers (GitHub Security Advisory on the repository once published). Do not open public issues for exploitable findings.

## Security posture (v0.1)

- Rendering is React-escaped; the package renders **no raw HTML** and exposes **no `dangerouslySetInnerHTML`** path. Labels/URIs from assistant text are inert text (tested: `tests/security.spec.tsx`).
- Wire parsing refuses malformed/unknown-scheme targets — no opaque identities, no `javascript:`/`data:` execution surfaces (tested).
- Decoration icons load only from `https:` or `data:image:` sources, always through `<img>` or CSS mask (SVG markup is never inlined, so scripts inside SVG cannot execute); `javascript:` and other `data:` types are refused (tested).
- The package has **zero network surface**: no endpoints, no telemetry, no credentials. Hover/sidebar data comes from contribution plugins; their fetch behavior is out of this package's trust boundary.
- Activation handlers run with the privileges of the hosting client; `reference/open` listeners are first-bail-wins — a hostile listener could claim activation. Install plugins you trust (same trust model as DSH plugin installation generally).
- Package contents are allowlisted (`files` in package.json) and audited in CI (`scripts/pack-audit.mjs`); a sanitization scan (`scripts/sanitize-scan.mjs`) guards against private endpoints/paths in the public tree.
