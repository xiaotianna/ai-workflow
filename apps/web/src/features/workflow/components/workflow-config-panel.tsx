import { nodeRegistry, type WorkflowNode } from '@ai-workflow/core'
import {
  NodeConfigFields,
  type NodeConfigFieldErrors,
} from '@ai-workflow/form/components/node-config-fields'
import { NodeHeader } from '@ai-workflow/nodes-ui'
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
      <aside className="nodrag nowheel bg-background border-border/50 h-full w-full rounded-2xl border-[0.5px] p-5 shadow-lg">
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
    <aside className="nodrag nowheel bg-background border-border/50 flex h-full w-full flex-col overflow-hidden rounded-2xl border-[0.5px] shadow-lg">
      <NodeHeader
        definition={nodeType.definition}
        className="px-4 pt-4 pb-1"
        actions={
          <>
            <div className="bg-border/50 h-3.5 w-px" aria-hidden />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              aria-label="关闭节点配置"
              onClick={onClose}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </>
        }
      />

      <p className="text-muted-foreground px-4 pt-1 text-xs leading-4">
        {nodeType.definition.description ?? '暂无描述'}
      </p>

      <div className="border-border/50 mt-2 border-b-[0.5px] px-4">
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
