import type { StudioWorkflowNodeRunDto, StudioWorkflowTestRunDto } from '@/api/studio'
import { BuiltinNodeType, nodeRegistry, type WorkflowNode } from '@ai-workflow/core'
import { CodeEditor } from '@ai-workflow/ui/components/code-editor'
import { Tabs, TabsContent } from '@ai-workflow/ui/components/tabs'
import { cn } from '@ai-workflow/ui/lib/utils'
import { getNodeThemeColor, NodeIcon } from '@ai-workflow/nodes-ui'
import { Ban, Check, CheckCircle2, ChevronRight, CircleX, Clock3, LoaderCircle } from 'lucide-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useState, type ReactNode } from 'react'

import { WorkflowPanelTabsList, WorkflowPanelTabsTrigger } from './workflow-panel-tabs'

export type WorkflowRunPanelTab = 'input' | 'result' | 'details' | 'trace'

interface WorkflowRunTabsProps {
  ariaLabel: string
  nodes: readonly WorkflowNode[]
  input?: ReactNode
  pending?: boolean
  run?: StudioWorkflowTestRunDto
  value?: WorkflowRunPanelTab
  onValueChange?: (value: WorkflowRunPanelTab) => void
}

const RUN_STATUS_PRESENTATIONS = {
  CANCELLED: {
    label: '已取消',
    icon: Ban,
    className: 'text-muted-foreground',
    surfaceClassName: 'border-border bg-muted/40',
  },
  FAILED: {
    label: '运行失败',
    icon: CircleX,
    className: 'text-destructive',
    surfaceClassName: 'border-destructive/40 bg-destructive/5 dark:bg-destructive/10',
  },
  PENDING: {
    label: '等待中',
    icon: Clock3,
    className: 'text-muted-foreground',
    surfaceClassName: 'border-border bg-muted/40',
  },
  QUEUED: {
    label: '排队中',
    icon: Clock3,
    className: 'text-warning',
    surfaceClassName: 'border-warning/40 bg-warning/10',
  },
  RUNNING: {
    label: '运行中',
    icon: LoaderCircle,
    className: 'text-primary',
    surfaceClassName: 'border-primary/40 bg-primary/5 dark:bg-primary/10',
  },
  SUCCEEDED: {
    label: '运行成功',
    icon: CheckCircle2,
    className: 'text-success',
    surfaceClassName: 'border-success/40 bg-success/10',
  },
  TIMED_OUT: {
    label: '运行超时',
    icon: CircleX,
    className: 'text-destructive',
    surfaceClassName: 'border-destructive/40 bg-destructive/5 dark:bg-destructive/10',
  },
} as const

export function WorkflowRunTabs({
  ariaLabel,
  nodes,
  input,
  pending = false,
  run,
  value,
  onValueChange,
}: WorkflowRunTabsProps) {
  const hasRun = Boolean(run) || pending

  return (
    <Tabs
      value={value}
      defaultValue={input ? 'input' : 'result'}
      onValueChange={(nextValue) => onValueChange?.(nextValue as WorkflowRunPanelTab)}
      className="flex h-full min-h-0 flex-col"
    >
      <WorkflowPanelTabsList aria-label={ariaLabel} className="shrink-0">
        {input ? <WorkflowPanelTabsTrigger value="input">输入</WorkflowPanelTabsTrigger> : null}
        <WorkflowPanelTabsTrigger value="result" disabled={!hasRun}>
          结果
        </WorkflowPanelTabsTrigger>
        <WorkflowPanelTabsTrigger value="details" disabled={!hasRun}>
          详情
        </WorkflowPanelTabsTrigger>
        <WorkflowPanelTabsTrigger value="trace" disabled={!hasRun}>
          追踪
        </WorkflowPanelTabsTrigger>
      </WorkflowPanelTabsList>

      {input ? (
        <TabsContent value="input" className="min-h-0 flex-1 overflow-y-auto">
          {input}
        </TabsContent>
      ) : null}

      <TabsContent value="result" className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {run ? <RunResultContent run={run} /> : <RunPendingState />}
      </TabsContent>

      <TabsContent value="details" className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {run ? <RunDetailsContent run={run} /> : <RunPendingState />}
      </TabsContent>

      <TabsContent value="trace" className="bg-muted/40 min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {run ? <RunTraceContent nodes={nodes} run={run} /> : <RunPendingState />}
      </TabsContent>
    </Tabs>
  )
}

function RunResultContent({ run }: { run: StudioWorkflowTestRunDto }) {
  return (
    <div className="space-y-3">
      <RunStatusSummary run={run} />
      {run.error ? (
        <JsonDataCard title="错误" value={{ error: run.error }} />
      ) : (
        <JsonDataCard title="输出" value={run.output} />
      )}
    </div>
  )
}

function RunDetailsContent({ run }: { run: StudioWorkflowTestRunDto }) {
  return (
    <div className="space-y-3">
      <JsonDataCard title="输入" value={run.input} />
      <JsonDataCard title="输出" value={run.error ? { error: run.error } : run.output} />
      <RunMetadata run={run} />
    </div>
  )
}

function RunMetadata({ run }: { run: StudioWorkflowTestRunDto }) {
  const metadata = [
    ['状态', getWorkflowRunStatusLabel(run.status)],
    ['执行人', run.triggeredBy?.username ?? '—'],
    ['触发方式', getWorkflowRunTriggerLabel(run.trigger)],
    ['运行模式', run.mode === 'FULL' ? '完整工作流' : '单节点'],
    ['排队时间', formatDateTime(run.queuedAt)],
    ['开始时间', formatDateTime(run.startedAt)],
    ['结束时间', formatDateTime(run.finishedAt)],
    ['运行耗时', formatDuration(run.durationMs)],
    ['运行步骤', `${run.nodeStates.length}`],
    ['追踪 ID', run.traceId],
    ['运行 ID', run.id],
  ] as const

  return (
    <section className="px-1 py-1">
      <h3 className="text-muted-foreground text-[13px] leading-5 font-semibold">元数据</h3>
      <dl className="mt-2.5 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-2 text-[13px] leading-5">
        {metadata.map(([label, metadataValue]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-foreground min-w-0 [overflow-wrap:anywhere]">{metadataValue}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function RunTraceContent({
  nodes,
  run,
}: {
  nodes: readonly WorkflowNode[]
  run: StudioWorkflowTestRunDto
}) {
  const traceNodes = resolveTraceNodes(nodes, run)

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.16, ease: 'easeOut' }}>
      <div className="space-y-1">
        {traceNodes.map((node) => (
          <TraceNodeItem key={node.id} node={node} run={run} />
        ))}
      </div>
    </MotionConfig>
  )
}

function TraceNodeItem({ node, run }: { node: WorkflowNode; run: StudioWorkflowTestRunDto }) {
  const [expanded, setExpanded] = useState(false)
  const nodeRun = findLatestNodeRun(run.nodeRuns, node.id)
  const status = resolveTraceNodeStatus(run, node.id, nodeRun)
  const definition = nodeRegistry.get(node.type)?.definition
  const nodeLabel = node.label || definition?.label || node.type
  const contentId = `workflow-run-trace-${run.id}-${node.id}`
  const durationMs = run.traceNodeDurations?.[node.id] ?? nodeRun?.durationMs ?? 0

  return (
    <section className="border-border/60 bg-background overflow-hidden rounded-lg border-[0.5px] shadow-xs transition-shadow duration-200 ease-out hover:shadow-md motion-reduce:transition-none">
      <button
        type="button"
        aria-controls={contentId}
        aria-expanded={expanded}
        aria-label={`${expanded ? '收起' : '展开'}${nodeLabel}运行详情`}
        className="focus-visible:bg-muted/50 flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left outline-none"
        onClick={() => setExpanded((current) => !current)}
      >
        <motion.span
          animate={{ rotate: expanded ? 90 : 0 }}
          className="text-muted-foreground flex size-3 shrink-0 items-center justify-center"
          aria-hidden
        >
          <ChevronRight className="size-3" />
        </motion.span>
        <span
          className="text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-md shadow-sm"
          style={{ backgroundColor: getNodeThemeColor(node.type) }}
        >
          <NodeIcon icon={definition?.icon} className="size-3" aria-hidden />
        </span>
        <span className="text-foreground min-w-0 flex-1 truncate text-[13px] font-semibold">
          {nodeLabel}
        </span>
        {status === 'RUNNING' ? null : (
          <span className="text-muted-foreground shrink-0 text-xs">
            {formatDuration(durationMs)}
          </span>
        )}
        <WorkflowRunStatusIcon status={status} />
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            id={contentId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 px-2.5 py-2">
              <JsonDataCard title="输入" value={getTraceNodeInput(node, nodeRun, run)} compact />
              <JsonDataCard title="输出" value={getTraceNodeOutput(node, nodeRun, run)} compact />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}

function RunStatusSummary({ run }: { run: StudioWorkflowTestRunDto }) {
  const presentation = getStatusPresentation(run.status)
  const Icon = presentation.icon

  return (
    <section
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-[background-color,border-color] duration-200',
        presentation.surfaceClassName,
      )}
    >
      <div>
        <p className="text-muted-foreground text-[11px] leading-4">运行状态</p>
        <div
          className={`mt-0.5 flex items-center gap-1.5 text-[13px] leading-4 font-semibold ${presentation.className}`}
        >
          <Icon
            className={`size-3.5 ${run.status === 'RUNNING' ? 'animate-spin motion-reduce:animate-none' : ''}`}
            aria-hidden
          />
          {presentation.label}
        </div>
      </div>
      <div className="text-right">
        <p className="text-muted-foreground text-[11px] leading-4">运行耗时</p>
        <p className="text-foreground mt-0.5 text-[13px] leading-4 font-medium">
          {formatDuration(run.durationMs)}
        </p>
      </div>
    </section>
  )
}

export function WorkflowRunStatusIcon({ status }: { status: string }) {
  const presentation = getStatusPresentation(status)
  const Icon = presentation.icon

  if (status === 'SUCCEEDED') {
    return (
      <span
        className="bg-success text-primary-foreground flex size-3.5 shrink-0 items-center justify-center rounded-full"
        title={presentation.label}
      >
        <Check className="size-2.5" strokeWidth={3} aria-label={presentation.label} />
      </span>
    )
  }

  return (
    <span className={`shrink-0 ${presentation.className}`} title={presentation.label}>
      <Icon
        className={`size-3.5 ${status === 'RUNNING' ? 'animate-spin motion-reduce:animate-none' : ''}`}
        aria-label={presentation.label}
      />
    </span>
  )
}

function JsonDataCard({
  compact = false,
  title,
  value: jsonValue,
}: {
  compact?: boolean
  title: string
  value: unknown
}) {
  return (
    <section className="bg-input focus-within:border-input-focus overflow-hidden rounded-lg border border-transparent transition-[border-color]">
      <div className="text-foreground border-border/50 flex h-9 items-center justify-between border-b px-3">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        <span className="text-muted-foreground text-[10px] font-semibold tracking-wide">JSON</span>
      </div>
      <CodeEditor
        aria-label={`${title} JSON`}
        className={cn('w-full', compact ? 'h-28' : 'h-44')}
        language="json"
        value={formatJson(jsonValue)}
        options={{
          domReadOnly: true,
          readOnly: true,
          renderValidationDecorations: 'off',
        }}
      />
    </section>
  )
}

function RunPendingState() {
  return (
    <div role="status" className="flex min-h-40 flex-col items-center justify-center text-center">
      <LoaderCircle
        className="text-primary size-5 animate-spin motion-reduce:animate-none"
        aria-hidden
      />
      <p className="text-foreground mt-2 text-[13px] font-medium">正在创建运行记录</p>
      <p className="text-muted-foreground mt-1 text-xs">运行状态将在这里实时更新</p>
    </div>
  )
}

function findLatestNodeRun(
  nodeRuns: readonly StudioWorkflowNodeRunDto[],
  nodeId: string,
): StudioWorkflowNodeRunDto | undefined {
  for (let index = nodeRuns.length - 1; index >= 0; index -= 1) {
    const nodeRun = nodeRuns[index]
    if (nodeRun?.nodeId === nodeId) return nodeRun
  }
  return undefined
}

function resolveTraceNodes(
  nodes: readonly WorkflowNode[],
  run: StudioWorkflowTestRunDto,
): WorkflowNode[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const traceNodeIds = run.traceNodeIds ?? resolveLegacyTraceNodeIds(nodes, run)

  return traceNodeIds.flatMap((nodeId) => {
    const node = nodeById.get(nodeId)
    return node ? [node] : []
  })
}

function resolveLegacyTraceNodeIds(
  nodes: readonly WorkflowNode[],
  run: StudioWorkflowTestRunDto,
): string[] {
  const enteredNodeIds = new Set([
    ...run.nodeRuns.map((nodeRun) => nodeRun.nodeId),
    ...run.nodeStates.map((nodeState) => nodeState.nodeId),
  ])
  const orderedNodeIds: string[] = []
  const addNodeId = (nodeId: string) => {
    if (!orderedNodeIds.includes(nodeId)) orderedNodeIds.push(nodeId)
  }

  if (run.mode === 'FULL') {
    for (const node of nodes) {
      if (node.type === BuiltinNodeType.START && enteredNodeIds.has(node.id)) addNodeId(node.id)
    }
  }
  for (const nodeRun of run.nodeRuns) addNodeId(nodeRun.nodeId)
  for (const nodeState of run.nodeStates) addNodeId(nodeState.nodeId)

  return orderedNodeIds
}

function resolveTraceNodeStatus(
  run: StudioWorkflowTestRunDto,
  nodeId: string,
  nodeRun?: StudioWorkflowNodeRunDto,
) {
  return (
    run.nodeStates.find((nodeState) => nodeState.nodeId === nodeId)?.status ??
    nodeRun?.status ??
    'PENDING'
  )
}

function getTraceNodeInput(
  node: WorkflowNode,
  nodeRun: StudioWorkflowNodeRunDto | undefined,
  run: StudioWorkflowTestRunDto,
) {
  if (node.type === BuiltinNodeType.START) return run.input
  return nodeRun?.input ?? {}
}

function getTraceNodeOutput(
  node: WorkflowNode,
  nodeRun: StudioWorkflowNodeRunDto | undefined,
  run: StudioWorkflowTestRunDto,
) {
  if (node.type === BuiltinNodeType.START) return run.input
  if (node.type === BuiltinNodeType.END) return run.error ? { error: run.error } : run.output
  if (nodeRun?.error) return { error: nodeRun.error }
  return nodeRun?.output ?? {}
}

function getStatusPresentation(status: string) {
  return (
    RUN_STATUS_PRESENTATIONS[status as keyof typeof RUN_STATUS_PRESENTATIONS] ??
    RUN_STATUS_PRESENTATIONS.PENDING
  )
}

export function getWorkflowRunStatusLabel(status: string): string {
  return getStatusPresentation(status).label
}

export function getWorkflowRunTriggerLabel(trigger: string): string {
  switch (trigger) {
    case 'TEST_RUN': {
      return '测试运行'
    }
    case 'MANUAL': {
      return '手动运行'
    }
    case 'API': {
      return 'API 运行'
    }
    case 'SUB_WORKFLOW': {
      return '子工作流'
    }
    default: {
      return trigger
    }
  }
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}

function formatDuration(durationMs?: number) {
  if (durationMs === undefined) return '—'
  if (durationMs < 1000) return `${durationMs} ms`
  return `${(durationMs / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} s`
}

function formatDateTime(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}
