#!/usr/bin/env node
/**
 * 装箱清单审计：装箱内容由 package.json 的 `files` allowlist 决定，本脚本
 * 再对装箱结果做负向检查——不得出现 lockfile、依赖目录、本地状态目录或
 * 验收收据目录。
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const dryRun = execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: root, encoding: 'utf8' })
const jsonStart = dryRun.indexOf('[')
const packed = JSON.parse(jsonStart >= 0 ? dryRun.slice(jsonStart) : dryRun)
const entries = (packed[0]?.files ?? []).map((file) => file.path).sort()
const forbidden = [
  /(^|\/)node_modules\//,
  /pnpm-lock\.yaml$/,
  /package-lock\.json$/,
  /\.dsh-home/,
  /acceptance\//,
  /(^|\/)docs\/goals\//,
]
const violations = entries.filter((entry) => forbidden.some((rule) => rule.test(entry)))

const result = {
  audit: 'package-contents', packageName: packed[0]?.name, packageVersion: packed[0]?.version,
  fileCount: entries.length, files: entries,
  violations, passed: violations.length === 0,
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
