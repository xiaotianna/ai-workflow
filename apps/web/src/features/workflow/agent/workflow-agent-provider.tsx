import {
  agentTurnSchema,
  hashAgentSnapshot,
  canonicalAgentJson,
  AGENT_MAX_REQUEST_BYTES,
  type AgentError,
  type AgentEvent,
} from '@ai-workflow/agent-protocol'
import type { Workflow, WorkflowNode } from '@ai-workflow/core'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { showToast } from '@ai-workflow/ui/lib/toast'
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type ChatModelRunResult,
  type ThreadMessage,
} from '@assistant-ui/react'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { WorkflowEditorSnapshot } from '@/components/workflow/types'
import { useWorkflowModelCatalog } from '@/components/workflow/workflow-model-catalog-context'
import { abortAgentSession, streamAgentTurn } from '@/api/agent'
import { getAuthUser } from '@/features/auth/session'
import { isLoopSystemNodeType } from '@/utils/workflow/node-type-visibility'
import {
  agentConversationStateSchema,
  agentModelSelectionSchema,
  agentResourceReferenceSchema,
} from '../schema'
import type { z } from 'zod'
import { agentImageAttachmentAdapter, parseAgentImage } from './agent-image-attachment'
import { useWorkflowCatalog } from '../catalog/workflow-web-catalog'
import { AgentTranscript, isAgentActive, type AgentRunStatus } from './agent-transcript'
import { createAgentConversationAdapter } from './agent-conversation-storage'

const TOOL_LABELS: Record<string, string> = {
  read_canvas: '读取画布',
  list_node_types: '查询节点目录',
  get_node_type: '查看节点配置',
  inspect_project_resources: '查询项目资源',
  list_workflow_runs: '查询运行记录',
  get_workflow_run: '读取运行追踪',
  validate_workflow: '校验工作流',
  set_canvas_candidate: '生成工作流候选',
}
export interface WorkflowNodeReference {
  workflowId: string
  nodeId: string
  label: string
  nodeType: string
}
interface ProviderProps {
  appId?: string
  enabled: boolean
  visible: boolean
  snapshot: WorkflowEditorSnapshot
  selectedNodeIds: ReadonlySet<string>
  getSnapshot: () => WorkflowEditorSnapshot
  onApply: (workflow: Workflow) => void
  children: ReactNode
}
function getAgentAccountId() {
  try {
    return getAuthUser()?.phone ?? 'anonymous'
  } catch {
    return 'anonymous'
  }
}
function readModelPreference() {
  const storageKey = `ai-workflow.agent.model.${getAgentAccountId()}`
  try {
    const saved = agentModelSelectionSchema.safeParse(
      JSON.parse(globalThis.localStorage.getItem(storageKey) ?? 'null'),
    )
    if (saved.success) return { storageKey, model: saved.data }
  } catch {
    // 存储不可用或数据损坏时，仍允许在当前页面选择模型。
  }
  return { storageKey, model: { groupId: '', configuredModelId: '' } }
}
function useAgentController(props: ProviderProps) {
  const [status, setStatus] = useState<AgentRunStatus>('idle'),
    [phase, setPhase] = useState(''),
    [startedAt, setStartedAt] = useState<number>(),
    [completedAt, setCompletedAt] = useState<number>(),
    [now, setNow] = useState(Date.now()),
    [unread, setUnread] = useState<'success' | 'error'>(),
    [announcement, setAnnouncement] = useState(''),
    [baseHash, setBaseHash] = useState<string>(),
    [currentHash, setCurrentHash] = useState(''),
    [appliedCandidates, setAppliedCandidates] = useState<ReadonlySet<string>>(new Set()),
    [conflicted, setConflicted] = useState(false),
    [switchingConversation, setSwitchingConversation] = useState(false),
    [modelPreference] = useState(readModelPreference),
    [conversationAdapter] = useState(() =>
      createAgentConversationAdapter(
        `${getAgentAccountId()}.${props.appId ?? props.snapshot.workflow.id}`,
      ),
    ),
    modelForm = useFormData<z.input<typeof agentModelSelectionSchema>>(modelPreference.model),
    modelCatalog = useWorkflowModelCatalog(),
    catalog = useWorkflowCatalog(),
    current = useRef(props),
    selectedModel = useRef(modelForm.form),
    sessionId = useRef<string | undefined>(undefined),
    persistence = useRef<Promise<void>>(Promise.resolve()),
    switching = useRef(false),
    activeRun = useRef<{ controller: AbortController; stopRequested: boolean } | undefined>(
      undefined,
    ),
    runtimeRef = useRef<ReturnType<typeof useLocalRuntime> | undefined>(undefined),
    stateRef = useRef(status)
  current.current = props
  selectedModel.current = modelForm.form
  stateRef.current = status
  const serializedSnapshot = canonicalAgentJson(props.snapshot)
  useEffect(() => {
    let valid = true
    void hashAgentSnapshot(JSON.parse(serializedSnapshot))
      .then((hash) => {
        if (valid) setCurrentHash(hash)
      })
      .catch(() => {
        if (valid) setCurrentHash('')
      })
    return () => {
      valid = false
    }
  }, [serializedSnapshot])
  const active = isAgentActive(status)
  useEffect(() => {
    if (active && baseHash && currentHash && baseHash !== currentHash) setConflicted(true)
  }, [active, baseHash, currentHash])
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  useEffect(() => {
    if (props.visible) {
      modelCatalog.load()
      setUnread(undefined)
    }
  }, [props.visible, modelCatalog.load])
  useEffect(() => {
    if (!modelCatalog.loaded || modelCatalog.loadError) return
    const groups = modelCatalog.modelGroups.filter((group) => group.enabled),
      selection = modelForm.form,
      available = groups.some(
        (group) =>
          group.id === selection.groupId &&
          group.models.some((model) => model.id === selection.configuredModelId && model.enabled),
      ),
      firstGroup = groups.find((item) => item.models.some((model) => model.enabled)),
      firstModel = firstGroup?.models.find((item) => item.enabled)
    if (!available && firstGroup && firstModel) {
      const next = { groupId: firstGroup.id, configuredModelId: firstModel.id }
      selectedModel.current = next
      modelForm.updateForm(next)
    }
  }, [
    modelCatalog.loaded,
    modelCatalog.loadError,
    modelCatalog.modelGroups,
    modelForm.form,
    modelForm.updateForm,
  ])
  useEffect(() => {
    const selection = agentModelSelectionSchema.safeParse(modelForm.form)
    if (!selection.success) return
    try {
      globalThis.localStorage.setItem(modelPreference.storageKey, JSON.stringify(selection.data))
    } catch {
      showToast('error', '无法保存模型选择，当前页面仍可使用')
    }
  }, [modelForm.form, modelPreference.storageKey])
  useEffect(
    () => () => {
      activeRun.current?.controller.abort()
      runtimeRef.current?.thread.cancelRun()
      if (activeRun.current && current.current.appId && sessionId.current)
        void abortAgentSession(current.current.appId, sessionId.current).catch(() => undefined)
    },
    [],
  )

  function receive(event: AgentEvent) {
    if (event.type === 'session_started') {
      sessionId.current = event.sessionId
      void saveConversation().catch(() => undefined)
      setStatus(activeRun.current?.stopRequested ? 'stopping' : 'running')
      setPhase('正在分析请求')
      if (activeRun.current?.stopRequested && current.current.appId)
        void abortAgentSession(current.current.appId, event.sessionId).catch(() => {
          activeRun.current?.controller.abort()
        })
    } else if (event.type === 'reasoning_started') setPhase('正在思考')
    else if (event.type === 'tool_started') {
      setPhase(`正在${TOOL_LABELS[event.toolName] ?? '执行工具'}`)
      setAnnouncement(`开始${TOOL_LABELS[event.toolName] ?? '执行工具'}`)
    } else if (event.type === 'tool_finished') {
      setPhase('正在整理结果')
      setAnnouncement(
        `${TOOL_LABELS[event.toolName] ?? '工具'}${event.status === 'succeeded' ? '完成' : event.status === 'failed' ? '失败' : '已停止'}`,
      )
    } else if (event.type === 'candidate_ready') setPhase('正在完成校验')
    else if (
      event.type === 'agent_finished' ||
      event.type === 'agent_cancelled' ||
      event.type === 'agent_failed'
    ) {
      const terminal: AgentRunStatus =
        event.type === 'agent_finished'
          ? 'completed'
          : event.type === 'agent_cancelled'
            ? 'cancelled'
            : event.error.code === 'AGENT_TIMEOUT'
              ? 'timed_out'
              : 'failed'
      setStatus(terminal)
      setCompletedAt(Date.now())
      setAnnouncement(
        terminal === 'completed'
          ? '运行完成'
          : terminal === 'cancelled'
            ? '运行已停止'
            : terminal === 'timed_out'
              ? '运行超时'
              : '运行失败',
      )
      if (event.type === 'agent_failed' && event.error.code === 'SESSION_NOT_FOUND') {
        sessionId.current = undefined
        void saveConversation().catch(() => undefined)
      }
      if (!current.current.visible && terminal !== 'cancelled') {
        setUnread(terminal === 'completed' ? 'success' : 'error')
        showToast(
          terminal === 'completed' ? 'success' : 'error',
          terminal === 'completed'
            ? 'AI 助手已完成，请打开面板查看结果'
            : 'AI 助手运行失败，请打开面板查看原因',
        )
      }
    }
  }
  const [adapter] = useState<ChatModelAdapter>(() => ({
      async *run({ messages, abortSignal }) {
        const transcript = new AgentTranscript(),
          message = messages.filter((m) => m.role === 'user').at(-1),
          appId = current.current.appId,
          model = validateFormByZod(agentModelSelectionSchema, selectedModel.current)
        if (runtimeRef.current)
          await runtimeRef.current.threads.mainItem
            .rename(getAgentConversationTitle(messages))
            .catch(() => undefined)
        if (
          switching.current ||
          !appId ||
          !current.current.enabled ||
          !model.success ||
          !message ||
          message.role !== 'user'
        ) {
          const error: AgentError = {
            code: 'AGENT_INPUT_INVALID',
            message: !model.success ? '请选择已启用的对话模型' : '当前应用无法使用 AI 助手',
            retryable: true,
          }
          transcript.finish('failed', error)
          receive({ type: 'agent_failed', error })
          yield transcript.snapshot()
          return
        }
        const controller = new AbortController(),
          run = { controller, stopRequested: false }
        activeRun.current = run
        const signal = AbortSignal.any([abortSignal, controller.signal])
        setStatus('starting')
        setPhase('正在准备上下文')
        setStartedAt(Date.now())
        setCompletedAt(undefined)
        setNow(Date.now())
        setBaseHash(undefined)
        setConflicted(false)
        setAnnouncement('开始运行')
        yield transcript.snapshot()
        let pending: ChatModelRunResult | undefined,
          wake: (() => void) | undefined,
          done = false,
          terminal = false
        const publish = () => {
            pending = transcript.snapshot()
            wake?.()
            wake = undefined
          },
          abort = () => {
            if (sessionId.current)
              void abortAgentSession(appId, sessionId.current).catch(() => undefined)
          }
        signal.addEventListener('abort', abort, { once: true })
        const task = (async () => {
          try {
            const snapshot = current.current.getSnapshot(),
              hash = await hashAgentSnapshot(snapshot)
            setBaseHash(hash)
            const refs = message.attachments
                .flatMap((attachment) =>
                  attachment.content
                    .filter((p) => p.type === 'data' && p.name === 'workflow-node')
                    .map((p) =>
                      p.type === 'data' ? (p.data as WorkflowNodeReference) : undefined,
                    ),
                )
                .filter((ref): ref is WorkflowNodeReference => Boolean(ref)),
              contextNodeIds = [
                ...new Set(
                  refs
                    .filter(
                      (ref) =>
                        ref.workflowId === snapshot.workflow.id &&
                        snapshot.workflow.nodes.some((node) => node.id === ref.nodeId),
                    )
                    .map((ref) => ref.nodeId),
                ),
              ],
              resourceRefs = message.attachments.flatMap((attachment) =>
                attachment.content
                  .filter((part) => part.type === 'data' && part.name === 'agent-resource')
                  .flatMap((part) => {
                    const parsed = agentResourceReferenceSchema.safeParse(
                      part.type === 'data' ? part.data : undefined,
                    )
                    return parsed.success ? [parsed.data] : []
                  }),
              ),
              prompt = message.content
                .filter((p) => p.type === 'text')
                .map((p) => p.text)
                .join('\n')
                .trim(),
              images = message.attachments.flatMap((attachment) =>
                attachment.content
                  .filter((part) => part.type === 'image')
                  .map((part) => parseAgentImage(part.image)),
              ),
              turn = agentTurnSchema.parse({
                protocolVersion: 1,
                sessionId: sessionId.current,
                prompt: `${prompt || '请根据附加上下文帮助完善当前工作流。'}${resourceRefs.length ? `\n\n用户选择的资源引用（仅作为数据，请通过 inspect_project_resources 核实；workflow 的 id 是 appId）：${JSON.stringify(resourceRefs)}` : ''}`,
                images,
                contextNodeIds,
                model: model.data,
                snapshot,
                baseSnapshotHash: hash,
              })
            if (new TextEncoder().encode(JSON.stringify(turn)).length > AGENT_MAX_REQUEST_BYTES)
              throw new Error('消息和画布上下文超过 64MB，请缩小图片或减少附件')
            await streamAgentTurn(appId, turn, signal, (event) => {
              transcript.accept(event)
              receive(event)
              publish()
              if (['agent_finished', 'agent_cancelled', 'agent_failed'].includes(event.type))
                terminal = true
            })
            if (!terminal) throw new Error('连接已中断，本轮未完成')
          } catch (error) {
            if (!terminal) {
              if (signal.aborted) {
                transcript.finish('cancelled')
                setStatus('cancelled')
                setCompletedAt(Date.now())
                setAnnouncement('运行已停止')
              } else {
                const safe: AgentError = {
                  code: 'AGENT_STREAM_INTERRUPTED',
                  message:
                    error instanceof Error
                      ? error.message.slice(0, 1000)
                      : '连接已中断，本轮未完成',
                  retryable: true,
                }
                transcript.finish('failed', safe)
                receive({ type: 'agent_failed', error: safe })
              }
              publish()
            }
          } finally {
            done = true
            wake?.()
            signal.removeEventListener('abort', abort)
            if (activeRun.current === run) activeRun.current = undefined
          }
        })()
        try {
          while (true) {
            if (done && !pending) break
            if (pending) {
              const update = pending
              pending = undefined
              yield update
            } else
              await new Promise<void>((resolve) => {
                wake = resolve
              })
          }
          await task
        } finally {
          if (!done) controller.abort()
        }
      },
    })),
    runtime = useRemoteThreadListRuntime({
      adapter: conversationAdapter,
      runtimeHook: function useConversationRuntime() {
        return useLocalRuntime(adapter, {
          maxSteps: 1,
          unstable_enableMessageQueue: false,
          adapters: { attachments: agentImageAttachmentAdapter },
        })
      },
    })
  runtimeRef.current = runtime
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined = undefined
    const save = () => void saveConversation().catch(() => undefined),
      unsubscribe = runtime.thread.composer.subscribe(() => {
        clearTimeout(timer)
        if (!switching.current) timer = setTimeout(save, 300)
      })
    globalThis.addEventListener('pagehide', save)
    return () => {
      clearTimeout(timer)
      unsubscribe()
      globalThis.removeEventListener('pagehide', save)
      save()
    }
  }, [runtime])
  const canvasNodeIds = props.snapshot.workflow.nodes.map((node) => node.id).join('\n')
  useEffect(() => {
    const attachments = runtime.thread.composer.getState().attachments,
      invalid = attachments.flatMap((attachment, index) => {
        const ref = attachment.content?.find(
          (part) => part.type === 'data' && part.name === 'workflow-node',
        )
        return ref?.type === 'data' &&
          !current.current.snapshot.workflow.nodes.some(
            (node) => node.id === (ref.data as WorkflowNodeReference).nodeId,
          )
          ? [index]
          : []
      })
    for (const index of invalid.toReversed())
      void runtime.thread.composer.getAttachmentByIndex(index).remove()
    if (invalid.length) showToast('info', '已移除草稿中被删除的节点上下文')
  }, [canvasNodeIds, runtime])

  async function stop() {
    if (!activeRun.current || stateRef.current === 'stopping') return
    activeRun.current.stopRequested = true
    setStatus('stopping')
    setPhase('正在停止')
    if (sessionId.current && props.appId) {
      try {
        await abortAgentSession(props.appId, sessionId.current)
      } catch {
        activeRun.current?.controller.abort()
      }
    }
  }
  async function saveConversation() {
    if (runtime.thread.getState().isLoading) return persistence.current
    const threadId = runtime.threads.getState().mainThreadId,
      item = runtime.threads.getItemById(threadId),
      composer = runtime.thread.composer.getState(),
      messages = runtime.thread.getState().messages
    if (
      item.getState().status === 'new' &&
      !messages.length &&
      !composer.text.trim() &&
      !composer.attachments.length
    )
      return persistence.current
    const saved = agentConversationStateSchema.parse({
        sessionId: sessionId.current,
        draft: {
          text: composer.text,
          attachments: composer.attachments
            .filter(
              (attachment) =>
                attachment.status.type !== 'running' && attachment.status.type !== 'incomplete',
            )
            .map(({ id, type, name, contentType, content }) => ({
              id,
              type,
              name,
              contentType,
              content: content ?? [],
            })),
        },
      }),
      title = getAgentConversationTitle(messages, composer.text),
      write = async () => {
        if (item.getState().status === 'deleted') return
        await item.initialize()
        await item.updateCustom(saved)
        if (item.getState().title !== title) await item.rename(title)
      },
      task = persistence.current.then(write, write)
    persistence.current = task
    return task
  }
  async function switchConversation(threadId?: string) {
    if (
      activeRun.current ||
      isAgentActive(stateRef.current) ||
      runtime.thread.getState().isRunning ||
      runtime.thread.getState().isLoading ||
      runtime.threads.getState().isLoading ||
      switching.current
    )
      return false
    const threadList = runtime.threads.getState(),
      currentId = threadList.mainThreadId,
      composer = runtime.thread.composer.getState()
    if (threadId === currentId) return true
    if (
      !threadId &&
      currentId === threadList.newThreadId &&
      !composer.text.trim() &&
      !composer.attachments.length
    )
      return true
    switching.current = true
    setSwitchingConversation(true)
    try {
      await saveConversation()
      if (threadId) await runtime.threads.switchToThread(threadId)
      else await runtime.threads.switchToNewThread()
      return true
    } catch {
      showToast('error', '切换对话失败，请重试')
      return false
    } finally {
      await restoreConversation(currentId)
      setAnnouncement('')
      switching.current = false
      setSwitchingConversation(false)
    }
  }
  async function restoreConversation(previousId: string) {
    const nextId = runtime.threads.getState().mainThreadId
    if (nextId === previousId) return
    const stored = agentConversationStateSchema.safeParse(
      runtime.threads.mainItem.getState().custom ?? {},
    )
    sessionId.current = stored.success ? stored.data.sessionId : undefined
    if (stored.success && stored.data.draft) {
      try {
        runtime.thread.composer.setText(stored.data.draft.text)
        if (!runtime.thread.composer.getState().attachments.length)
          for (const attachment of stored.data.draft.attachments)
            await runtime.thread.composer.addAttachment(attachment)
      } catch {
        showToast('error', '恢复对话附件失败，请重新添加附件')
      }
    } else if (!stored.success) showToast('error', '对话草稿数据损坏，请重新输入')
    stateRef.current = 'idle'
    setStatus('idle')
    setPhase('')
    setStartedAt(undefined)
    setCompletedAt(undefined)
    setBaseHash(undefined)
    setConflicted(false)
    setUnread(undefined)
  }
  async function deleteConversation(threadId: string) {
    if (
      activeRun.current ||
      isAgentActive(stateRef.current) ||
      runtime.thread.getState().isRunning ||
      runtime.thread.getState().isLoading ||
      runtime.threads.getState().isLoading ||
      switching.current
    )
      return false
    const currentId = runtime.threads.getState().mainThreadId
    switching.current = true
    setSwitchingConversation(true)
    try {
      await saveConversation()
      await runtime.threads.getItemById(threadId).delete()
      setAnnouncement('对话已删除')
      return true
    } catch {
      showToast('error', '删除对话失败，请重试')
      return false
    } finally {
      await restoreConversation(currentId)
      switching.current = false
      setSwitchingConversation(false)
    }
  }
  function retry(assistantMessageId?: string) {
    if (isAgentActive(stateRef.current)) return
    const messages = runtime.thread.getState().messages,
      end = assistantMessageId
        ? messages.findIndex((m) => m.id === assistantMessageId)
        : messages.length,
      user = messages
        .slice(0, end < 0 ? messages.length : end)
        .filter((m) => m.role === 'user')
        .at(-1)
    if (user?.role === 'user')
      runtime.thread.append({ role: 'user', content: user.content, attachments: user.attachments })
  }
  function addNodes(nodeIds: readonly string[]) {
    const existing = new Set(
      runtime.thread.composer
        .getState()
        .attachments.filter((attachment) => attachment.type === 'workflow-node')
        .map((attachment) => attachment.id),
    )
    for (const nodeId of nodeIds) {
      const node = props.snapshot.workflow.nodes.find((n) => n.id === nodeId)
      if (!node || isLoopSystemNodeType(node.type) || existing.has(`workflow-node:${nodeId}`))
        continue
      if (existing.size >= 20) {
        showToast('info', '每条消息最多添加 20 个节点上下文')
        break
      }
      existing.add(`workflow-node:${nodeId}`)
      const ref: WorkflowNodeReference = {
        workflowId: props.snapshot.workflow.id,
        nodeId,
        nodeType: node.type,
        label: node.label ?? catalog.nodeRegistry.get(node.type)?.definition.label ?? node.type,
      }
      void runtime.thread.composer.addAttachment({
        id: `workflow-node:${nodeId}`,
        type: 'workflow-node',
        name: ref.label,
        contentType: 'application/x-workflow-node',
        content: [{ type: 'data', name: 'workflow-node', data: ref }],
      })
    }
  }
  function addResource(value: z.input<typeof agentResourceReferenceSchema>) {
    const ref = agentResourceReferenceSchema.parse(value),
      attachments = runtime.thread.composer.getState().attachments,
      id = `agent-resource:${ref.kind}:${ref.id}`
    if (attachments.some((attachment) => attachment.id === id)) return
    if (attachments.filter((attachment) => attachment.type === 'agent-resource').length >= 20) {
      showToast('info', '每条消息最多添加 20 个资源引用')
      return
    }
    void runtime.thread.composer.addAttachment({
      id,
      type: 'agent-resource',
      name: ref.label,
      contentType: 'application/x-agent-resource',
      content: [{ type: 'data', name: 'agent-resource', data: ref }],
    })
  }
  async function applyCandidate(workflow: Workflow, hash: string, candidateKey: string) {
    if (active || appliedCandidates.has(candidateKey)) return
    const snapshot = props.getSnapshot(),
      before = canonicalAgentJson(snapshot)
    if (
      (await hashAgentSnapshot(snapshot)) !== hash ||
      before !== canonicalAgentJson(current.current.getSnapshot())
    )
      throw new Error('画布已变化，请基于当前画布重新生成')
    current.current.onApply(workflow)
    setAppliedCandidates((keys) => new Set([...keys, candidateKey]))
  }
  return {
    runtime,
    status,
    phase,
    active,
    now: active ? now : (completedAt ?? now),
    startedAt,
    unread,
    announcement,
    currentHash,
    conflicted,
    appliedCandidates,
    stop,
    retry,
    addNodes,
    addResource,
    applyCandidate,
    switchConversation,
    deleteConversation,
    switchingConversation,
    modelForm,
    modelCatalog,
    nodes: props.snapshot.workflow.nodes.filter(
      (node) => !isLoopSystemNodeType(node.type),
    ) as readonly WorkflowNode[],
    selectedNodeIds: props.selectedNodeIds,
    enabled: props.enabled,
  }
}
type AgentContext = ReturnType<typeof useAgentController>
const WorkflowAgentContext = createContext<AgentContext | null>(null)
function WorkflowAgentProviderContent(props: ProviderProps) {
  const value = useAgentController(props)
  return (
    <WorkflowAgentContext value={value}>
      <AssistantRuntimeProvider runtime={value.runtime}>{props.children}</AssistantRuntimeProvider>
    </WorkflowAgentContext>
  )
}
export function WorkflowAgentProvider(props: ProviderProps) {
  return (
    <WorkflowAgentProviderContent
      key={`${getAgentAccountId()}.${props.appId ?? props.snapshot.workflow.id}`}
      {...props}
    />
  )
}
export function useWorkflowAgent() {
  const context = useContext(WorkflowAgentContext)
  if (!context) throw new Error('AI 助手必须位于工作流编辑器内')
  return context
}
export function getMessageNodeReferences(message: ThreadMessage): WorkflowNodeReference[] {
  return message.role === 'user'
    ? message.attachments
        .flatMap((attachment) =>
          attachment.content
            .filter((part) => part.type === 'data' && part.name === 'workflow-node')
            .map((part) =>
              part.type === 'data' ? (part.data as WorkflowNodeReference) : undefined,
            ),
        )
        .filter((ref): ref is WorkflowNodeReference => Boolean(ref))
    : []
}

export function getAgentConversationTitle(messages: readonly ThreadMessage[], draft = ''): string {
  const first = messages.find((message) => message.role === 'user'),
    title = (
      first?.content
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join(' ') ?? draft
    )
      .replace(/\s+/g, ' ')
      .trim()
  return title ? Array.from(title).slice(0, 40).join('') : '新对话'
}
