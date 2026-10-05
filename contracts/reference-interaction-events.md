# Contract: Reference Interaction Events（v0.1 冻结）

> 状态：**FROZEN v0.1** ｜ 正本实现：`src/events.ts`（typed cordis event）、`src/hover/ReferenceHover.tsx`（hover 生命周期）
> 事件命名说明：激活语义落地为 cordis 事件 `reference/open`（kebab 路由风格与官方 `Events` 表一致）；hover/leave 经 React 回调 + AbortSignal 承载，不设全局事件——data/decision arbitration 走 cordis serial，React placement/composition 走 slot，不建两套 registry。

## 1. `reference/open`（激活）

| 项 | 定义 |
|---|---|
| 通道 | cordis typed event，**serial 派发**（first-bail-wins） |
| payload | `{ descriptor, activation, workspace? }`。`workspace` 为 `{ id, title?, path? }`，只在打开引用的会话属于某个工作区时出现；会话不在任何工作区时省略该字段 |
| 接管 | listener 返回 `{ handled: true }`（`referenceHandled()`）→ 短路 |
| decline | 返回 `undefined` / `false` / `null` 之一（三值等价，与 cordis isBailed 语义一致） |
| 全 decline | `dispatchReferenceOpen` 返回 `undefined`，调用方走默认/无操作 |
| async | listener 可返回 Promise；serial 链等待首个非 decline |
| cancellation | 无取消语义——serial 短路即终结；listener 内部长任务自行监听自有取消面 |
| error | listener throw 向上传播（cordis serial 不吞错）；**调用方胶水层负责失败隔离**（如 WireText 的 SegmentBoundary 与宿主 try） |
| stale | 无 stale 面（一次性请求-应答）；hover 面的 stale 由 AbortSignal 处理（§2） |

## 2. Hover 生命周期（`reference/hover`、`reference/leave` 的承载方式）

不声明独立 cordis 事件。生命周期契约由 `useReferenceHoverController` 状态机 + `reference.hover.content` chain slot 承载：

| 状态 | 语义 |
|---|---|
| openDelay（默认 250ms） | pointer enter 到面板打开的 debounce |
| closeGrace（默认 150ms） | anchor→panel 移动宽限；panel `hold()` 可取消关闭 |
| Escape / dismiss | 立即关闭并返还焦点到 anchor |
| **AbortSignal** | 每次 hover 目标确定时创建；换锚点/关闭**立即 abort 旧 signal** —— 异步取数必须尊重该 signal（stale 结果不得覆盖新 hover 目标） |

## 3. 贡献方最小实现

```ts
// hover 内容（chain slot 二段注册）
ctx.effect(() => ctx.slots.inject('reference.hover.content', () =>
  ctx.slots.register({
    name: 'reference.hover.content',
    select: (owner) => owner.descriptor.kind === 'deployment' ? {} : null,
  }, DeploymentHoverCard)))

// 激活接管（serial）
ctx.on('reference/open', ({ descriptor }) =>
  descriptor.kind === 'deployment' ? (openDeployment(descriptor), referenceHandled()) : undefined)
```

## 测试锚

`tests/events.spec.ts`（decline 三值、serial 短路、payload 形状）、`tests/hover.spec.tsx`（debounce/grace/换锚 abort/grace 关闭 abort）、`tests/integration.spec.tsx`（serial first-wins）。
