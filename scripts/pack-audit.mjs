#!/usr/bin/env node
/**
 * 装箱清单审计：装箱内容由 package.json 的 `files` allowlist 决定，本脚本
 * 再对装箱结果做负向检查——不得出现 lockfile、依赖目录、本地状态目录或
 * 验收收据目录。
 *
 * 同时校验README 内的相对链接在 tarball 内可解析：npm 页面上的 README 脱离
 * 仓库目录树，相对链接失效即死链。示例组合包按设计不在本包 tarball 内，因此
 * README 必须用绝对仓库 URL 指向它们——这条检查把该约定变成机械门禁。
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
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

/** README 相对链接必须在装箱结果内可解析，否则 npm 页面显示死链。 */
function auditReadmeLinks() {
  const deadLinks = []
  for (const readme of ['README.md', 'README.zh-CN.md']) {
    if (!entries.includes(readme)) continue
    const text = readFileSync(path.join(root, readme), 'utf8')
    const dir = path.dirname(readme)
    for (const match of text.matchAll(/\]\((\.[^)#\s]+)(?:#[^)\s]*)?\)/g)) {
      const target = path.normalize(path.join(dir, match[1]))
      const shipped = entries.includes(target)
      const inRepo = existsSync(path.join(root, target))
      if (!shipped && !inRepo) deadLinks.push({ readme, link: match[1] })
    }
  }
  return deadLinks
}
const deadReadmeLinks = auditReadmeLinks()

const result = {
  audit: 'package-contents', packageName: packed[0]?.name, packageVersion: packed[0]?.version,
  fileCount: entries.length, files: entries,
  violations, deadReadmeLinks, passed: violations.length === 0 && deadReadmeLinks.length === 0,
  auditedAt: new Date().toISOString(),
}
mkdirSync(path.join(root, 'acceptance'), { recursive: true })
writeFileSync(path.join(root, 'acceptance', 'package-audit.json'), JSON.stringify(result, null, 2))
writeFileSync(path.join(root, 'acceptance', 'package-contents.txt'), entries.join('\n') + '\n')
if (violations.length > 0) {
  console.error('package audit FAILED:', violations)
  process.exit(1)
}
if (deadReadmeLinks.length > 0) {
  console.error('README relative links do not resolve:', deadReadmeLinks)
  process.exit(1)
}
console.log(`package audit PASS (${entries.length} files) → acceptance/package-audit.json`)
