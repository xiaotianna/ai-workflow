import type { StudioWorkflowNodeLastRunDto } from '@/api/studio'
import { CodeEditor } from '@ai-workflow/ui/components/code-editor'
import { Button } from '@ai-workflow/ui/components/button'
import { cn } from '@ai-workflow/ui/lib/utils'
import { Ban, CheckCircle2, CircleX, Clock3, LoaderCircle } from 'lucide-react'

import {
  formatWorkflowRunDateTime,
  formatWorkflowRunDuration,
  getWorkflowRunStatusLabel,
  getWorkflowRunTriggerLabel,
} from './workflow-run-tabs'

interface WorkflowNodeLastRunPanelProps {
  error: boolean
  lastRun?: StudioWorkflowNodeLastRunDto | null
  loading: boolean
  onRetry: () => void
}

const NODE_RUN_STATUS_PRESENTATIONS = {
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

export function WorkflowNodeLastRunPanel({
  error,
  lastRun,
  loading,
  onRetry,
}: WorkflowNodeLastRunPanelProps) {
  if (loading) {
    return (
      <div role="status" className="flex min-h-40 flex-col items-center justify-center text-center">
        <LoaderCircle
          className="text-primary size-5 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
        <p className="text-foreground mt-2 text-[13px] font-medium">正在加载上次运行</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-foreground text-[13px] font-medium">上次运行加载失败</p>
        <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
          重试
        </Button>
      </div>
    )
  }

  if (!lastRun) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center px-4 text-center">
        <p className="text-foreground text-[13px] font-medium">暂无运行记录</p>
        <p className="text-muted-foreground mt-1 text-xs">
          完整运行、单节点运行或子工作流调用后，将在这里显示最近一次结果
        </p>
      </div>
    )
  }

  const presentation = getNodeRunStatusPresentation(lastRun.status)
  const Icon = presentation.icon

  return (
    <div className="space-y-3 px-4 py-3">
      <section
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg border px-3 py-2',
          presentation.surfaceClassName,
        )}
      >
        <div>
          <p className="text-muted-foreground text-[11px] leading-4">状态</p>
          <div
            className={`mt-0.5 flex items-center gap-1.5 text-[13px] leading-4 font-semibold ${presentation.className}`}
          >
            <Icon
              className={`size-3.5 ${lastRun.status === 'RUNNING' ? 'animate-spin motion-reduce:animate-none' : ''}`}
              aria-hidden
            />
            {presentation.label}
          </div>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-[11px] leading-4">运行时间</p>
          <p className="text-foreground mt-0.5 text-[13px] leading-4 font-medium">
            {formatWorkflowRunDuration(lastRun.durationMs)}
          </p>
        </div>
      </section>

      <JsonDataCard title="输入" value={lastRun.input} />
      {lastRun.error ? (
        <JsonDataCard title="错误" value={lastRun.error} />
      ) : (
        <JsonDataCard title="输出" value={lastRun.output} />
      )}

      <section className="px-1 py-1">
        <h3 className="text-muted-foreground text-[13px] leading-5 font-semibold">元数据</h3>
        <dl className="mt-2.5 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-2 text-[13px] leading-5">
          {[
            ['状态', presentation.label],
            ['执行人', lastRun.triggeredBy?.username ?? '—'],
            ['触发方式', getWorkflowRunTriggerLabel(lastRun.runTrigger)],
            ['运行模式', lastRun.runMode === 'FULL' ? '完整工作流' : '单节点'],
            ['工作流状态', getWorkflowRunStatusLabel(lastRun.runStatus)],
            ['开始时间', formatWorkflowRunDateTime(lastRun.startedAt)],
            ['结束时间', formatWorkflowRunDateTime(lastRun.finishedAt)],
            ['运行时间', formatWorkflowRunDuration(lastRun.durationMs)],
            ['运行 ID', lastRun.runId],
          ].map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-foreground min-w-0 [overflow-wrap:anywhere]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}

function JsonDataCard({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="bg-input focus-within:border-input-focus overflow-hidden rounded-lg border border-transparent transition-[border-color]">
      <div className="text-foreground border-border/50 flex h-9 items-center justify-between border-b px-3">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        <span className="text-muted-foreground text-[10px] font-semibold tracking-wide">JSON</span>
      </div>
      <CodeEditor
        aria-label={`${title} JSON`}
        className="h-44 w-full"
        language="json"
        value={JSON.stringify(value ?? {}, null, 2)}
        options={{
          domReadOnly: true,
          readOnly: true,
          renderValidationDecorations: 'off',
        }}
      />
    </section>
  )
}

function getNodeRunStatusPresentation(status: string) {
  return (
    NODE_RUN_STATUS_PRESENTATIONS[status as keyof typeof NODE_RUN_STATUS_PRESENTATIONS] ??
    NODE_RUN_STATUS_PRESENTATIONS.PENDING
  )
}
