import {
  useAuiState,
  AttachmentPrimitive,
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  ThreadListPrimitive,
  ThreadListItemPrimitive,
  type DataMessagePartProps,
  type ReasoningMessagePartProps,
  type TextMessagePartProps,
  type ToolCallMessagePartProps,
} from '@assistant-ui/react'
import type { Workflow, WorkflowNode } from '@ai-workflow/core'
import { NodeIconBadge } from '@ai-workflow/nodes-ui'
import { Button } from '@ai-workflow/ui/components/button'
import { Table } from '@ai-workflow/ui/components/table'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@ai-workflow/ui/components/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ai-workflow/ui/components/tooltip'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { cn } from '@ai-workflow/ui/lib/utils'
import {
  ArrowDown,
  ArrowUp,
  Ban,
  BookOpen,
  Bot,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  CircleX,
  Clock,
  FileSearch,
  History,
  ImagePlus,
  Workflow as WorkflowIcon,
  Layers,
  LayoutDashboard,
  ListFilter,
  LoaderCircle,
  MessageSquare,
  Plus,
  ScanSearch,
  ShieldCheck,
  Square,
  Trash2,
  WandSparkles,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react'
import { StreamdownTextPrimitive } from '@assistant-ui/react-streamdown'
import type { ExtraProps } from 'streamdown'
import { getModelProviderStrategy } from '@/features/models'
import { useWorkflowCatalog } from '../catalog/workflow-web-catalog'
import {
  useWorkflowAgent,
  getMessageNodeReferences,
  getAgentConversationTitle,
} from './workflow-agent-provider'
import { agentResourceReferenceSchema } from '../schema'
import { AgentContextPicker, AgentComposerTriggers } from './agent-context-picker'
import { PromptInput, PromptInputTextarea, PromptInputToolbar } from './prompt-input'
import type { AgentRunStatus, ToolTrace } from './agent-transcript'
import type { AgentError, AgentToolDisplay } from '@ai-workflow/agent-protocol'

const MARKDOWN_OPTIONS = {
    security: {
      allowedProtocols: ['http', 'https', 'mailto'],
      allowDataImages: false,
      blockedLinkClass: 'text-muted-foreground',
      blockedImageClass: 'text-muted-foreground',
    },
    remarkRehypeOptions: { allowDangerousHtml: false },
  },
  TOOL_PRESENTATIONS: Record<string, { label: string; icon: LucideIcon }> = {
    read_canvas: { label: '读取画布', icon: LayoutDashboard },
    list_node_types: { label: '查询节点目录', icon: ListFilter },
    get_node_type: { label: '查看节点配置', icon: Layers },
    inspect_project_resources: { label: '查询项目资源', icon: BookOpen },
    list_workflow_runs: { label: '查询运行记录', icon: ScanSearch },
    get_workflow_run: { label: '读取运行追踪', icon: FileSearch },
    validate_workflow: { label: '校验工作流', icon: ShieldCheck },
    set_canvas_candidate: { label: '生成工作流候选', icon: WandSparkles },
  },
  OUTCOMES: Record<string, { label: string; icon: LucideIcon; color: string }> = {
    completed: { label: '运行完成', icon: Check, color: 'text-success' },
    cancelled: { label: '已停止', icon: Ban, color: 'text-muted-foreground' },
    timed_out: { label: '运行超时', icon: Clock, color: 'text-warning' },
    failed: { label: '运行失败', icon: CircleX, color: 'text-destructive' },
  }
function seconds(start: number | undefined, end: number) {
  return start === undefined ? '0s' : `${Math.max(0, (end - start) / 1000).toFixed(1)}s`
}

function AgentText({ text }: TextMessagePartProps) {
  return <p className="text-foreground text-sm leading-6 break-words whitespace-pre-wrap">{text}</p>
}
function AgentMarkdownTable({ children }: { children?: ReactNode } & ExtraProps) {
  return (
    <Table
      containerClassName="not-prose border-border my-3 max-w-full rounded-lg border-[0.5px]"
      className="text-foreground border-collapse text-sm leading-6 wrap-normal [&_code]:whitespace-nowrap [&_td]:min-w-24 [&_td]:px-3 [&_td]:align-top [&_th]:px-3"
    >
      {children}
    </Table>
  )
}
function AgentMarkdown() {
  return (
    <StreamdownTextPrimitive
      {...MARKDOWN_OPTIONS}
      defer
      skipHtml
      controls={false}
      components={{ table: AgentMarkdownTable }}
      className="prose prose-sm prose-no-margin text-foreground [&_[data-streamdown=link]]:text-primary [&_[data-streamdown=link]]:focus-visible:bg-accent [&_blockquote]:border-border [&_pre]:bg-input max-w-none min-w-0 text-sm leading-6 wrap-anywhere [&_[data-streamdown=link]]:cursor-pointer [&_[data-streamdown=link]]:rounded-sm [&_[data-streamdown=link]]:underline-offset-4 [&_[data-streamdown=link]]:transition-colors [&_[data-streamdown=link]]:focus-visible:outline-none [&_blockquote]:border-l [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:text-xs [&_pre]:leading-5 [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit"
    />
  )
}
function AgentMessageDetails({
  id,
  open,
  children,
}: {
  id: string
  open: boolean
  children: ReactNode
}) {
  const reducedMotion = useReducedMotion()
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          id={id}
          className="overflow-hidden"
          initial={{ height: reducedMotion ? 'auto' : 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: reducedMotion ? 'auto' : 0, opacity: 0 }}
          transition={{
            duration: reducedMotion ? 0.12 : 0.2,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
function AgentReasoning({ text, status, timing }: ReasoningMessagePartProps) {
  const { now } = useWorkflowAgent(),
    [expanded, setExpanded] = useState<boolean>(),
    id = useId(),
    running = status.type === 'running',
    open = expanded ?? running
  return (
    <div className="text-muted-foreground bg-muted/40 rounded-lg p-2.5 text-xs">
      <button
        type="button"
        className="focus-visible:bg-muted flex w-full cursor-pointer items-center gap-2 text-left"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setExpanded(!open)}
      >
        <Brain
          className={cn('size-3.5', running && 'text-primary motion-safe:animate-pulse')}
          aria-hidden
        />
        <span className="flex-1">{running ? '正在思考' : '思考过程'}</span>
        <span>{seconds(timing?.startedAt, timing?.completedAt ?? now)}</span>
        <ChevronDown
          className={cn(
            'size-3.5 transition-transform motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      <AgentMessageDetails id={id} open={open}>
        {text && <p className="pt-2 leading-5 break-words whitespace-pre-wrap">{text}</p>}
      </AgentMessageDetails>
    </div>
  )
}
function AgentToolPayload({ label, display }: { label: string; display: AgentToolDisplay }) {
  const data = display.data ?? display.fields
  if (data === undefined) return null
  return (
    <div className="space-y-1 pt-2">
      <p className="text-foreground font-medium">{label}</p>
      <pre className="bg-input max-h-64 overflow-auto rounded-lg p-2 font-mono text-xs leading-5 break-words whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
      {display.truncated && <p>数据已截断，可缩小查询范围查看。</p>}
    </div>
  )
}
function AgentToolCard({ toolName, artifact }: ToolCallMessagePartProps) {
  const { now } = useWorkflowAgent(),
    [expanded, setExpanded] = useState<boolean>(),
    id = useId(),
    trace = artifact as ToolTrace | undefined,
    presentation = TOOL_PRESENTATIONS[toolName] ?? {
      label: toolName,
      icon: Wrench,
    },
    Icon = presentation.icon,
    state = trace?.state ?? 'queued',
    running = state === 'running' || state === 'progress',
    stateIcon = running
      ? LoaderCircle
      : state === 'succeeded'
        ? Check
        : state === 'failed'
          ? CircleX
          : state === 'cancelled'
            ? Ban
            : Clock,
    StateIcon = stateIcon,
    open = expanded ?? (running || state === 'failed'),
    label = running
      ? '运行中'
      : state === 'queued'
        ? '等待执行'
        : state === 'succeeded'
          ? '已完成'
          : state === 'failed'
            ? '失败'
            : '已停止',
    start = trace?.startedAt ? Date.parse(trace.startedAt) : undefined,
    end = trace?.completedAt ? Date.parse(trace.completedAt) : now,
    resultSummary = trace?.displayResult?.summary
  return (
    <div className="border-border/60 rounded-xl border-[0.5px] p-3 text-xs">
      <button
        type="button"
        className="focus-visible:bg-muted flex w-full cursor-pointer items-center gap-2 text-left"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setExpanded(!open)}
      >
        <Icon className="text-muted-foreground size-4" aria-hidden />
        <span className="text-foreground min-w-0 flex-1 font-medium">{presentation.label}</span>
        <span
          className={cn(
            'flex items-center gap-1',
            running
              ? 'text-primary'
              : state === 'succeeded'
                ? 'text-success'
                : state === 'failed'
                  ? 'text-destructive'
                  : 'text-muted-foreground',
          )}
        >
          <StateIcon
            className={cn('size-3.5', running && 'motion-safe:animate-spin')}
            aria-hidden
          />
          {label}
        </span>
        {start && <span className="text-muted-foreground">{seconds(start, end)}</span>}
        <ChevronDown
          className={cn(
            'text-muted-foreground size-3 transition-transform motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {resultSummary && !open && (
        <p className="text-muted-foreground mt-1 break-words">{resultSummary}</p>
      )}
      <AgentMessageDetails id={id} open={open}>
        <div className="text-muted-foreground space-y-1 pt-3">
          {trace?.displayArgs.data === undefined && (
            <p>{trace?.displayArgs.summary ?? '正在等待工具执行'}</p>
          )}
          {trace?.displayArgs && <AgentToolPayload label="调用参数" display={trace.displayArgs} />}
          {running && start && now - start >= 10_000 && <p>仍在处理中 · {seconds(start, now)}</p>}
          {trace?.progress && (
            <>
              <p>{trace.progress.message}</p>
              {trace.progress.total !== undefined && trace.progress.completed !== undefined && (
                <progress
                  className="accent-primary w-full"
                  max={trace.progress.total}
                  value={trace.progress.completed}
                  aria-label="工具执行进度"
                />
              )}
            </>
          )}
          {resultSummary && (
            <p className={state === 'failed' ? 'text-destructive' : undefined}>{resultSummary}</p>
          )}
          {trace?.displayResult && (
            <AgentToolPayload label="返回结果" display={trace.displayResult} />
          )}
          {state === 'failed' && <p>助手会尝试修正；本轮结束后可基于当前画布重试。</p>}
        </div>
      </AgentMessageDetails>
    </div>
  )
}
function CandidateCard({
  data,
}: DataMessagePartProps<{ workflow: Workflow; baseSnapshotHash: string }>) {
  const agent = useWorkflowAgent(),
    message = useAuiState((s) => s.message),
    [applying, setApplying] = useState(false),
    [applyError, setError] = useState<string>(),
    key = `${message.id}:${data.baseSnapshotHash}`,
    applied = agent.appliedCandidates.has(key),
    conflicted = Boolean(agent.currentHash && agent.currentHash !== data.baseSnapshotHash),
    completed = message.status?.type === 'complete',
    incomplete = message.status?.type === 'incomplete',
    added = data.workflow.nodes.filter(
      (node: WorkflowNode) => !agent.nodes.some((current) => current.id === node.id),
    ).length,
    removed = agent.nodes.filter(
      (node) => !data.workflow.nodes.some((candidate: WorkflowNode) => candidate.id === node.id),
    ).length
  async function apply() {
    setApplying(true)
    setError(undefined)
    try {
      await agent.applyCandidate(data.workflow, data.baseSnapshotHash, key)
    } catch (error) {
      setError(error instanceof Error ? error.message : '应用候选失败')
    } finally {
      setApplying(false)
    }
  }
  return (
    <section
      className="border-border bg-muted/30 space-y-3 rounded-xl border-[0.5px] p-3 text-xs"
      aria-label="工作流候选"
    >
      <div className="flex items-center gap-2">
        <WandSparkles className="text-primary size-4" aria-hidden />
        <h3 className="text-sm font-semibold">工作流候选</h3>
        <span className="text-success ml-auto">校验通过</span>
      </div>
      <p className="text-muted-foreground">
        {data.workflow.nodes.length} 个节点 · {data.workflow.edges.length} 条连线 ·{' '}
        {data.workflow.outputs.length} 个公开输出
      </p>
      <p className="text-muted-foreground">
        相对当前画布：新增 {added} 个节点，移除 {removed} 个节点
      </p>
      {applied ? (
        <p className="text-success">已应用到画布，可使用撤销恢复</p>
      ) : incomplete ? (
        <p className="text-muted-foreground">本轮未完成，候选仅供查看。请使用当前画布重试。</p>
      ) : conflicted ? (
        <>
          <p className="text-warning">画布已变化，请基于当前画布重新生成。</p>
          <Button
            variant="secondary"
            size="sm"
            disabled={agent.active}
            onClick={() => agent.retry(message.id)}
          >
            基于当前画布重新生成
          </Button>
        </>
      ) : (
        <Button
          variant="confirm"
          size="sm"
          disabled={agent.active || !completed || applying || !agent.currentHash}
          onClick={() => void apply()}
        >
          {applying ? '正在应用' : !completed ? '等待本轮完成' : '应用到画布'}
        </Button>
      )}
      {applyError && <p className="text-destructive">{applyError}</p>}
    </section>
  )
}
function Outcome({
  data,
}: DataMessagePartProps<{
  state: AgentRunStatus
  error?: AgentError
  completedAt?: number
}>) {
  const agent = useWorkflowAgent(),
    message = useAuiState((s) => s.message),
    presentation = OUTCOMES[data.state] ?? OUTCOMES.failed!,
    Icon = presentation.icon
  return (
    <div className="space-y-2 text-xs">
      <p className={cn('flex items-center gap-1.5', presentation.color)}>
        <Icon className="size-3.5" aria-hidden />
        {presentation.label}
        {data.completedAt && (
          <span className="text-muted-foreground">
            · {seconds(message.createdAt.getTime(), data.completedAt)}
          </span>
        )}
      </p>
      {data.error && <p className="text-destructive leading-5">{data.error.message}</p>}
      {data.state !== 'completed' && (
        <Button
          size="sm"
          variant="secondary"
          disabled={agent.active}
          onClick={() => agent.retry(message.id)}
        >
          使用当前画布重试
        </Button>
      )}
      {data.error?.code === 'MODEL_TOOL_CALL_UNSUPPORTED' && (
        <p className="text-muted-foreground">请在输入框中更换对话模型。</p>
      )}
    </div>
  )
}
function UserMessage() {
  const message = useAuiState((s) => s.message),
    agent = useWorkflowAgent(),
    { nodeRegistry } = useWorkflowCatalog(),
    references = getMessageNodeReferences(message)
  return (
    <MessagePrimitive.Root className="bg-primary/10 ml-auto w-fit max-w-[85%] min-w-0 space-y-2 rounded-xl p-3">
      <MessagePrimitive.Parts components={{ Text: AgentText, data: { Fallback: () => null } }} />
      {message.role === 'user' &&
        message.attachments.map((attachment) => {
          const image = attachment.content.find((part) => part.type === 'image'),
            part = attachment.content.find(
              (content) => content.type === 'data' && content.name === 'agent-resource',
            ),
            resource = agentResourceReferenceSchema.safeParse(
              part?.type === 'data' ? part.data : undefined,
            )
          return image?.type === 'image' ? (
            <img
              key={attachment.id}
              src={image.image}
              alt={attachment.name}
              className="max-h-56 max-w-full rounded-lg object-contain"
            />
          ) : resource.success ? (
            <span
              key={attachment.id}
              className="bg-background text-muted-foreground inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs"
            >
              {resource.data.kind === 'workflow' ? (
                <WorkflowIcon className="size-3.5 shrink-0" aria-hidden />
              ) : (
                <BookOpen className="size-3.5 shrink-0" aria-hidden />
              )}
              <span className="truncate">{resource.data.label}</span>
            </span>
          ) : null
        })}
      {references.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {references.map((ref) => (
            <span
              key={ref.nodeId}
              className="bg-background text-muted-foreground inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs"
            >
              <NodeIconBadge
                type={ref.nodeType}
                icon={nodeRegistry.get(ref.nodeType)?.definition.icon}
                className="size-4 rounded"
              />
              <span className="truncate">{ref.label}</span>
              {!agent.nodes.some((node) => node.id === ref.nodeId) && <span>已删除</span>}
            </span>
          ))}
        </div>
      )}
    </MessagePrimitive.Root>
  )
}
function AssistantMessage() {
  const agent = useWorkflowAgent(),
    message = useAuiState((s) => s.message),
    running = message.status?.type === 'running',
    candidateIndex = message.content.findLastIndex(
      (part) => part.type === 'data' && part.name === 'workflow-candidate',
    )
  return (
    <MessagePrimitive.Root className="space-y-3">
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold">
        <Bot className="size-4" aria-hidden />
        AI 助手
      </div>
      {running && agent.conflicted && (
        <p className="bg-warning/10 text-warning rounded-lg p-2 text-xs leading-5">
          画布已在 Agent 运行期间发生变化，候选完成后需要重新确认
        </p>
      )}
      <MessagePrimitive.Parts
        unstable_showEmptyOnNonTextEnd={false}
        components={{
          Text: AgentMarkdown,
          Reasoning: AgentReasoning,
          Empty: ({ status }) =>
            status.type === 'running' ? (
              <p className="text-muted-foreground text-xs">正在准备上下文…</p>
            ) : null,
          tools: { Fallback: AgentToolCard },
          data: {
            by_name: {
              'workflow-candidate': () => null,
              'agent-outcome': Outcome,
            },
          },
        }}
      />
      {candidateIndex !== -1 && (
        <MessagePrimitive.PartByIndex
          index={candidateIndex}
          components={{
            data: { by_name: { 'workflow-candidate': CandidateCard } },
          }}
        />
      )}
    </MessagePrimitive.Root>
  )
}

function AgentComposer() {
  const agent = useWorkflowAgent(),
    attachments = useAuiState((s) => s.composer.attachments),
    text = useAuiState((s) => s.composer.text),
    loadingConversation = useAuiState((s) => s.thread.isLoading || s.threads.isLoading),
    conversationBusy = agent.switchingConversation || loadingConversation,
    { nodeRegistry } = useWorkflowCatalog(),
    catalog = agent.modelCatalog,
    selected = agent.modelForm.form.groupId
      ? `${agent.modelForm.form.groupId}:${agent.modelForm.form.configuredModelId}`
      : '',
    modelGroups = catalog.modelGroups.filter(
      (group) => group.enabled && group.models.some((model) => model.enabled),
    ),
    models = modelGroups.flatMap((group) =>
      group.models.filter((model) => model.enabled).map((model) => ({ group, model })),
    ),
    selectedModel = models.find(({ group, model }) => `${group.id}:${model.id}` === selected),
    modelSelected = Boolean(selectedModel),
    SelectedProviderIcon = selectedModel
      ? getModelProviderStrategy(selectedModel.group.providerType).icon
      : undefined
  return (
    <div className="relative shrink-0 px-3 pt-1 pb-3">
      <ComposerPrimitive.TriggerPopoverRoot>
        <AgentComposerTriggers />
        <PromptInput
          aria-label="Prompt Input"
          onSubmit={(event) => {
            if (agent.active || conversationBusy || !modelSelected) {
              event.preventDefault()
              event.stopPropagation()
            }
          }}
        >
          {attachments.length > 0 && (
            <TooltipProvider>
              <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto px-1 pt-1">
                <ComposerPrimitive.Attachments>
                  {({ attachment }) => {
                    const part = attachment.content?.find(
                        (item) => item.type === 'data' && item.name === 'workflow-node',
                      ),
                      nodeType =
                        part?.type === 'data' ? (part.data as { nodeType: string }).nodeType : '',
                      resourcePart = attachment.content?.find(
                        (item) => item.type === 'data' && item.name === 'agent-resource',
                      ),
                      resource = agentResourceReferenceSchema.safeParse(
                        resourcePart?.type === 'data' ? resourcePart.data : undefined,
                      ),
                      image = attachment.content?.find((item) => item.type === 'image')
                    return (
                      <AttachmentPrimitive.Root className="bg-muted border-border/60 inline-flex h-7 max-w-full min-w-0 items-center gap-1 rounded-md border-[0.5px] pr-0.5 pl-1.5 text-xs">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                              {image?.type === 'image' ? (
                                <img
                                  src={image.image}
                                  alt={attachment.name}
                                  className="size-5 shrink-0 rounded object-cover"
                                />
                              ) : nodeType ? (
                                <NodeIconBadge
                                  type={nodeType}
                                  icon={nodeRegistry.get(nodeType)?.definition.icon}
                                  className="size-3.5 rounded [&_svg]:size-2.5"
                                />
                              ) : resource.success && resource.data.kind === 'workflow' ? (
                                <WorkflowIcon
                                  className="text-muted-foreground size-3.5 shrink-0"
                                  aria-hidden
                                />
                              ) : attachment.type === 'image' || attachment.file ? (
                                <ImagePlus
                                  className="text-muted-foreground size-3.5 shrink-0"
                                  aria-hidden
                                />
                              ) : (
                                <BookOpen
                                  className="text-muted-foreground size-3.5 shrink-0"
                                  aria-hidden
                                />
                              )}
                              <span className="max-w-32 min-w-0 truncate">
                                <AttachmentPrimitive.Name />
                              </span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            sideOffset={8}
                            className="max-w-64 flex-col items-start gap-2"
                          >
                            {image?.type === 'image' && (
                              <img
                                src={image.image}
                                alt={attachment.name}
                                className="max-h-40 max-w-full rounded-md object-contain"
                              />
                            )}
                            <span className="max-w-full break-all">{attachment.name}</span>
                          </TooltipContent>
                        </Tooltip>
                        <AttachmentPrimitive.Remove asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:bg-button-secondary-bg-active focus-visible:bg-button-secondary-bg-active dark:hover:bg-button-secondary-bg-active dark:focus-visible:bg-button-secondary-bg-active shrink-0 motion-reduce:transition-none"
                            aria-label={`移除${attachment.name}上下文`}
                          >
                            <X className="size-3.5" aria-hidden />
                          </Button>
                        </AttachmentPrimitive.Remove>
                      </AttachmentPrimitive.Root>
                    )
                  }}
                </ComposerPrimitive.Attachments>
              </div>
            </TooltipProvider>
          )}
          <PromptInputTextarea
            aria-label="给 AI 助手发送消息"
            placeholder="描述你希望创建或修改的工作流…"
            disabled={!agent.enabled || conversationBusy}
            submitMode={agent.active || conversationBusy || !modelSelected ? 'none' : 'enter'}
          />
          <PromptInputToolbar>
            <AgentContextPicker />
            <Select
              value={selected}
              onValueChange={(value) => {
                const [groupId, configuredModelId] = value.split(':')
                agent.modelForm.updateForm({ groupId, configuredModelId })
              }}
              disabled={agent.active || conversationBusy || catalog.loading}
            >
              <SelectTrigger
                size="sm"
                className="text-foreground hover:bg-accent focus-visible:bg-accent dark:hover:bg-accent dark:focus-visible:bg-accent max-w-full min-w-0 rounded-full border-transparent bg-transparent px-3 text-xs hover:border-transparent focus-visible:border-transparent dark:bg-transparent"
                aria-label="Agent 对话模型"
              >
                <SelectValue placeholder={catalog.loading ? '正在加载模型' : '选择模型'}>
                  {selectedModel && SelectedProviderIcon ? (
                    <>
                      <SelectedProviderIcon aria-hidden className="size-3.5" />
                      <span className="truncate">
                        {selectedModel.model.displayName ?? selectedModel.model.modelId}
                      </span>
                    </>
                  ) : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                position="popper"
                align="start"
                side="top"
                sideOffset={4}
                className="w-64 max-w-[calc(100vw-2rem)] rounded-2xl p-1"
              >
                {modelGroups.map((group) => {
                  const ProviderIcon = getModelProviderStrategy(group.providerType).icon
                  return (
                    <SelectGroup key={group.id}>
                      <SelectLabel className="flex items-center gap-1.5">
                        <ProviderIcon aria-hidden className="size-3.5" />
                        <span className="truncate">{group.name}</span>
                      </SelectLabel>
                      {group.models
                        .filter((model) => model.enabled)
                        .map((model) => (
                          <SelectItem
                            key={model.id}
                            value={`${group.id}:${model.id}`}
                            textValue={model.displayName ?? model.modelId}
                            className="data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground [&_svg]:text-foreground mx-0 h-9 [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1"
                          >
                            <span className="truncate" title={model.displayName ?? model.modelId}>
                              {model.displayName ?? model.modelId}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  )
                })}
              </SelectContent>
            </Select>
            {agent.active ? (
              <Button
                type="button"
                size="icon-sm"
                variant="confirm"
                className="bg-input-placeholder hover:bg-input-placeholder/85 focus-visible:bg-input-placeholder/85 active:bg-input-placeholder/70 ml-auto shrink-0 rounded-full"
                disabled={agent.status === 'stopping'}
                aria-label={
                  agent.status === 'stopping' ? '正在停止 Agent 运行' : '停止当前 Agent 运行'
                }
                onClick={() => void agent.stop()}
              >
                <Square className="size-3.5" aria-hidden />
              </Button>
            ) : (
              <ComposerPrimitive.Send
                asChild
                disabled={
                  (!text.trim() && attachments.length === 0) ||
                  !modelSelected ||
                  !agent.enabled ||
                  conversationBusy ||
                  attachments.some(
                    (attachment) =>
                      attachment.status.type === 'running' ||
                      attachment.status.type === 'incomplete',
                  )
                }
              >
                <Button
                  type="button"
                  size="icon-sm"
                  variant="confirm"
                  className="ml-auto shrink-0 rounded-full"
                  aria-label="发送给 AI 助手"
                >
                  <ArrowUp className="size-4" aria-hidden />
                </Button>
              </ComposerPrimitive.Send>
            )}
          </PromptInputToolbar>
        </PromptInput>
      </ComposerPrimitive.TriggerPopoverRoot>
      {catalog.loadError && (
        <Button type="button" variant="ghost" size="xs" className="mt-1" onClick={catalog.reload}>
          重新加载模型
        </Button>
      )}
      {catalog.loaded && models.length === 0 && (
        <p className="text-muted-foreground mt-2 px-1 text-xs">
          请先在模型管理中启用一个对话模型。
        </p>
      )}
    </div>
  )
}

function AgentConversationHistory() {
  const agent = useWorkflowAgent(),
    [open, setOpen] = useState(false),
    [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string }>(),
    [deleting, setDeleting] = useState(false),
    currentId = useAuiState((s) => s.threads.mainThreadId),
    hasHistory = useAuiState((s) => s.threads.threadIds.length > 0),
    loading = useAuiState((s) => s.threads.isLoading),
    loadingConversation = useAuiState((s) => s.thread.isLoading),
    loadError = useAuiState((s) => Boolean(s.threads.loadError)),
    running = useAuiState((s) => s.thread.isRunning),
    disabled =
      agent.active || running || agent.switchingConversation || loading || loadingConversation
  async function select(threadId?: string) {
    if (await agent.switchConversation(threadId)) setOpen(false)
  }
  async function confirmDelete() {
    if (!deleteTarget || deleting || disabled) return
    setDeleting(true)
    try {
      if (await agent.deleteConversation(deleteTarget.id)) setDeleteTarget(undefined)
    } finally {
      setDeleting(false)
    }
  }
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="对话历史">
            <History className="size-4" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-80 max-w-[calc(100vw-2rem)] p-2"
          aria-label="对话历史"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="mb-2 flex items-center justify-between gap-2 py-1 pl-2">
            <h3 className="text-sm font-medium">对话历史</h3>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={disabled}
              onClick={() => void select()}
            >
              <Plus className="size-3.5" aria-hidden />
              新建对话
            </Button>
          </div>
          <ThreadListPrimitive.Root
            className="max-h-72 space-y-1 overflow-y-auto"
            aria-label="历史对话列表"
          >
            <ThreadListPrimitive.Items>
              {({ threadListItem }) => (
                <ThreadListItemPrimitive.Root
                  className={cn(
                    'group/history hover:bg-accent focus-within:bg-accent flex items-center gap-1 rounded-lg transition-colors motion-reduce:transition-none',
                    threadListItem.id === currentId && 'bg-accent',
                  )}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 min-w-0 flex-1 justify-start gap-2 bg-transparent hover:bg-transparent focus-visible:underline dark:hover:bg-transparent"
                    aria-current={threadListItem.id === currentId ? 'true' : undefined}
                    title={threadListItem.title || '新对话'}
                    disabled={disabled}
                    onClick={() => void select(threadListItem.id)}
                  >
                    <MessageSquare
                      className="text-muted-foreground size-3.5 shrink-0"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-left">
                      <ThreadListItemPrimitive.Title fallback="新对话" />
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive focus-visible:text-destructive mr-1 shrink-0 opacity-0 transition-opacity group-focus-within/history:opacity-100 group-hover/history:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100"
                    aria-label={`删除对话：${threadListItem.title || '新对话'}`}
                    disabled={disabled}
                    onClick={() => {
                      setDeleteTarget({
                        id: threadListItem.id,
                        title: threadListItem.title || '新对话',
                      })
                      setOpen(false)
                    }}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </ThreadListItemPrimitive.Root>
              )}
            </ThreadListPrimitive.Items>
            {loading && (
              <p className="text-muted-foreground px-3 py-6 text-center text-xs" role="status">
                正在加载对话历史…
              </p>
            )}
            {loadError && (
              <div className="px-3 py-4 text-center">
                <p className="text-muted-foreground mb-2 text-xs">无法加载对话历史</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => void agent.runtime.threads.reload().catch(() => undefined)}
                >
                  重新加载
                </Button>
              </div>
            )}
            {!hasHistory && !loading && !loadError && (
              <div className="text-muted-foreground px-3 py-6 text-center text-xs">
                <MessageSquare className="mx-auto mb-2 size-5" aria-hidden />
                <p className="text-foreground text-sm">暂无历史对话</p>
                <p className="mt-1 leading-5">开始对话后，可在这里切换和管理。</p>
              </div>
            )}
          </ThreadListPrimitive.Root>
          {disabled && !loading && (
            <p className="text-muted-foreground px-2 pt-2 text-xs" role="status">
              {loadingConversation
                ? '正在加载对话…'
                : agent.switchingConversation
                  ? '正在处理对话…'
                  : '运行结束后可切换或删除对话'}
            </p>
          )}
        </PopoverContent>
      </Popover>
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleting) setDeleteTarget(undefined)
        }}
      >
        <DialogContent showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle>确认删除对话</DialogTitle>
            <DialogDescription className="break-words">
              删除“{deleteTarget?.title}”后，对话消息、草稿和附件将无法恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm" disabled={deleting}>
                取消
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleting || disabled}
              aria-busy={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? '删除中…' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

const STARTER_PROMPTS = [
  '帮我搭建一个 HTTP 请求工作流',
  '检查当前工作流的配置问题',
  '解释这个工作流的执行过程',
  '为当前工作流补充错误处理',
]

export function WorkflowAgentPanel({ onClose }: { onClose: () => void }) {
  const agent = useWorkflowAgent(),
    isPresent = useIsPresent(),
    reducedMotion = useReducedMotion(),
    messages = useAuiState((s) => s.thread.messages),
    loadingConversation = useAuiState((s) => s.thread.isLoading),
    savedTitle = useAuiState((s) => s.threadListItem.title),
    title = savedTitle || getAgentConversationTitle(messages)
  return (
    <aside
      id="workflow-ai-panel"
      aria-labelledby="workflow-ai-title"
      aria-busy={agent.active || agent.switchingConversation || loadingConversation}
      aria-hidden={!isPresent}
      inert={!isPresent}
      className="nodrag nowheel nokey border-border/70 bg-background flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border-[0.5px] shadow-xs"
    >
      <header className="flex shrink-0 items-center gap-2 pt-3 pr-2 pb-2 pl-4">
        <h2
          id="workflow-ai-title"
          className="min-w-0 flex-1 truncate text-sm font-semibold"
          title={title}
        >
          {title}
        </h2>
        <div className="text-muted-foreground flex shrink-0 items-center gap-0.5">
          <AgentConversationHistory />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="关闭 AI 助手"
            onClick={onClose}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      </header>
      {agent.active && (
        <p className="text-muted-foreground truncate px-4 pb-2 text-xs">
          {agent.status === 'stopping' ? '正在停止' : agent.phase} ·{' '}
          {seconds(agent.startedAt, agent.now)}
        </p>
      )}
      <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          <ThreadPrimitive.Viewport
            className="h-full overflow-y-auto px-4 py-3"
            autoScroll
            scrollToBottomOnRunStart={false}
          >
            {loadingConversation && (
              <p className="text-muted-foreground text-sm" role="status">
                正在加载对话…
              </p>
            )}
            <div className="space-y-6">
              <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
            </div>
          </ThreadPrimitive.Viewport>
          <ThreadPrimitive.ScrollToBottom asChild behavior={reducedMotion ? 'instant' : 'smooth'}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute bottom-2 left-1/2 -translate-x-1/2 disabled:hidden"
              aria-label="回到最新消息"
            >
              <ArrowDown className="size-3.5" aria-hidden />
              回到最新
            </Button>
          </ThreadPrimitive.ScrollToBottom>
        </div>
        {!loadingConversation && (
          <ThreadPrimitive.Empty>
            <section aria-label="开始对话" className="min-h-0 shrink overflow-y-auto px-4 py-5">
              <h3 className="text-2xl font-semibold tracking-tight">一起搭建工作流 👏</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                描述你的目标，我会读取画布并完善节点配置。
              </p>
              <div className="mt-6 space-y-1">
                {STARTER_PROMPTS.map((prompt) => (
                  <ThreadPrimitive.Suggestion key={prompt} prompt={prompt} send={false} asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground focus-visible:text-foreground h-auto w-full justify-start gap-2 bg-transparent px-0 py-2 text-left whitespace-normal hover:bg-transparent focus-visible:bg-transparent dark:hover:bg-transparent dark:focus-visible:bg-transparent"
                      disabled={!agent.enabled || agent.switchingConversation}
                    >
                      <ChevronRight className="-ml-1.5 size-3.5 shrink-0" aria-hidden />
                      {prompt}
                    </Button>
                  </ThreadPrimitive.Suggestion>
                ))}
              </div>
            </section>
          </ThreadPrimitive.Empty>
        )}
        <AgentComposer />
      </ThreadPrimitive.Root>
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {agent.announcement}
      </span>
    </aside>
  )
}
