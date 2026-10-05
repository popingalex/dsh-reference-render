# Contract: ReferenceDescriptor（v0.1 冻结）

> 状态：**FROZEN v0.1** ｜ Schema：`reference-descriptor.schema.json` ｜ 正本实现：`src/descriptor.ts`

## 字段

| 字段 | 类型 | 必填 | 语义 |
|---|---|---|---|
| `uri` | string | ✅（identity） | 唯一身份。canonical 形态 `dsh-resource://<kind>/<id>`；其他 scheme 原样通过（identity=uri 依然成立） |
| `namespace` | `'dsh-ref'`（保留） | 否 | v0.1 单值保留字段，parse 层填充；多 scheme 并存时的扩展位 |
| `label` | string ≤256 | 否 | wire link 的显示文本 |
| `title` | string ≤512 | 否 | 悬浮/无障碍标题 |
| `kind` | string ≤64 | 否 | 开放词表（无白名单） |
| `snapshot` | unknown | 否 | 消息时刻的不可变视图数据；永不作为 canonical state 消费 |
| `metadata` | object | 否 | 来源与扩展。已知键 `alias` = 原始 `dsh-ref:` URI |

## 边界（authority 纪律）

- descriptor **不携带 canonical 业务状态**（View≠Truth）。
- `snapshot` 是展示快照，不参与任何真相裁决。
- 渲染器不 resolve 业务真相——数据由贡献方插件经 contribution contract 提供。

## 归一化规则（`normalizeReference`）

| 输入 | 结果 |
|---|---|
| `dsh-ref:<kind>:<id>` | canonical 化 + `metadata.alias` 留原值 + `kind`/`namespace` 填充 |
| `dsh-resource://…` | 原样通过（已 canonical） |
| 其他 scheme URI | 原样通过（identity=uri） |
| 仅 `kind`+`id` | 按 canonical 规则合成 uri |
| `dsh-ref:` 但解析失败 | **undefined**（拒绝 opaque identity——会制造竞争性身份） |
| 无 uri | **undefined** |

## 测试锚

`tests/descriptor.spec.ts`（12）+ `tests/security.spec.tsx`（malformed 拒绝）。schema 校验样例随 examples/ 附带。
