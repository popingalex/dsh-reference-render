/**
 * ReferenceDescriptor 与地址归一化（contract: reference-descriptor v0.1）。
 *
 * - identity 是 `uri`，无第二身份系统。
 * - DSH Client Resource 的 canonical 地址：`dsh-resource://<kind>/<id>`。
 * - `dsh-ref:<kind>:<id>` 是 wire/authoring alias，由本模块按默认规则转换为
 *   canonical 地址；协议 owner 定义了专属 path grammar 时，转换由所属协议
 *   adapter 覆盖，canonical 结果不再回改。
 * - v0.1 单一命名空间（`dsh-ref`）；`namespace` 为保留字段，供未来多 scheme
 *   并存时扩展，语法层不改（向后兼容冻结）。
 */

export const DSH_RESOURCE_SCHEME = 'dsh-resource'
export const DSH_REF_SCHEME = 'dsh-ref'
/** v0.1 唯一命名空间（保留字段值；解析器不做白名单，kind 开放词表）。 */
export const DSH_REF_NAMESPACE = 'dsh-ref'
export const DSH_RESOURCE_PREFIX = `${DSH_RESOURCE_SCHEME}://`
export const DSH_REF_PREFIX = `${DSH_REF_SCHEME}:`

/**
 * 域中立引用描述（contract: reference-descriptor v0.1）：
 * 只携带身份与展示信息，不携带任何业务状态（authority 边界）。
 * 来源/快照等附加信息一律进 metadata / snapshot。
 */
export interface ReferenceDescriptor {
  uri: string
  /** 保留字段：v0.1 恒为 'dsh-ref'（由 parse 层填充，host 层不要求）。 */
  namespace?: typeof DSH_REF_NAMESPACE
  label?: string
  title?: string
  kind?: string
  snapshot?: unknown
  metadata?: Record<string, unknown>
}

export interface ReferenceUriParts {
  /** v0.1 恒为 'dsh-ref'；解析层恒填，调用方构造时可省略。 */
  namespace?: typeof DSH_REF_NAMESPACE
  kind: string
  id: string
}

/** 解析 `dsh-ref:<kind>:<id>`；id 可含 `:` `/` `#`。kind 开放词表（域中立）。 */
export function parseDshRefUri(uri: string): ReferenceUriParts | undefined {
  if (!uri.startsWith(DSH_REF_PREFIX)) return undefined
  const rest = uri.slice(DSH_REF_PREFIX.length)
  const sep = rest.indexOf(':')
  if (sep <= 0) return undefined
  const kind = rest.slice(0, sep)
  const id = rest.slice(sep + 1)
  if (!kind || !id) return undefined
  return { namespace: DSH_REF_NAMESPACE, kind, id }
}

export function formatDshRefUri(kind: string, id: string): string {
  return `${DSH_REF_PREFIX}${kind}:${id}`
}

export function isCanonicalResourceUri(uri: string): boolean {
  return uri.startsWith(DSH_RESOURCE_PREFIX) && uri.length > DSH_RESOURCE_PREFIX.length
}

/** 解析 `dsh-resource://<kind>/<path...>` 的 kind 与路径。 */
export function parseResourceAddress(address: string): ReferenceUriParts | undefined {
  if (!isCanonicalResourceUri(address)) return undefined
  const rest = address.slice(DSH_RESOURCE_PREFIX.length)
  const sep = rest.indexOf('/')
  if (sep <= 0) return undefined
  const kind = rest.slice(0, sep)
  const id = rest.slice(sep + 1)
  if (!kind || !id) return undefined
  return { namespace: DSH_REF_NAMESPACE, kind, id }
}

/** alias → canonical 的默认规则：`issue:I-1` → `dsh-resource://issue/I-1`。 */
export function defaultCanonicalAddress(parts: ReferenceUriParts): string {
  return `${DSH_RESOURCE_PREFIX}${parts.kind}/${parts.id}`
}

export interface NormalizeReferenceInput {
  uri?: string | undefined
  kind?: string | undefined
  id?: string | undefined
  label?: string | undefined
  title?: string | undefined
  snapshot?: unknown
  metadata?: Record<string, unknown> | undefined
}

/**
 * 归一化为 identity=uri 的 descriptor：
 * - `dsh-resource://` 原样通过（已是 canonical）；
 * - `dsh-ref:` alias → defaultCanonicalAddress，原始 alias 记入 `metadata.alias`；
 * - 其他 scheme 原样通过（非 DSH 资源的引用，identity=uri 依然成立）；
 * - 无 uri 但有 kind+id → 按 canonical 规则合成；
 * - 无法确定 uri → undefined（调用方按"非引用"处理，保持默认渲染）。
 */
export function normalizeReference(input: NormalizeReferenceInput): ReferenceDescriptor | undefined {
  let uri = input.uri
  let kind = input.kind
  const metadata: Record<string, unknown> = { ...input.metadata }
  let namespace: typeof DSH_REF_NAMESPACE | undefined

  const parts = uri ? parseDshRefUri(uri) : undefined
  if (parts) {
    uri = defaultCanonicalAddress(parts)
    metadata.alias = input.uri
    kind ??= parts.kind
    namespace = parts.namespace
  } else if (uri?.startsWith(DSH_REF_PREFIX)) {
    // 自有 scheme 但解析失败：不能当 opaque identity 放行（会制造竞争性身份）
    return undefined
  }
  if (!uri && input.kind && input.id) {
    uri = defaultCanonicalAddress({ namespace: DSH_REF_NAMESPACE, kind: input.kind, id: input.id })
    namespace = DSH_REF_NAMESPACE
  }
  if (!uri) return undefined

  const descriptor: ReferenceDescriptor = { uri }
  if (namespace) descriptor.namespace = namespace
  if (input.label) descriptor.label = input.label
  if (input.title) descriptor.title = input.title
  if (kind) descriptor.kind = kind
  if (input.snapshot !== undefined) descriptor.snapshot = input.snapshot
  if (Object.keys(metadata).length > 0) descriptor.metadata = metadata
  return descriptor
}
