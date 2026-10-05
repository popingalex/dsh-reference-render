#!/usr/bin/env node
/**
 * Sanitization scan: every byte the public can reach must be free of private
 * identifiers. Three surfaces are covered:
 *
 *   tracked  — files in the git index (what a clone of HEAD shows)
 *   history  — every blob in every reachable commit (what a clone of the
 *              repository's object store shows)
 *   package  — the contents of the `npm pack` tarball (what npm shows)
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

const localRulesPath = path.join(root, 'scripts', 'private-rules.local.json')
if (existsSync(localRulesPath)) {
  const local = JSON.parse(readFileSync(localRulesPath, 'utf8'))
  for (const rule of local.rules ?? []) {
    RULES.push({ name: rule.name, pattern: new RegExp(rule.pattern, 'u'), allowIn: rule.allowIn ?? [] })
  }
}

const SELF_EXCLUDED = new Set(['sanitize-scan.mjs', 'private-rules.local.json'])
const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico'])

function trackedRelPaths() {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: root })
  return out.toString('utf8').split('\0').filter(Boolean)
}

function isScannable(rel) {
  return !SELF_EXCLUDED.has(path.basename(rel)) && !BINARY_EXT.has(path.extname(rel))
}

function scanText(rel, text, rule, findings, surface) {
  if (rule.allowIn.includes(rel)) return
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
    for (const rule of RULES) scanText(rel, text, rule, findings, surface)
  }
  return scanned
}

/** history surface: one `git grep` per rule over every reachable commit. */
function scanHistory(findings) {
  const commits = execFileSync('git', ['rev-list', '--all'], { cwd: root }).toString('utf8').trim().split('\n').filter(Boolean)
  let hits = 0
  for (const rule of RULES) {
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
const trackedFiles = trackedRelPaths()
const trackedScanned = scanFiles(trackedFiles, (rel) => readFileSync(path.join(root, rel)), 'tracked', findings)
const packageScanned = scanPackage(findings)
const history = scanHistory(findings)

const result = {
  scan: 'sanitize',
  surfaces: {
    tracked: { source: 'git ls-files', filesScanned: trackedScanned },
    package: { source: 'npm pack', filesScanned: packageScanned },
    history: { source: 'git rev-list --all', commits: history.commits },
  },
  ruleCount: RULES.length,
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
  `sanitize scan PASS (tracked ${trackedScanned}, package ${packageScanned}, history ${history.commits} commits, ${RULES.length} rules) → acceptance/sanitize-scan.json`,
)
