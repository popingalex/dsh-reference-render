/**
 * 包自有样式注入（extraction matrix: CSS SANITIZE 项）。
 *
 * chip 基础视觉随包交付（类名前缀 dsh-ref-chip 冻结为公共契约的一部分）；
 * 宿主/贡献方可用同名类做主题覆盖。重复注入幂等（style id 哨兵）。
 */
export const REFERENCE_STYLE_ID = 'dsh-reference-render/styles'

export const REFERENCE_STYLES = `
.dsh-ref-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0 8px;
  margin: 0 2px;
  height: 20px;
  border: 1px solid rgba(128, 128, 128, .35);
  border-left: 3px solid rgba(128, 128, 128, .35);
  border-radius: 999px;
  background: rgba(128, 128, 128, .08);
  color: inherit;
  font-size: .92em;
  line-height: 18px;
  cursor: pointer;
  vertical-align: baseline;
  white-space: nowrap;
}
.dsh-ref-chip:hover { background: rgba(128, 128, 128, .16); }
.dsh-ref-chip:disabled { cursor: default; opacity: .7; }
.dsh-ref-chip [data-ref-chip-kind] {
  opacity: .65;
  margin-right: 4px;
  font-size: .9em;
}
.dsh-ref-hover-panel {
  /* 跟随系统/文档配色（亮暗主题自适应）；宿主可用 --dsh-ref-panel-* 覆盖 */
  background: var(--dsh-ref-panel-bg, Canvas);
  color: var(--dsh-ref-panel-fg, CanvasText);
  border: 1px solid color-mix(in srgb, CanvasText 30%, transparent);
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, .25);
  padding: 8px 10px;
  max-width: 420px;
  font-size: 13px;
}
`

/** 注入包样式（幂等）。可在 client 入口 apply 或宿主装配时调用。 */
export function ensureReferenceStyles(document: Document): void {
  if (document.getElementById(REFERENCE_STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = REFERENCE_STYLE_ID
  style.textContent = REFERENCE_STYLES
  document.head.appendChild(style)
}

/** React 形态（供测试/SSR 场景）。 */
export function ReferenceStyles(): null {
  if (typeof document !== 'undefined') ensureReferenceStyles(document)
  return null
}
