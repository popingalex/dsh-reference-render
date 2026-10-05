# COMPATIBILITY

> 冻结于 2026-10-05（contract v0.1）。第一版**不声称** works on all DSH versions。

## Tested combination

| 项 | 值 |
|---|---|
| DSH runtime | **0.2.1-alpha.1**（安装期拦截靠 peer `@deepseek-ai/dsh-client-ui-slots` 的精确区间；cordis 走 alpha 渠道 4.0.5-alpha.1） |
| Node | `^22.19.0 || >=24.0.0`（实测 v22.20.0） |
| package manager | pnpm 10.15.0（DSH 根声明 11.7.0——profile 内安装走 `dsh plugin add` 语义，与全局 pnpm 版本解耦） |
| profile | web（官方模板 `@deepseek-ai/dsh-base` + web app-bundle） |
| React | >=18（peer） |
| @deepseek-ai/cordis | >=4.0.0（peer，optional——纯 type-only 依赖） |
| manifest | `dsh.manifestVersion: 1`，安装器与加载器不按该字段拒绝安装。拒绝安装靠 `peerDependencies` 里的 `@deepseek-ai/dsh*` 区间；`engines.dsh` 是声明字段。版本表仍以实测行为准 |
| companion demo bundles | `dsh-reference-render-demo@0.2.5`（渲染接线）与 `dsh-reference-render-sidebar-demo@0.1.6`（内容认领方）——同 profile 安装才能复现 README 全部效果；版本与本表同步测试 |

## Install paths（tested）

| 路径 | 命令 | 状态 |
|---|---|---|
| npm tarball | `dsh plugin --profile <name> add <path-to-tgz>` | ✅ 本机全新 profile 实测。包内已含 `lib/`，不需要 allowBuilds |
| file/link dir | `dsh plugin --profile <name> add <dir>` | ✅（pnpm add 语义） |
| npm registry | `dsh plugin --profile <name> add dsh-reference-render@0.1.0` | 尚未发布。发布后装到的是预构建 `lib/`。版本写死，不用 `@latest` |
| git checkout | `dsh plugin --profile <name> add <git spec>` | `prepare` 会构建 `lib/`。pnpm 要求先在该 profile 的 `pnpm-workspace.yaml` 里 `allowBuilds` 放行，否则安装失败 |

安装顺序：先 `dsh --profile <name> --from-default-profile web`，再 `dsh plugin add`。不要把 `cordis.patch.yml` 里的行抄进 profile 自己的 patch。卸载用 `dsh plugin remove`，它同时去掉依赖和层。

在实测的 0.2.1-alpha.1 上，web 模板写入的 `pnpm-workspace.yaml` 把 profile 自己列为 workspace 包。pnpm 10 因此拒绝在 workspace 根执行 `pnpm add`，`dsh plugin add` 会失败并留下 `.plugin-manager/logs`。在该 profile 的 `.npmrc` 写入 `ignore-workspace-root-check=true` 后，同一条 `dsh plugin add` 可以装上 tarball 和本地目录。

## Unsupported / 未测

- 其他 DSH 版本（0.1.x 与 0.2.0-rc.x 均未测；upgrade-guide 记录 0.2.0-rc.2 有 bundle/row 退役与 invariant 路径删除）。
- desktop / acp / headless / sdk profile（client 面 platform=web，仅 web profile 有意义）。
- Node < 22.19。

## Known constraints

- `conversation.chat.node` 的 assistant-step 正文内联 chip：官方 0.2.1-alpha.1 **无公开 link 组件 seam**（MarkdownText 无自定义组件面）——本包交付 WireText 分段原语 + 装饰器基建，正文接管由宿主完成（见 contracts/render-hook.md 三条接线路径）。
- 部分 DSH 发行版会携带仅作展示的 manifest 字段（role/requiredServices/capabilities 等），官方宿主不消费——本包 manifest 仅使用官方面（`dsh.client.platform`）。
- vendor cordis 走 alpha semver 渠道，跨版本存在 compatibility-breaking 风险（官方 upgrade-guide 机制）；升级 DSH 版本时必须重跑 `pnpm verify` + fresh-instance 验收。
