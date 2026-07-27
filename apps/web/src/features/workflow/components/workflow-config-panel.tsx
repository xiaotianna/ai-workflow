import { nodeRegistry, type WorkflowNode } from '@ai-workflow/core'
import {
  NodeConfigFields,
  type NodeConfigFieldErrors,
} from '@ai-workflow/form/components/node-config-fields'
import { getNodeThemeColor, NodeIcon } from '@ai-workflow/nodes-ui'
import { Button } from '@ai-workflow/ui/components/button'
import { X } from 'lucide-react'
import { useState } from 'react'

interface WorkflowConfigPanelProps {
  node: WorkflowNode
  onApply: (node: WorkflowNode) => void
  onClose: () => void
}

export const WorkflowConfigPanel = ({ node, onApply, onClose }: WorkflowConfigPanelProps) => {
  const nodeType = nodeRegistry.get(node.type)
  const [draft, setDraft] = useState<Record<string, unknown>>(() => ({ ...node.config }))
  const [errors, setErrors] = useState<NodeConfigFieldErrors>({})

  if (!nodeType) {
    return (
      <aside className="nodrag nowheel bg-background border-border w-96 rounded-2xl border p-5 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <p className="text-destructive text-sm">未知节点类型：{node.type}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="关闭节点配置"
            onClick={onClose}
          >
            <X aria-hidden />
          </Button>
        </div>
      </aside>
    )
  }

  function handleFieldChange(name: string, value: unknown) {
    const nextDraft = {
      ...draft,
      [name]: value,
    }
    const parsedConfig = nodeType!.schema.safeParse(nextDraft)

    setDraft(nextDraft)

    if (!parsedConfig.success) {
      const nextErrors: Record<string, string> = {}

      for (const issue of parsedConfig.error.issues) {
        const fieldName = issue.path[0]
        const errorKey = typeof fieldName === 'string' ? fieldName : '$form'

        nextErrors[errorKey] ??= issue.message
      }

      setErrors(nextErrors)
      return
    }

    setErrors({})
    onApply({
      ...node,
      config: parsedConfig.data as WorkflowNode['config'],
    })
  }

  const formFields = nodeType.form
  const hasFields = formFields && Object.keys(formFields).length > 0

  return (
    <aside className="nodrag nowheel bg-background border-border flex max-h-[calc(100svh-1rem)] w-96 flex-col overflow-hidden rounded-2xl border shadow-lg">
      <header className="flex items-center justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
            style={{ backgroundColor: getNodeThemeColor(node.type) }}
          >
            <NodeIcon icon={nodeType.definition.icon} className="size-5" aria-hidden />
          </span>
          <h2 className="truncate text-base font-semibold">{nodeType.definition.label}</h2>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground shrink-0"
          aria-label="关闭节点配置"
          onClick={onClose}
        >
          <X aria-hidden />
        </Button>
      </header>

      <p className="text-muted-foreground px-5 pt-3 text-sm">
        {nodeType.definition.description ?? '暂无描述'}
      </p>

      <div className="border-border mt-5 border-b px-5">
        <span className="border-primary inline-flex border-b-2 pb-2 text-sm font-medium">设置</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {hasFields ? (
          <NodeConfigFields
            fields={formFields}
            values={draft}
            errors={errors}
            onChange={handleFieldChange}
          />
        ) : (
          <p className="text-muted-foreground text-sm">当前节点暂无可配置项</p>
        )}

        {errors.$form ? (
          <p className="text-destructive mt-3 text-xs leading-4">{errors.$form}</p>
        ) : null}
      </div>
    </aside>
  )
}
