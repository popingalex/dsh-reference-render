#!/usr/bin/env node
/**
 * Package allowlist 审计：npm pack --dry-run 的装箱清单必须与 package.json
 * files allowlist 一致（不多不少），且不得包含 lockfile/缓存/私有产物。
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const dryRun = execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: root, encoding: 'utf8' })
const packed = JSON.parse(dryRun)
const entries = (packed[0]?.files ?? []).map((file) => file.path).sort()
const forbidden = [/(^|\/)node_modules\//, /pnpm-lock\.yaml$/, /package-lock\.json$/, /\.dsh-home/, /acceptance\//]
const violations = entries.filter((entry) => forbidden.some((rule) => rule.test(entry)))

const FORBIDDEN_RULES_SOURCE = forbidden.map((rule) => rule.source)
const result = {
  audit: 'package-contents', packageName: packed[0]?.name, packageVersion: packed[0]?.version,
  fileCount: entries.length, files: entries,
  forbiddenRules: FORBIDDEN_RULES_SOURCE, violations, passed: violations.length === 0,
  auditedAt: new Date().toISOString(),
}
mkdirSync(path.join(root, 'acceptance'), { recursive: true })
writeFileSync(path.join(root, 'acceptance', 'package-audit.json'), JSON.stringify(result, null, 2))
writeFileSync(path.join(root, 'acceptance', 'package-contents.txt'), entries.join('\n') + '\n')
if (violations.length > 0) {
  console.error('package audit FAILED:', violations)
  process.exit(1)
}
console.log(`package audit PASS (${entries.length} files) → acceptance/package-audit.json`)
