#!/usr/bin/env node
/**
 * Sanitization scan: every byte the public can reach must be free of private
 * identifiers. Surfaces:
 *
 *   tracked  — files in the git index (what a clone of HEAD shows)
 *   package  — the contents of the `npm pack` tarball (what npm shows)
 *   history  — every blob in every reachable commit (what a clone of the
 *              repository's object store shows)
 *   metadata — commit author/committer identity and messages, which are not
 *              file blobs and so need their own pass
 *
 * CI scans tracked + package: what a checkout and the published artifact
 * contain. `--release` adds history + metadata, because a public clone also
 * exposes the object store and the commits in it — and whose name a commit
 * carries is the maintainer's publication decision, not a per-PR defect.
 *
 * The receipt records a count and hit locations only — rule names and matched
 * samples stay on stderr, so a published CI artifact cannot echo them.
 *
 * Built-in rules ship with the repo. Host-specific rules live in
 * scripts/private-rules.local.json (gitignored) and load when the file exists.
 * Any hit fails closed.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const RULES = [
  { name: 'developer-machine absolute path', pattern: /\/Users\/[A-Za-z0-9_.-]+\//, allowIn: ['CONTRIBUTING.md'] },
  { name: 'LAN IP', pattern: /192\.168\.\d{1,3}\.\d{1,3}/, allowIn: [] },
  { name: 'localhost port 18xxx/44xx/518x (non-doc)', pattern: /(127\.0\.0\.1|localhost):(18\d{3}|44\d{2}|518\d)/, allowIn: ['COMPATIBILITY.md'] },
  { name: 'private key material', pattern: /(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,})/, allowIn: [] },
  { name: 'private endpoint scope', pattern: /\.internal|\.local:|\.corp\b/, allowIn: [] },
  { name: 'private plan numbering', pattern: /goal \d{4}\/\d{2}|docs\/goals\/|规划 §|审计 R[0-9]|plan §[0-9]|R[0-7]\.[0-9]+|\bR[0-7]\b|0927/, allowIn: [] },
]

/**
 * Host-specific rules — personal identities, internal working-document names —
 * live in the gitignored `scripts/private-rules.local.json`, so the shipped
 * scanner does not itself publish what it looks for. A rule marked
 * `releaseOnly` fires just at publication, where exposing a personal namespace
 * or commit identity is a decision the maintainer makes, not a per-PR defect.
 *
 * A rule may narrow itself with `pinSurfaces`: a repository owner string belongs
 * in package.json `repository` and in README links — that is authorship — so the
 * rule that catches it in commit metadata must not also fire on the working tree,
 * or the scanner would forbid the package's own homepage. Pin to the surfaces
 * where the same string can only mean leakage.
 */
const localRulesPath = path.join(root, 'scripts', 'private-rules.local.json')
const releaseRules = []
if (existsSync(localRulesPath)) {
  const local = JSON.parse(readFileSync(localRulesPath, 'utf8'))
  for (const rule of local.rules ?? []) {
    const entry = {
      name: rule.name,
      pattern: new RegExp(rule.pattern, rule.flags ?? 'u'),
      allowIn: rule.allowIn ?? [],
      ...(rule.pinSurfaces ? { pinSurfaces: new Set(rule.pinSurfaces) } : {}),
    }
    if (rule.releaseOnly) releaseRules.push(entry)
    else RULES.push(entry)
  }
}

const releaseMode = process.argv.includes('--release')
if (releaseMode && releaseRules.length === 0) {
  console.error('--release needs host-specific rules: add the personal-identity patterns to scripts/private-rules.local.json with "releaseOnly": true')
  process.exit(1)
}
const activeRules = releaseMode ? [...RULES, ...releaseRules] : RULES

const SELF_EXCLUDED = new Set(['sanitize-scan.mjs', 'private-rules.local.json'])
const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico'])

/** A pinned rule does not fire on surfaces outside its pin. */
function ruleAppliesTo(rule, surface) {
  return rule.pinSurfaces === undefined || rule.pinSurfaces.has(surface)
}

function trackedRelPaths() {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: root })
  return out.toString('utf8').split('\0').filter(Boolean)
}

function isScannable(rel) {
  return !SELF_EXCLUDED.has(path.basename(rel)) && !BINARY_EXT.has(path.extname(rel))
}

function scanText(rel, text, rule, findings, surface) {
  if (rule.allowIn.includes(rel)) return
  if (!ruleAppliesTo(rule, surface)) return
  const matches = text.match(new RegExp(rule.pattern.source, 'gu'))
  if (matches !== null) {
    findings.push({ surface, file: rel, rule: rule.name, count: matches.length, samples: matches.slice(0, 3) })
  }
}

/** tracked + package surfaces: plain files on disk. */
function scanFiles(files, read, surface, findings) {
  let scanned = 0
  for (const rel of files) {
    if (!isScannable(rel)) continue
    scanned += 1
    const text = read(rel).toString('utf8')
    for (const rule of activeRules) scanText(rel, text, rule, findings, surface)
  }
  return scanned
}

function reachableCommits() {
  return execFileSync('git', ['rev-list', '--all'], { cwd: root }).toString('utf8').trim().split('\n').filter(Boolean)
}

/** history surface: one `git grep` per rule over every reachable commit. */
function scanHistory(commits, findings) {
  let hits = 0
  for (const rule of activeRules) {
    if (!ruleAppliesTo(rule, 'history')) continue
    let out = ''
    try {
      out = execFileSync('git', ['grep', '-I', '-n', '-P', '-e', rule.pattern.source, ...commits], {
        cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
      })
    } catch (error) {
      if (error.status === 1) out = ''
      else throw new Error(`git grep failed for rule "${rule.name}": ${error.message}`)
    }
    for (const line of out.split('\n').filter(Boolean)) {
      const sep = line.indexOf(':')
      const rel = line.slice(sep + 1).split(':')[0]
      if (!isScannable(rel) || rule.allowIn.includes(rel)) continue
      hits += 1
      findings.push({ surface: 'history', file: rel, rule: rule.name, count: 1, samples: [line.slice(0, 120)] })
    }
  }
  return { commits: commits.length, hits }
}

/**
 * commit-metadata surface: author/committer identity and message bodies. These
 * are repository metadata, not file contents, so `git grep` over commits never
 * sees them.
 */
function scanCommitMetadata(commits, findings) {
  let hits = 0
  for (const sha of commits) {
    const record = execFileSync('git', ['show', '-s', '--format=%an <%ae> %cn <%ce> %B', sha], {
      cwd: root, encoding: 'utf8',
    })
    const before = findings.length
    for (const rule of activeRules) scanText(sha, record, rule, findings, 'commit-metadata')
    hits += findings.length - before
  }
  return hits
}

function scanPackage(findings) {
  const work = mkdtempSync(path.join(tmpdir(), 'dsh-ref-sanitize-'))
  try {
    const packed = execFileSync('npm', ['pack', '--pack-destination', work], { cwd: root, encoding: 'utf8' })
    const tgz = packed.split('\n').map((line) => line.trim()).filter((line) => line.endsWith('.tgz')).pop()
    if (tgz === undefined) throw new Error('npm pack produced no tarball name')
    execFileSync('tar', ['xzf', path.join(work, tgz), '-C', work])
    const packageRoot = path.join(work, 'package')
    const files = execFileSync('find', [packageRoot, '-type', 'f'], { encoding: 'utf8' })
      .split('\n').filter(Boolean).map((abs) => path.relative(packageRoot, abs))
    return scanFiles(files, (rel) => readFileSync(path.join(packageRoot, rel)), 'package', findings)
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

const findings = []
const commits = reachableCommits()
const trackedFiles = trackedRelPaths()
const trackedScanned = scanFiles(trackedFiles, (rel) => readFileSync(path.join(root, rel)), 'tracked', findings)
const packageScanned = scanPackage(findings)
const history = releaseMode ? scanHistory(commits, findings) : { commits: commits.length, hits: 0 }
const metadataHits = releaseMode ? scanCommitMetadata(commits, findings) : 0

const result = {
  scan: 'sanitize',
  surfaces: {
    tracked: { source: 'git ls-files', filesScanned: trackedScanned },
    package: { source: 'npm pack', filesScanned: packageScanned },
    ...(releaseMode ? {
      history: { source: 'git rev-list --all', commits: history.commits, hits: history.hits },
      'commit-metadata': { source: 'git show --format=%an %ae %cn %ce %B', commits: commits.length, hits: metadataHits },
    } : {}),
  },
  mode: releaseMode ? 'release' : 'ci',
  ruleCount: activeRules.length,
  filesScanned: trackedScanned + packageScanned,
  findings: findings.map(({ surface, file, count }) => ({ surface, file, count })),
  passed: findings.length === 0,
  scannedAt: new Date().toISOString(),
}
mkdirSync(path.join(root, 'acceptance'), { recursive: true })
writeFileSync(path.join(root, 'acceptance', 'sanitize-scan.json'), JSON.stringify(result, null, 2))
if (findings.length > 0) {
  console.error('sanitize scan FAILED:', JSON.stringify(findings, null, 2))
  process.exit(1)
}
console.log(
  `sanitize scan PASS (mode ${releaseMode ? 'release' : 'ci'}, tracked ${trackedScanned}, package ${packageScanned}, ${activeRules.length} rules) → acceptance/sanitize-scan.json`,
)
