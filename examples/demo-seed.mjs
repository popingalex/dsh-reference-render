#!/usr/bin/env node
/**
 * demo-seed — 一键复现 README 演示会话（无 API key）。
 *
 * 在一个 DSH_HOME 里种入两个会话：
 *  - default-workspace 内：2×2 状态组合对照（输入+输出都含引用）
 *  - external-demo 工作区：SRV-1 输入输出引用
 *
 * 用法：
 *   node examples/demo-seed.mjs --home <DSH_HOME> [--tgz-dir <repo root>]
 * 之后手工安装三个 tgz 并启动（见 docs/local-demo.md），打开「图标与六位装饰对照」等会话。
 *
 * 前提：profile 已由 `dsh --profile <name> --from-default-profile web` 初始化。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--home') args.home = argv[++i]
    else if (argv[i] === '--tgz-dir') args.tgzDir = argv[++i]
  }
  if (!args.home) {
    console.error('usage: node examples/demo-seed.mjs --home <DSH_HOME> [--tgz-dir <repo root>]')
    process.exit(1)
  }
  return args
}

const args = parseArgs(process.argv)

/** projectKey：路径分隔符折叠为 '-'，首尾 '--' 包裹（与 session-persistence-jsonl/format.ts 对齐）。 */
function projectKey(cwd) {
  // 与 session-persistence-jsonl/format.ts projectKey 对齐：分隔符折叠 '-'，
  // 非 [A-Za-z0-9._-] 且非分隔符的字节转义 ~XXXX，首尾 '--' 包裹。
  let readable = ''
  let separatorRun = false
  for (let i = 0; i < cwd.length; i++) {
    const code = cwd.charCodeAt(i)
    const ch = String.fromCharCode(code)
    if (ch === '/' || ch === '\\' || ch === ':') {
      if (!separatorRun) readable += '-'
      separatorRun = true
    } else if (ch !== '~' && /[A-Za-z0-9._-]/.test(ch)) {
      readable += ch
      separatorRun = false
    } else {
      readable += '~' + code.toString(16).toUpperCase().padStart(4, '0')
      separatorRun = false
    }
  }
  const slug = readable.replace(/^-+/, '') || 'root'
  return `--${slug.slice(0, 251)}--`
}

function zstdMultiFrame(frames, outPath) {
  // 多帧容器：第一帧仅 header 行，后续事件一帧；临时文件逐帧压缩后拼接
  const tmp = []
  frames.forEach((frame, index) => {
    const f = `${outPath}.frame${index}`
    writeFileSync(f, frame)
    spawnSync('zstd', ['-f', '-q', f], { stdio: 'ignore' })
    tmp.push(f)
  })
  const out = []
  for (const f of tmp) {
    out.push(readFileSync(f + '.zst'))
    spawnSync('rm', ['-f', f, f + '.zst'])
  }
  writeFileSync(outPath, Buffer.concat(out))
}

function seedSession({ home, cwd, userText, demoText, title }) {
  const slug = projectKey(cwd)
  const sid = 'session-' + cryptoUuid()
  const now = Date.now()
  let seq = 0
  const ev = (type, data) => ({ type, seq: seq++, time: now + seq * 100, data })
  const append = (e) => ({ ...e, surfaceOp: 'append' })
  const events = [
    { type: 'session', version: 4, id: sid, createdAt: now, cwd, isSeeded: false, delegationDepth: 0, agentPreset: 'standard' },
    ev('permission/preset', { preset: 'workspace-write' }),
    ev('sandbox/mode', { mode: 'workspace-write' }),
    ev('approval/policy', { policy: 'ask' }),
    ev('agent/inbox/spliced', { target: 'next-turn', start: 0, inserted: [{ content: [{ type: 'text', text: userText }], source: { kind: 'user' }, role: 'user', id: 'message-1' }] }),
    ev('turn/start', { turn: 1 }),
    ev('agent/inbox/spliced', { target: 'next-turn', start: 0, removedCount: 1, inserted: [] }),
    ev('step/start', { turn: 1, step: 1 }),
    append(ev('user/message', { content: [{ type: 'text', text: userText }], source: { kind: 'user' }, role: 'user', id: 'message-1' })),
    append(ev('assistant/message', {
      turn: 1, step: 1,
      message: { role: 'assistant', content: [{ type: 'text', text: demoText }], source: { kind: 'model', provider: 'deepseek-official', model: 'dsh-reference-render-demo' }, id: 'message-2' },
      usage: { inputTokens: 10, outputTokens: 80 },
      stream: [
        { type: 'chunk', time: now, chunk: { type: 'block-start', index: 0, blockType: 'text' } },
        { type: 'text-chunks', time0: now, index: 0, dt: [], texts: [demoText] },
        { type: 'chunk', time: now, chunk: { type: 'block-end', index: 0, block: { type: 'text', text: demoText } } },
        { type: 'chunk', time: now, chunk: { type: 'usage', usage: { inputTokens: 10, outputTokens: 80 } } },
        { type: 'chunk', time: now, chunk: { type: 'finish', reason: { kind: 'stop' } } },
      ],
    })),
    ev('session/title', { title, messageSeqs: [7], source: { kind: 'fallback' } }),
    ev('step/end', { turn: 1, step: 1 }),
    ev('turn/end', { turn: 1, reason: { kind: 'completed' } }),
  ]
  const lines = events.map((e) => JSON.stringify(e, ensureAsciiSafe(e)))
  // header id 必须与目录一致（assertStoredIdentity）
  if (JSON.parse(lines[0]).id !== sid) throw new Error('header id mismatch')
  const dir = path.join(home, 'sessions', slug, sid)
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  zstdMultiFrame([lines[0] + '\n', lines.slice(1).join('\n') + '\n'], path.join(dir, 'session.v4.jsonl.zstd'))
  return sid
}

function ensureAsciiSafe(obj) { return obj }

// 演示用途的会话 id：随机十六进制拼接，无需严格 RFC 形态
function uuid() {
  const hex = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-8${hex().slice(1)}-${hex()}${hex()}${hex()}`
}

// 演示会话的 cwd：默认放在临时区（中性路径）；可用 DSH_DEMO_ROOT 覆盖
const demoRoot = process.env.DSH_DEMO_ROOT ?? '/tmp/dsh-reference-render-demo'
const A = `${demoRoot}/workspace`
const B = `${demoRoot}/external`
mkdirSync(A, { recursive: true })
mkdirSync(B, { recursive: true })

const sidA = seedSession({
  home: args.home, cwd: A,
  userText: '请对照汇报 [DEP-207](dsh-ref:deployment:DEP-207) 和 [MYST-2](dsh-ref:gadget:MYST-2)。',
  demoText: [
    '状态点 × 状态条 2×2 对照：',
    '',
    '① 有点+有条：Deployment [DEP-207](dsh-ref:deployment:DEP-207) succeeded.',
    '',
    '② 有点+无条：Verification [VR-88](dsh-ref:report:VR-88) passed.',
    '',
    '③ 无点+有条：Evidence [EV-15](dsh-ref:evidence:EV-15) was archived.',
    '',
    '④ 无点+无条（域外未认领）：[MYST-2](dsh-ref:gadget:MYST-2) —— 素 chip，hover/点击干净降级。',
  ].join('\n'),
  title: '2×2 组合对照（工作区内）',
})
const sidB = seedSession({
  home: args.home, cwd: B,
  userText: '检查 [SRV-1](dsh-ref:service:SRV-1) 的状态。',
  demoText: 'Service [SRV-1](dsh-ref:service:SRV-1) is live —— 探针 3/3 通过，详情见侧栏资源页。',
  title: '外部工作区演示（输入+输出引用）',
})

// workspace 登记
const wsPath = path.join(args.home, 'storages', 'workspace.json')
const ws = JSON.parse(readFileSync(wsPath, 'utf8'))
const mainId = ws.global.defaultWorkspaceId
for (const sid of [sidA, sidB]) {
  const owner = sid === sidA ? mainId : null
  void owner
}
ws.tables.workspaces[mainId].sessionIds = [...new Set([...(ws.tables.workspaces[mainId].sessionIds ?? []), sidA])]
const extEntry = Object.values(ws.tables.workspaces).find((w) => w.path === B)
if (extEntry !== undefined) {
  extEntry.sessionIds = [...new Set([...(extEntry.sessionIds ?? []), sidB])]
} else {
  const extId = uuid()
  ws.tables.workspaces[extId] = { path: B, title: 'external-demo', sessionIds: [sidB], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ws.global.workspaceIds = [...new Set([...(ws.global.workspaceIds ?? []), extId])]
}
writeFileSync(wsPath, JSON.stringify(ws, null, 2))

console.log('seeded:')
console.log('  workspace 内 :', sidA)
console.log('  workspace 外 :', sidB)
console.log('next: install the three tgz bundles (see docs/install.md), then boot the profile.')
