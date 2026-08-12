import {
  SYSTEM_VARIABLE_DEFINITIONS,
  SYSTEM_VARIABLE_NAMESPACE,
  type WorkflowEnvironmentVariable,
  type WorkflowNode,
} from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import { VariableIcon } from '@ai-workflow/ui/components/variable-icon'
import { NodeIconBadge } from '@ai-workflow/nodes-ui'
import { ArrowRight, CircleCheck, X } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { getWorkflowVariableDataTypeLabel } from '../utils/workflow-variable-presentation'
import type { WorkflowCheckListIssue } from '../utils/workflow-check-list'
import type { WorkflowTestRunResult } from '../hooks/use-workflow-test-run'
import { WorkflowEnvironmentVariablesPanel } from './workflow-environment-variables-panel'
import { WorkflowRunHistoryPanel } from './workflow-run-history-panel'
import { WorkflowTestRunPanelContent } from './workflow-test-run-panel'
import { WorkflowVariableItem } from './workflow-variable-item'
import type { WorkflowVersionHistoryPublishSync } from '../hooks/use-workflow-version-history'
import { WorkflowVersionHistoryPanel } from './workflow-version-history-panel'
import { useWorkflowCatalog } from '../catalog/workflow-web-catalog'

export type WorkflowAuxiliaryPanelType =
  | 'test-run'
  | 'run-history'
  | 'check-list'
  | 'environment-variables'
  | 'system-variables'
  | 'version-history'

interface WorkflowAuxiliaryPanelProps {
  appId?: string
  type: WorkflowAuxiliaryPanelType
  checkListIssues: readonly WorkflowCheckListIssue[]
  environmentVariables: readonly WorkflowEnvironmentVariable[]
  nodes: readonly WorkflowNode[]
  testRunPausing: boolean
  testRunPending: boolean
  testRunResult?: WorkflowTestRunResult
  publishSync?: WorkflowVersionHistoryPublishSync
  selectedVersionId?: string
  onClose: () => void
  onCheckListIssueSelect: (nodeId: string) => void
  onAddEnvironmentVariable: (variable: WorkflowEnvironmentVariable) => void
  onDeleteEnvironmentVariable: (variableId: string) => boolean
  onPauseTestRun: () => void
  onStartTestRun: (input: Record<string, unknown>) => void
  onRestoreVersion?: (versionId: string) => Promise<void>
  onSelectCurrentDraft?: () => void
  onUpdateEnvironmentVariable: (variable: WorkflowEnvironmentVariable) => void
}

interface WorkflowAuxiliaryPanelDefinition {
  title: string
  description: string
  Content?: ComponentType
}

interface EmptyPanelContentProps {
  children: ReactNode
}

function EmptyPanelContent({ children }: EmptyPanelContentProps) {
  return (
    <div className="flex min-h-52 items-center justify-center px-6 py-10 text-center">
      <p className="text-muted-foreground max-w-64 text-sm leading-6">{children}</p>
    </div>
  )
}

interface CheckListPanelContentProps {
  issues: readonly WorkflowCheckListIssue[]
  onIssueSelect: (nodeId: string) => void
}

function CheckListPanelContent({ issues, onIssueSelect }: CheckListPanelContentProps) {
  const { nodeRegistry } = useWorkflowCatalog()
  if (issues.length === 0) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center">
        <CircleCheck className="text-success size-8" aria-hidden />
        <p className="text-foreground mt-3 text-sm font-medium">当前工作流已通过检查</p>
        <p className="text-muted-foreground mt-1 text-xs">暂无需要处理的节点问题</p>
      </div>
    )
  }

  const issuesByNode = new Map<string, WorkflowCheckListIssue[]>()
  for (const issue of issues) {
    const nodeIssues = issuesByNode.get(issue.nodeId) ?? []
    nodeIssues.push(issue)
    issuesByNode.set(issue.nodeId, nodeIssues)
  }

  return (
    <ul className="space-y-2 px-4 py-4">
      {[...issuesByNode.values()].map((nodeIssues) => {
        const node = nodeIssues[0]!,
          definition = nodeRegistry.get(node.nodeType)?.definition

        return (
          <li
            key={node.nodeId}
            className="border-border/60 bg-background rounded-xl border-[0.5px] px-2 py-2 shadow-xs transition-shadow duration-200 ease-out focus-within:shadow-md hover:shadow-md motion-reduce:transition-none"
          >
            <div className="flex min-w-0 items-center px-1">
              <NodeIconBadge
                type={node.nodeType}
                icon={definition?.icon}
                className="rounded-lg shadow-sm"
              />
              <span className="text-foreground ml-2 truncate text-sm font-semibold">
                {node.nodeLabel}
              </span>
            </div>

            <ul className="border-border/70 relative mt-1 ml-4 border-l">
              {nodeIssues.map((issue) => (
                <li key={issue.id} className="relative pl-3">
                  <span
                    className="absolute top-1/2 -left-0.75 size-1.5 -translate-y-1/2 rounded-full bg-[#f79009]"
                    aria-hidden
                  />
                  <button
                    type="button"
                    className="group/check-item hover:bg-muted/70 focus-visible:bg-muted/70 flex min-h-8 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-left transition-colors outline-none"
                    aria-label={`${issue.message}，前往修改${node.nodeLabel}`}
                    onClick={() => onIssueSelect(issue.nodeId)}
                  >
                    <span className="min-w-0 flex-1 truncate text-xs leading-5 text-[#dc6803]">
                      {issue.message}
                    </span>
                    <span className="text-primary flex shrink-0 translate-x-1 items-center gap-1 text-xs font-medium opacity-0 transition-[opacity,transform] group-hover/check-item:translate-x-0 group-hover/check-item:opacity-100 group-focus-visible/check-item:translate-x-0 group-focus-visible/check-item:opacity-100">
                      前往修改
                      <ArrowRight className="size-4" aria-hidden />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}

function SystemVariablesPanelContent() {
  return (
    <ul className="space-y-1 px-4 py-4">
      {SYSTEM_VARIABLE_DEFINITIONS.map((variable) => (
        <li key={variable.key}>
          <WorkflowVariableItem
            prefix={`${SYSTEM_VARIABLE_NAMESPACE}.`}
            name={variable.key}
            dataType={getWorkflowVariableDataTypeLabel(variable.dataType)}
            description={variable.description}
            icon={<VariableIcon className="text-orange-600" />}
          />
        </li>
      ))}
    </ul>
  )
}

const WORKFLOW_AUXILIARY_PANEL_DEFINITIONS: Record<
  WorkflowAuxiliaryPanelType,
  WorkflowAuxiliaryPanelDefinition
> = {
  'test-run': {
    title: '测试运行',
    description: '配置输入并查看本次运行的结果与节点追踪。',
  },
  'run-history': {
    title: '运行历史',
    description: '查看当前工作流的测试与正式运行记录。',
  },
  'check-list': {
    title: '检查清单',
    description: '发布前请解决以下问题',
  },
  'environment-variables': {
    title: '环境变量',
    description:
      '环境变量是一种存储敏感信息的方法，如 API 密钥、数据库密码等。它们被存储在工作流中，而不是代码中，以便在不同环境中共享。',
  },
  'system-variables': {
    title: '系统变量',
    description: '系统变量是全局变量，在类型匹配时无需连线即可被任意节点引用。',
    Content: SystemVariablesPanelContent,
  },
  'version-history': {
    title: '版本历史',
    description:
      '查看、命名和恢复工作流的发布版本。历史版本不可回退，外部 API 始终接入当前最新发布版本。',
  },
}

export function WorkflowAuxiliaryPanel({
  appId,
  type,
  checkListIssues,
  environmentVariables,
  nodes,
  testRunPausing,
  testRunPending,
  testRunResult,
  publishSync,
  selectedVersionId,
  onClose,
  onCheckListIssueSelect,
  onAddEnvironmentVariable,
  onDeleteEnvironmentVariable,
  onPauseTestRun,
  onRestoreVersion,
  onSelectCurrentDraft,
  onStartTestRun,
  onUpdateEnvironmentVariable,
}: WorkflowAuxiliaryPanelProps) {
  const definition = WORKFLOW_AUXILIARY_PANEL_DEFINITIONS[type],
    Content = definition.Content,
    title =
      type === 'check-list' ? `${definition.title}(${checkListIssues.length})` : definition.title,
    titleId = `workflow-auxiliary-panel-${type}-title`

  return (
    <aside
      id="workflow-auxiliary-panel"
      aria-labelledby={titleId}
      className="nodrag nowheel nokey border-border/50 bg-background flex h-full w-100 flex-col overflow-hidden rounded-2xl border-[0.5px] shadow-lg"
    >
      <header className="bg-background px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="mb-2 min-w-0">
            <h2 id={titleId} className="text-foreground text-[15px] leading-6 font-semibold">
              {title}
            </h2>
            <p className="text-muted-foreground mt-1 text-[13px] leading-5">
              {definition.description}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            aria-label={`关闭${definition.title}`}
            onClick={onClose}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      </header>

      <div
        className={
          type === 'test-run' || type === 'run-history'
            ? 'min-h-0 flex-1 overflow-hidden'
            : 'min-h-0 flex-1 overflow-y-auto'
        }
      >
        {type === 'test-run' ? (
          <WorkflowTestRunPanelContent
            nodes={nodes}
            pausing={testRunPausing}
            pending={testRunPending}
            result={testRunResult}
            onPause={onPauseTestRun}
            onRun={onStartTestRun}
          />
        ) : type === 'run-history' ? (
          appId ? (
            <WorkflowRunHistoryPanel
              appId={appId}
              refreshKey={testRunPending ? 'pending' : testRunResult?.id}
            />
          ) : (
            <EmptyPanelContent>当前应用暂时无法读取运行记录</EmptyPanelContent>
          )
        ) : type === 'version-history' ? (
          appId && onRestoreVersion && onSelectCurrentDraft ? (
            <WorkflowVersionHistoryPanel
              appId={appId}
              publishSync={publishSync}
              selectedVersionId={selectedVersionId}
              onRestore={onRestoreVersion}
              onSelectCurrentDraft={onSelectCurrentDraft}
            />
          ) : (
            <EmptyPanelContent>当前应用暂时无法读取历史版本</EmptyPanelContent>
          )
        ) : type === 'check-list' ? (
          <CheckListPanelContent issues={checkListIssues} onIssueSelect={onCheckListIssueSelect} />
        ) : type === 'environment-variables' ? (
          <WorkflowEnvironmentVariablesPanel
            variables={environmentVariables}
            onAdd={onAddEnvironmentVariable}
            onDelete={onDeleteEnvironmentVariable}
            onUpdate={onUpdateEnvironmentVariable}
          />
        ) : Content ? (
          <Content />
        ) : null}
      </div>
    </aside>
  )
}
