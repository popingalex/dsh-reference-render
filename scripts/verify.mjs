#!/usr/bin/env node
/**
 * pnpm verify —— verification suite 统一入口。
 *
 * 机械执行：typecheck → unit/contract tests（含 stream-split 全边界回归 +
 * security gate）→ build → npm pack（dry-run）→ package contents audit →
 * sanitization scan。任一步失败即整体失败（fail-closed）。
 */
import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const steps = []
let failed = false

function run(name, command, args = [], env = {}) {
  const startedAt = new Date().toISOString()
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: false, env: { ...process.env, ...env } })
  const ok = result.status === 0
  steps.push({ step: name, command: [command, ...args].join(' '), ok, exitCode: result.status, startedAt })
  if (!ok) failed = true
  return ok
}

mkdirSync(path.join(root, 'acceptance'), { recursive: true })

run('typecheck', 'npx', ['tsc', '--noEmit'])
run('tests', 'npx', ['vitest', 'run'])
if (!failed) run('build', 'npx', ['tsdown'])
if (!failed) run('pack-audit', 'node', ['scripts/pack-audit.mjs'])
if (!failed) run('sanitize-scan', 'node', ['scripts/sanitize-scan.mjs'])

const verdict = { suite: 'pnpm verify', allPassed: !failed, steps, finishedAt: new Date().toISOString() }
writeFileSync(path.join(root, 'acceptance', 'verify-results.json'), JSON.stringify(verdict, null, 2))
console.log(`\nverify: ${failed ? 'FAIL' : 'PASS'} (${steps.filter((s) => s.ok).length}/${steps.length} steps) → acceptance/verify-results.json`)
process.exit(failed ? 1 : 0)
