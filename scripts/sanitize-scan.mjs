#!/usr/bin/env node
/**
 * Sanitization scan: every git-tracked file on the public tree must be free of
 * private identifiers. The receipt records a count and hit locations only —
 * rule names and matched samples stay on stderr, so a published CI artifact
 * cannot echo them.
 *
 * Built-in rules ship with the repo. Host-specific rules live in
 * scripts/private-rules.local.json (gitignored) and load when the file exists.
 * Any hit fails closed.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const RULES = [
  { name: 'developer-machine absolute path', pattern: /\/Users\/[A-Za-z0-9_.-]+\//, allowIn: ['CONTRIBUTING.md'] },
  { name: 'LAN IP', pattern: /192\.168\.\d{1,3}\.\d{1,3}/, allowIn: [] },
  { name: 'localhost port 18xxx/44xx/518x (non-doc)', pattern: /(127\.0\.0\.1|localhost):(18\d{3}|44\d{2}|518\d)/, allowIn: ['COMPATIBILITY.md'] },
  { name: 'private key material', pattern: /(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,})/, allowIn: [] },
  { name: 'private endpoint scope', pattern: /\.internal|\.local:|\.corp\b/, allowIn: [] },
  { name: 'private plan numbering', pattern: /goal \d{4}\/\d{2}|docs\/goals\/|\b规划 §|\b审计 R\d|\bplan §\d|\bR[0-7](?:\.\d+)?\b|\b0927\b/, allowIn: [] },
]

const localRulesPath = path.join(root, 'scripts', 'private-rules.local.json')
if (existsSync(localRulesPath)) {
  const local = JSON.parse(readFileSync(localRulesPath, 'utf8'))
  for (const rule of local.rules ?? []) {
    RULES.push({ name: rule.name, pattern: new RegExp(rule.pattern, 'u'), allowIn: rule.allowIn ?? [] })
  }
}

const SELF_EXCLUDED = new Set(['sanitize-scan.mjs', 'private-rules.local.json'])

function trackedRelPaths() {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: root })
  return out.toString('utf8').split('\0').filter(Boolean)
}

const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico'])
const files = trackedRelPaths().filter((rel) => !SELF_EXCLUDED.has(path.basename(rel)) && !BINARY_EXT.has(path.extname(rel)))
const findings = []
for (const rel of files) {
  const text = readFileSync(path.join(root, rel)).toString('utf8')
  for (const rule of RULES) {
    if (rule.allowIn.includes(rel)) continue
    const matches = text.match(new RegExp(rule.pattern.source, 'gu'))
    if (matches !== null) {
      findings.push({ file: rel, rule: rule.name, count: matches.length, samples: matches.slice(0, 3) })
    }
  }
}

const result = {
  scan: 'sanitize',
  surface: 'git ls-files',
  ruleCount: RULES.length,
  filesScanned: files.length,
  findings: findings.map(({ file, count }) => ({ file, count })),
  passed: findings.length === 0,
  scannedAt: new Date().toISOString(),
}
mkdirSync(path.join(root, 'acceptance'), { recursive: true })
writeFileSync(path.join(root, 'acceptance', 'sanitize-scan.json'), JSON.stringify(result, null, 2))
if (findings.length > 0) {
  console.error('sanitize scan FAILED:', JSON.stringify(findings, null, 2))
  process.exit(1)
}
console.log(`sanitize scan PASS (${files.length} tracked files, ${RULES.length} rules) → acceptance/sanitize-scan.json`)
