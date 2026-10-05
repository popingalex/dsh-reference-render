/**
 * Hover 状态机与面板（presentation interaction，非新的 messaging 层）。
 *
 * 内容选择完全委托给 `reference.hover.content` chain slot（见 contract.ts）；
 * 本文件只拥有 UI 级行为：debounce 打开、anchor→panel 宽限、Escape、
 * 焦点返还、换锚点时旧 signal 立即 abort（stale 抑制）。
 * slot store 不用——chip 与 panel 在同一 React 子树，provider 局部状态即足够。
 */
import {
  Component,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ReferenceDescriptor } from '../descriptor'
import type { ReferenceHoverOwnerProps } from './contract'

export const REFERENCE_HOVER_PANEL_CLASS = 'dsh-ref-hover-panel'

const DEFAULT_OPEN_DELAY = 250
const DEFAULT_CLOSE_GRACE = 150

export interface ReferenceHoverState {
  descriptor: ReferenceDescriptor
  anchor: HTMLElement
  signal: AbortSignal
}

export interface ReferenceHoverOptions {
  /** pointer enter 到面板打开的 debounce（ms）。 */
  openDelay?: number
  /** anchor → panel 的移动宽限（ms）；期间 panel `hold()` 可取消关闭。 */
  closeGrace?: number
}

export interface ReferenceHoverController {
  /** chip pointer enter：未打开时 debounce，已打开时立即换锚点（旧 signal abort）。 */
  hoverStart(descriptor: ReferenceDescriptor, anchor: HTMLElement): void
  /** chip pointer leave：取消待开的 debounce；已打开则进入 closeGrace。 */
  hoverEnd(): void
  /** panel pointer enter：取消 pending close（anchor→panel 宽限）。 */
  hold(): void
  /** panel pointer leave：重新进入 closeGrace。 */
  resume(): void
  /** 立即关闭（Escape / 外部关闭）。 */
  dismiss(): void
  /** 卸载清理：清 timer + abort 当前 signal。 */
  dispose(): void
  readonly state: ReferenceHoverState | null
}

export function useReferenceHoverController(options: ReferenceHoverOptions = {}): ReferenceHoverController {
  const openDelay = options.openDelay ?? DEFAULT_OPEN_DELAY
  const closeGrace = options.closeGrace ?? DEFAULT_CLOSE_GRACE

  const [state, setState] = useState<ReferenceHoverState | null>(null)
  const stateRef = useRef<ReferenceHoverState | null>(null)
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const abortRef = useRef<AbortController | null>(null)

  const clearTimers = useCallback(() => {
    clearTimeout(openTimer.current)
    clearTimeout(closeTimer.current)
    openTimer.current = undefined
    closeTimer.current = undefined
  }, [])

  const apply = useCallback((next: ReferenceHoverState | null) => {
    stateRef.current = next
    setState(next)
  }, [])

  const openNow = useCallback((descriptor: ReferenceDescriptor, anchor: HTMLElement) => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    apply({ descriptor, anchor, signal: ac.signal })
  }, [apply])

  const close = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    apply(null)
  }, [apply])

  const hoverStart = useCallback((descriptor: ReferenceDescriptor, anchor: HTMLElement) => {
    clearTimers()
    if (stateRef.current !== null) {
      openNow(descriptor, anchor)
      return
    }
    openTimer.current = setTimeout(() => {
      openTimer.current = undefined
      openNow(descriptor, anchor)
    }, openDelay)
  }, [clearTimers, openDelay, openNow])

  const armClose = useCallback(() => {
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => {
      closeTimer.current = undefined
      close()
    }, closeGrace)
  }, [closeGrace, close])

  const hoverEnd = useCallback(() => {
    clearTimeout(openTimer.current)
    openTimer.current = undefined
    if (stateRef.current === null) return
    armClose()
  }, [armClose])

  const hold = useCallback(clearTimers, [clearTimers])

  const resume = useCallback(() => {
    if (stateRef.current === null) return
    armClose()
  }, [armClose])

  const dismiss = useCallback(() => {
    clearTimers()
    close()
  }, [clearTimers, close])

  const dispose = useCallback(() => {
    clearTimers()
    abortRef.current?.abort()
    abortRef.current = null
  }, [clearTimers])

  // state 必须参与 memo 依赖：state 变化 → 新 controller → context value 变化 →
  // 消费者（Panel）重渲染。stateRef 仅供事件回调内命令式读取当前值。
  return useMemo(
    () => ({ hoverStart, hoverEnd, hold, resume, dismiss, dispose, state }),
    [hoverStart, hoverEnd, hold, resume, dismiss, dispose, state],
  )
}

const ReferenceHoverContext = createContext<ReferenceHoverController | null>(null)

export interface ReferenceHoverProviderProps {
  children: ReactNode
  options?: ReferenceHoverOptions
}

/** hover 状态的作用域根；chip 与 panel 必须位于同一 provider 子树。 */
export function ReferenceHoverProvider({ children, options }: ReferenceHoverProviderProps): ReactNode {
  const controller = useReferenceHoverController(options)
  // 只在卸载时清理；controller 身份随 state 变化，若挂它当依赖，每次换锚点都会
  // 把新 AbortController 误 abort（dispose 清的是共享的 abortRef）。
  const latest = useRef(controller)
  latest.current = controller
  useEffect(() => () => latest.current.dispose(), [])
  return <ReferenceHoverContext.Provider value={controller}>{children}</ReferenceHoverContext.Provider>
}

export function useReferenceHover(): ReferenceHoverController {
  const controller = useContext(ReferenceHoverContext)
  if (controller === null) {
    throw new Error('useReferenceHover requires <ReferenceHoverProvider>')
  }
  return controller
}

export interface ReferenceHoverPanelProps {
  /**
   * 由宿主树注入的内容选择面：生产环境是 `reference.hover.content` chain slot
   * 的组合结果（选择权只在 slot，本组件不做任何 selection）。
   * 返回 null/undefined = 无 consumer 接管 → 面板整体不渲染。
   */
  renderContent: (owner: ReferenceHoverOwnerProps) => ReactNode
  className?: string
}

export function ReferenceHoverPanel({ renderContent, className }: ReferenceHoverPanelProps): ReactNode {
  const { state } = useReferenceHover()
  if (state === null) return null
  return <HoverContentBoundary state={state} renderContent={renderContent} className={className} />
}

/**
 * 内容面故障隔离（contract: contribution —— provider failure does not crash
 * conversation）：hover 内容选择器抛错时整个面板不渲染，异常不冒泡到会话树。
 * 面板关闭即卸载，下一次 hover 自然回到未失败状态。
 */
interface HoverContentProps {
  state: ReferenceHoverState
  renderContent: (owner: ReferenceHoverOwnerProps) => ReactNode
  className?: string | undefined
}

class HoverContentBoundary extends Component<HoverContentProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  componentDidCatch(error: unknown): void {
    if (process.env.NODE_ENV !== 'production' || process.env.VITEST === 'true') {
      console.error('[dsh-reference-render] hover content provider failed:', error)
    }
  }

  render(): ReactNode {
    if (this.state.failed) return null
    return <HoverPanelBody state={this.props.state} renderContent={this.props.renderContent} className={this.props.className} />
  }
}

function HoverPanelBody({ state, renderContent, className }: HoverContentProps): ReactNode {
  const { hold, resume, dismiss } = useReferenceHover()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      dismiss()
      state.anchor.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, dismiss])

  const content = renderContent({ descriptor: state.descriptor, signal: state.signal })
  if (content === null || content === undefined) return null
  const rect = state.anchor.getBoundingClientRect()
  // 不用 createPortal：loader 环境下 module table 的 react-dom 与页面主 bundle
  // 可能不是同一份，portal 子树会落进另一个 renderer 的 dispatcher（React #321）。
  // inline fixed 定位视觉等价（面板悬浮于内容之上，无文档流影响）。
  // 视口适配：下方放不下时翻到 anchor 上方；水平 clamp 留边。
  const estimatedHeight = 160
  const flip = rect.bottom + estimatedHeight + 8 > window.innerHeight && rect.top - estimatedHeight - 8 > 0
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 328))
  const top = flip ? Math.max(8, rect.top - estimatedHeight - 6) : rect.bottom + 6
  return (
    <div
      className={className ? `${REFERENCE_HOVER_PANEL_CLASS} ${className}` : REFERENCE_HOVER_PANEL_CLASS}
      data-reference-hover-panel=""
      data-reference-hover-flip={flip || undefined}
      style={{ position: 'fixed', left, top, zIndex: 50 }}
      onMouseEnter={hold}
      onMouseLeave={resume}
    >
      {content}
    </div>
  )
}
