# dsh-reference-demo（渲染接线） + dsh-reference-sidebar-demo（内容贡献方）

两个配套示例演示**多插件围绕 domain-neutral 契约协作**：

- **dsh-reference-demo**（本目录，渲染接线）：assistant-step + user 两个 keyed renderer（shadowing rank -1）——**输入与输出消息的引用都渲染成 chip**；hover 面板宿主；chip 业务修饰与 hover 内容经 chain slot 手工选举消费。
- **../sidebar-demo**（dsh-reference-sidebar-demo，内容贡献方）：demo 域数据 + ResourceProvider 帧流 + 资源 sidebar tab（body/title）+ `reference.chip.decor` / `reference.hover.content` 两个 chain slot 的内容贡献 + `reference/open` 接管。

接线插件对业务域零知识；内容插件不碰渲染。

## 怎么读这个演示：认领 vs 未认领对照

演示会话的助手消息同时包含**已被 demo 域认领**与**域外未认领**两类引用——能力验证靠对照组，不是全部显示：

| 能力面 | 已认领（DEP-207 / VR-88 / EV-15） | 未认领（gadget/MYST-1，词表外 kind） |
|---|---|---|
| chip 渲染 | StatusRefChip：类型标签 + 状态点/状态条（按下表 2×2） | 素 chip（仅 label）——wire 解析是 renderer 本职，与域无关 |
| hover | 预览面板 + 贡献方域内容 | 无面板（无 consumer 不产生坏 UI） |
| 点击 | reference/open 接管 → sidebar 资源页（ResourceProvider 帧流） | 全 decline → 干净 no-op，零错误 |
| `/` 菜单 | 资源候选 | 搜不到 |

## 跨插件事件纪律（live 实测）

`reference/open` serial 只向祖先冒泡：listener 注册在内容方 scope，派发方必须从 **root scope**（`ctx.root`）发出，否则兄弟插件收不到且无任何报错。

## 状态点 × 状态条 2×2 组合（同屏四例）

状态点（`status`）与左状态条（`statusBar`）是正交的两个维度，四种组合各一例同屏展示：

| 引用 | 状态点 | 状态条 | 传参 |
|---|---|---|---|
| 部署 DEP-207 | ✅ succeeded（绿） | ✅ 绿条 | `status` + `statusColor`（缺省绑定：条随点） |
| 验证 VR-88 | ✅ passed（绿） | ❌ 无 | `status` + `statusBar: null`（显式关条） |
| 记录 EV-15 | ❌ 无 | ✅ 蓝条 | `statusBar: '#64b5f6'`（条独立于点） |
| MYST-1（域外） | ❌ | ❌ | 两者皆缺省 |

这组对照就是公开契约的可视化：renderer 域中立（开放 kind 词表，`gadget` 不在任何词表里照样出 chip）；业务面全部来自贡献方插件；未认领引用安全降级。

注意：构建期相对打包 dsh-reference 源码（demo 自包含）；生产宿主应改为正常 npm 依赖。
