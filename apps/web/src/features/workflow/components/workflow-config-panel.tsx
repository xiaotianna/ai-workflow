import {
  NODE_VARIABLE_SOURCES,
  nodeOutputDefinitionsSchema,
  nodeRegistry,
  resolveNodeVariableForm,
  type NodeVariableSection,
  type WorkflowNode,
} from '@ai-workflow/core'
import { NodeInputFields } from '@ai-workflow/form/components/node-input-fields'
import {
  NodeOutputFields,
  type NodeOutputFieldErrors,
} from '@ai-workflow/form/components/node-output-fields'
import {
  NodeConfigFields,
  type NodeConfigFieldErrors,
} from '@ai-workflow/form/components/node-config-fields'
import { NodeHeader } from '@ai-workflow/nodes-ui'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import { X } from 'lucide-react'

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
  const { form, updateFormField } = useFormData<WorkflowNode>({
    ...node,
    label: node.label ?? resolvedDefaultLabel,
    description: node.description ?? nodeType?.definition.description ?? '',
  })
  const configValidation = nodeType ? validateFormByZod(nodeType.schema, form.config) : undefined
  const configErrors: NodeConfigFieldErrors = configValidation?.errors ?? {}
  const outputValidation = validateFormByZod(nodeOutputDefinitionsSchema, form.outputs)
  const outputErrors: NodeOutputFieldErrors = outputValidation.errors

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
    updateFormField('label', value)

    if (value.trim()) {
      onApply({
        ...node,
        label: value,
      })
    }
  }

  function handleLabelBlur() {
    const nextLabel = form.label?.trim() ?? ''

    if (!nextLabel) {
      const resetLabel =
        resolvedDefaultLabel === nodeType!.definition.label ? undefined : resolvedDefaultLabel

      updateFormField('label', resolvedDefaultLabel)

      if (node.label !== resetLabel) {
        onApply({
          ...node,
          label: resetLabel,
        })
      }
      return
    }

    updateFormField('label', nextLabel)

    if (nextLabel !== (node.label ?? resolvedDefaultLabel)) {
      onApply({
        ...node,
        label: nextLabel,
      })
    }
  }

  function handleDescriptionChange(value: string) {
    updateFormField('description', value)
    onApply({
      ...node,
      description: value,
    })
  }

  function handleDescriptionBlur() {
    const nextDescription = form.description?.trim() ?? ''

    updateFormField('description', nextDescription)

    if (nextDescription !== (node.description ?? nodeType!.definition.description ?? '')) {
      onApply({
        ...node,
        description: nextDescription,
      })
    }
  }

  function handleFieldChange(name: string, value: unknown) {
    const nextConfig = {
      ...form.config,
      [name]: value,
    }
    const parsedConfig = validateFormByZod(nodeType!.schema, nextConfig)

    updateFormField('config', nextConfig)
    if (!parsedConfig.success) {
      return
    }

    onApply({
      ...node,
      config: parsedConfig.data,
    })
  }

  function handleOutputsChange(outputs: WorkflowNode['outputs']) {
    const result = validateFormByZod(nodeOutputDefinitionsSchema, outputs)

    updateFormField('outputs', outputs)
    if (!result.success) return

    onApply({
      ...node,
      outputs: result.data,
    })
  }

  const formFields = nodeType.form
  const hasFields = formFields && Object.keys(formFields).length > 0
  const variableForm = resolveNodeVariableForm(nodeType.variableForm)

  function renderVariableSection(section: NodeVariableSection | false, title: string) {
    if (!section) return null

    if (section.source === NODE_VARIABLE_SOURCES.INPUTS) {
      return (
        <NodeInputFields inputs={form.inputs} title={title} emptyText={`当前节点没有${title}`} />
      )
    }

    return (
      <NodeOutputFields
        outputs={form.outputs}
        errors={outputErrors}
        title={title}
        emptyText={`当前节点没有${title}`}
        onChange={section.editable ? handleOutputsChange : undefined}
      />
    )
  }

  return (
    <aside className="nodrag nowheel bg-background border-border/50 flex h-full w-full flex-col overflow-hidden rounded-2xl border-[0.5px] shadow-lg">
      <NodeHeader
        definition={nodeType.definition}
        className="px-4 pt-4 pb-1"
        label={
          <Input
            value={form.label ?? ''}
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
          value={form.description ?? ''}
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

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-3">
        {hasFields ? (
          <section className="space-y-2">
            <h3 className="text-foreground min-h-8 py-1.5 text-sm font-semibold">节点配置</h3>
            <NodeConfigFields
              fields={formFields}
              values={form.config}
              errors={configErrors}
              onChange={handleFieldChange}
            />
          </section>
        ) : null}

        {renderVariableSection(variableForm.input, '输入字段')}
        {renderVariableSection(variableForm.output, '输出字段')}

        {configErrors.form ? (
          <p className="text-destructive text-xs leading-4">{configErrors.form}</p>
        ) : null}
        {outputErrors.form ? (
          <p className="text-destructive text-xs leading-4">{outputErrors.form}</p>
        ) : null}
      </div>
    </aside>
  )
}
