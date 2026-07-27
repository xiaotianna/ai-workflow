import { nodeRegistry, type WorkflowNode } from '@ai-workflow/core'
import {
  NodeConfigFields,
  type NodeConfigFieldErrors,
} from '@ai-workflow/form/components/node-config-fields'
import { NodeHeader } from '@ai-workflow/nodes-ui'
import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import { X } from 'lucide-react'
import { useState } from 'react'

interface WorkflowConfigPanelProps {
  node: WorkflowNode
  defaultLabel?: string
  onApply: (node: WorkflowNode) => void
  onClose: () => void
}

const INLINE_TEXT_INPUT_CLASS_NAME =
  'm-0 h-auto rounded-none border-0 bg-transparent p-0 shadow-none transition-none hover:border-transparent hover:bg-transparent focus-visible:border-transparent focus-visible:bg-transparent dark:bg-transparent dark:hover:bg-transparent dark:focus-visible:bg-transparent'

export const WorkflowConfigPanel = ({
  node,
  defaultLabel,
  onApply,
  onClose,
}: WorkflowConfigPanelProps) => {
  const nodeType = nodeRegistry.get(node.type)
  const resolvedDefaultLabel = defaultLabel ?? nodeType?.definition.label ?? node.type
  const [labelDraft, setLabelDraft] = useState(() => node.label ?? resolvedDefaultLabel)
  const [descriptionDraft, setDescriptionDraft] = useState(
    () => node.description ?? nodeType?.definition.description ?? '',
  )
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

  function handleLabelChange(value: string) {
    setLabelDraft(value)

    if (value.trim()) {
      onApply({
        ...node,
        label: value,
      })
    }
  }

  function handleLabelBlur() {
    const nextLabel = labelDraft.trim()

    if (!nextLabel) {
      const resetLabel =
        resolvedDefaultLabel === nodeType!.definition.label ? undefined : resolvedDefaultLabel

      setLabelDraft(resolvedDefaultLabel)

      if (node.label !== resetLabel) {
        onApply({
          ...node,
          label: resetLabel,
        })
      }
      return
    }

    setLabelDraft(nextLabel)

    if (nextLabel !== (node.label ?? resolvedDefaultLabel)) {
      onApply({
        ...node,
        label: nextLabel,
      })
    }
  }

  function handleDescriptionChange(value: string) {
    setDescriptionDraft(value)
    onApply({
      ...node,
      description: value,
    })
  }

  function handleDescriptionBlur() {
    const nextDescription = descriptionDraft.trim()

    setDescriptionDraft(nextDescription)

    if (nextDescription !== (node.description ?? nodeType!.definition.description ?? '')) {
      onApply({
        ...node,
        description: nextDescription,
      })
    }
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
        label={
          <Input
            value={labelDraft}
            onChange={(event) => handleLabelChange(event.target.value)}
            onBlur={handleLabelBlur}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
            aria-label="节点名称"
            placeholder="添加标题..."
            className={`${INLINE_TEXT_INPUT_CLASS_NAME} text-foreground text-sm leading-5 font-semibold`}
          />
        }
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

      <div className="px-4 py-2">
        <Input
          value={descriptionDraft}
          onChange={(event) => handleDescriptionChange(event.target.value)}
          onBlur={handleDescriptionBlur}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
          aria-label="节点描述"
          placeholder="添加描述..."
          className={`${INLINE_TEXT_INPUT_CLASS_NAME} text-muted-foreground text-xs leading-4 md:text-xs`}
        />
      </div>

      <div className="border-border mt-2 border-b-[0.5px] px-4">
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
