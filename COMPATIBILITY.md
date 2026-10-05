# COMPATIBILITY

> 冻结于 2026-10-05（contract v0.1）。第一版**不声称** works on all DSH versions。

## Tested combination

| 项 | 值 |
|---|---|
| DSH runtime | **0.2.1-alpha.1**（engines.dsh 精确 gate；vendor cordis 为 alpha 渠道 4.0.5-alpha.1） |
| Node | `^22.19.0 || >=24.0.0`（实测 v22.20.0） |
| package manager | pnpm 10.15.0（DSH 根声明 11.7.0——profile 内安装走 `dsh plugin add` 语义，与全局 pnpm 版本解耦） |
| profile | web（官方模板 `@deepseek-ai/dsh-base` + web app-bundle） |
| React | >=18（peer） |
| @deepseek-ai/cordis | >=4.0.0（peer，optional——纯 type-only 依赖） |

## Install paths（tested）

| 路径 | 命令 | 状态 |
|---|---|---|
| npm tarball | `dsh plugin --profile <name> add <path-to-tgz>` | ✅ 本机全新 profile 实测 |
| file/link dir | `dsh plugin --profile <name> add file:<dir>` | ✅（pnpm add 语义） |
| npm registry | `dsh plugin --profile <name> add dsh-reference` | 尚未发布到 registry |
| GitHub source | `dsh plugin --profile <name> add github:<owner>/<repo>` | 待 publish；**git 安装需要 profile `pnpm-workspace.yaml` allowBuilds 授权 prepare 脚本**（本包无 prepare/build 脚本时不需要） |

## Unsupported / 未测

- 其他 DSH 版本（0.1.x 与 0.2.0-rc.x 均未测；upgrade-guide 记录 0.2.0-rc.2 有 bundle/row 退役与 invariant 路径删除）。
- desktop / acp / headless / sdk profile（client 面 platform=web，仅 web profile 有意义）。
- Node < 22.19。

## Known constraints

- `conversation.chat.node` 的 assistant-step 正文内联 chip：官方 0.2.1-alpha.1 **无公开 link 组件 seam**（MarkdownText 无自定义组件面）——本包交付 WireText 分段原语 + 装饰器基建，正文接管由宿主完成（见 contracts/render-hook.md 三条接线路径）。
- 部分 DSH 发行版会携带仅作展示的 manifest 字段（role/requiredServices/capabilities 等），官方宿主不消费——本包 manifest 仅使用官方面（`dsh.client.platform`）。
- vendor cordis 走 alpha semver 渠道，跨版本存在 compatibility-breaking 风险（官方 upgrade-guide 机制）；升级 DSH 版本时必须重跑 `pnpm verify` + fresh-instance 验收。
