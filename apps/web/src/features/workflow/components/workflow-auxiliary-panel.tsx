import { Button } from '@ai-workflow/ui/components/button'
import { VariableIcon } from '@ai-workflow/ui/components/variable-icon'
import { X } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { WorkflowVariableItem } from './workflow-variable-item'

export type WorkflowAuxiliaryPanelType =
  | 'run-history'
  | 'check-list'
  | 'environment-variables'
  | 'system-variables'
  | 'version-history'

interface WorkflowAuxiliaryPanelProps {
  type: WorkflowAuxiliaryPanelType
  onClose: () => void
}

interface WorkflowAuxiliaryPanelDefinition {
  title: string
  description: string
  Content: ComponentType
}

interface EmptyPanelContentProps {
  children: ReactNode
}

interface SystemVariableDefinition {
  name: string
  prefix: string
  type: 'String' | 'Number'
  description: string
}

const SYSTEM_VARIABLES: readonly SystemVariableDefinition[] = [
  {
    prefix: 'sys.',
    name: 'user_id',
    type: 'String',
    description: '用户 ID',
  },
  {
    prefix: 'sys.',
    name: 'app_id',
    type: 'String',
    description: '应用 ID',
  },
  {
    prefix: 'sys.',
    name: 'workflow_id',
    type: 'String',
    description: '工作流 ID',
  },
  {
    prefix: 'sys.',
    name: 'workflow_run_id',
    type: 'String',
    description: '工作流运行 ID',
  },
  {
    prefix: 'sys.',
    name: 'timestamp',
    type: 'Number',
    description: '应用开始运行的时间戳',
  },
]

function EmptyPanelContent({ children }: EmptyPanelContentProps) {
  return (
    <div className="flex min-h-52 items-center justify-center px-6 py-10 text-center">
      <p className="text-muted-foreground max-w-64 text-sm leading-6">{children}</p>
    </div>
  )
}

function RunHistoryPanelContent() {
  return <EmptyPanelContent>暂无运行记录</EmptyPanelContent>
}

function CheckListPanelContent() {
  return <EmptyPanelContent>检查结果将在完成工作流校验后显示</EmptyPanelContent>
}

function EnvironmentVariablesPanelContent() {
  return <EmptyPanelContent>当前工作流尚未配置环境变量</EmptyPanelContent>
}

function SystemVariablesPanelContent() {
  return (
    <ul className="space-y-1 px-4 py-4">
      {SYSTEM_VARIABLES.map((variable) => (
        <li key={`${variable.prefix}${variable.name}`}>
          <WorkflowVariableItem
            prefix={variable.prefix}
            name={variable.name}
            dataType={variable.type}
            description={variable.description}
            icon={<VariableIcon className="text-orange-600" />}
          />
        </li>
      ))}
    </ul>
  )
}

function VersionHistoryPanelContent() {
  return <EmptyPanelContent>暂无历史版本</EmptyPanelContent>
}

const WORKFLOW_AUXILIARY_PANEL_DEFINITIONS: Record<
  WorkflowAuxiliaryPanelType,
  WorkflowAuxiliaryPanelDefinition
> = {
  'run-history': {
    title: '运行历史',
    description: '查看当前工作流的测试与正式运行记录。',
    Content: RunHistoryPanelContent,
  },
  'check-list': {
    title: '检查清单',
    description: '在发布前检查节点配置和工作流连线。',
    Content: CheckListPanelContent,
  },
  'environment-variables': {
    title: '环境变量',
    description: '环境变量用于保存工作流中可复用的配置值。',
    Content: EnvironmentVariablesPanelContent,
  },
  'system-variables': {
    title: '系统变量',
    description: '系统变量是全局变量，在类型匹配时无需连线即可被任意节点引用。',
    Content: SystemVariablesPanelContent,
  },
  'version-history': {
    title: '版本历史',
    description: '查看工作流保存和发布形成的历史版本。',
    Content: VersionHistoryPanelContent,
  },
}

export function WorkflowAuxiliaryPanel({ type, onClose }: WorkflowAuxiliaryPanelProps) {
  const definition = WORKFLOW_AUXILIARY_PANEL_DEFINITIONS[type]
  const Content = definition.Content
  const titleId = `workflow-auxiliary-panel-${type}-title`

  return (
    <aside
      id="workflow-auxiliary-panel"
      aria-labelledby={titleId}
      className="nodrag nowheel bg-background border-border/50 flex h-full w-100 flex-col overflow-hidden rounded-2xl border-[0.5px] shadow-lg"
    >
      <header className="bg-background px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-foreground text-base leading-6 font-semibold">
              {definition.title}
            </h2>
            <p className="text-muted-foreground mt-1 text-xs leading-5">{definition.description}</p>
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Content />
      </div>
    </aside>
  )
}
