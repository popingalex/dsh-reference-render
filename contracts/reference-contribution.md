# Contract: Reference Contribution（v0.1 冻结）

> 状态：**FROZEN v0.1** ｜ 正本实现：`src/hover/contract.ts`（slot 声明）、`src/integration/decorate-chat-node.ts`、官方 `ctx.sidebarRight.openResource` / `ctx.resources.register`
> 示意名 `ReferencePreviewProvider` / `ReferenceSidebarProvider` 落地为 DSH-native 等价机制——chain slot + typed serial event + 官方 resource/sidebar API。

## 1. Hover 内容贡献（ReferencePreviewProvider 等价）

slot：`reference.hover.content`（**kind: 'chain'，scope: 'root'**，本包随包交付 SlotMap declare-merge 声明与类型）。

```ts
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'reference.hover.content': { kind: 'chain'; scope: 'root'; owner: ReferenceHoverOwnerProps }
  }
}
// owner = { descriptor: ReferenceDescriptor, signal: AbortSignal }
```

二段注册范式（与官方 sidebar tab body 同款）：

```ts
ctx.effect(() => ctx.slots.inject('reference.hover.content', () =>
  ctx.slots.register({ name: 'reference.hover.content', select: (owner) => …, priority: 0 }, MyHoverCard)))
```

first-match 语义由 chain slot 原生提供（priority 升序，首个非 null 当选；全 null → 面板不渲染）。

## 2. Sidebar / 详情贡献（ReferenceSidebarProvider 等价）

**激活路径唯一且按序**：

```text
chip activate
  → dispatchReferenceOpen(ctx, {descriptor, activation})   [cordis serial first-bail-wins]
      → 贡献方插件 ctx.on('reference/open', …) 认领（{handled:true}）
          → 官方 ctx.sidebarRight.openResource(address) / ctx.resources.register(provider)
  → 全 decline → no-op（保持默认渲染）
```

- 资源详情视图用官方 `ctx.resources.register(ResourceProvider)` + `ctx.sidebarRight.openResource('dsh-resource://<kind>/<id>')`。
- 地址转换唯一可逆层：`parseResourceAddress` / `defaultCanonicalAddress`（本包导出）。

## 3. 硬性纪律

| 纪律 | 机制 |
|---|---|
| renderer 不 import provider 实现 | 只有 slot 声明与类型共享；实现只经 slot/serial 相遇 |
| provider failure 不炸对话面 | slot 面板全 null → 不渲染；文本段渲染崩溃 → SegmentBoundary 降级；hover 内容崩溃 → HoverContentBoundary 收起面板；serial listener throw → 由调用方胶水层隔离（契约明示） |
| unknown ref 安全 fallback | 无贡献方认领 → chip 无操作/纯文本；不报错不占位 UI |
| async 不得覆盖新 hover 目标 | owner.signal（AbortSignal）换锚即 abort；贡献方取数必须尊重 |
| dispose 干净移除 | `ctx.slots.inject` 返回值/`ctx.effect` 级联；装饰器 `restore()` 回滚 entry |

## 4. 测试锚

`tests/integration.spec.tsx`（装饰器 wrap/restore/idempotent/injectFace、serial first-wins、provider 崩溃降级）、`tests/hover.spec.tsx`（换锚 abort）。

## 5. Chip 装饰数据（reference.chip.decor chain）

内容方经 `reference.chip.decor` chain 贡献**业务修饰数据**（matched 对象），渲染接线方选举后用自己的 StatusRefChip/ReferenceChip 渲染。matched 全部字段可选：

| 字段 | 语义 |
|---|---|
| `typeLabel` / `label` | 类型标签 / 覆盖文本 |
| `status` / `statusColor` | 状态点（右位缺省）与点色 |
| `statusBar` | `'bind'`（条随点，缺省）\| `null`（无条）\| 色值（独立条，左位缺省） |
| `decorations` | `{ left: RefDecoration[], right: RefDecoration[] }` —— 广义装饰，与便捷字段叠加渲染 |

### RefDecoration（每侧各最多 3 个，共 6 位）

```ts
type RefDecoration =
  | { kind: 'dot'; color?: string }                 // 色点（缺省 currentColor）
  | { kind: 'bar'; color?: string }                 // 色条（缺省 currentColor）
  | { kind: 'icon'; src: string;                    // http(s) 或 data:image/*
      color?: string;                               // tint 模式的着色；缺省 currentColor（跟随系统文本）
      mode?: 'tint' | 'image';                      // tint=mask 单色剪影；image=原色 <img>
      size?: number }                               // 缺省 12px
```

icon 安全面：`src` 一律经 `<img>`/CSS mask 加载（SVG 不执行脚本）；`javascript:` 与非 `data:image` 一律拒绝渲染。
