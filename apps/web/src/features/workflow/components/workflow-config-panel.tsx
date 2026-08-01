import {
  nodeInputBindingsSchema,
  nodeOutputDefinitionsSchema,
  nodeRegistry,
  resolveNodeVariableForm,
  type NodeType,
  type WorkflowNode,
} from '@ai-workflow/core'
import {
  NodeConfigFields,
  type NodeConfigFieldErrors,
} from '@ai-workflow/form/components/node-config-fields'
import {
  NodeConfigSection,
  type NodeConfigRendererMap,
} from '@ai-workflow/form/components/node-config-section'
import {
  NodeVariableSection,
  type AvailableVariableOption,
  type NodeInputBindingsFormValue,
  type NodeVariableFieldErrors,
} from '@ai-workflow/form/components/node-variable-section'
import { NodeHeader } from '@ai-workflow/nodes-ui'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import { Separator } from '@ai-workflow/ui/components/separator'
import { X } from 'lucide-react'
import { z } from 'zod'

import { builtinWorkflowNodeConfigFieldRenderers } from '../node-config-renderers/builtin'
import { WorkflowNextStep } from './workflow-next-step'

interface WorkflowConfigPanelProps {
  node: WorkflowNode
  configRenderers?: NodeConfigRendererMap
  defaultLabel?: string
  availableVariables?: readonly AvailableVariableOption[]
  nextStepDisabled?: boolean
  nextStepOpen?: boolean
  onApply: (node: WorkflowNode) => void
  onClose: () => void
  onDraftValidationIssuesChange: (nodeId: string, messages: readonly string[]) => void
  canChangeNextStepNode: (nodeId: string) => boolean
  canDeleteNextStepNode: (nodeId: string) => boolean
  onChangeNextStepNode: (nodeId: string, anchorPosition?: { x: number; y: number }) => void
  onDeleteNextStepNode: (nodeId: string) => void
  onDisconnectNextStepNode: (nodeId: string) => void
  onNextStepOpenChange: (open: boolean, trigger: HTMLButtonElement) => void
  onNextStepNodeSelect: (nodeId: string) => void
}

const INLINE_TEXT_INPUT_CLASS_NAME =
  'm-0 h-auto rounded-none border-0 bg-transparent p-0 shadow-none transition-none hover:border-transparent hover:bg-transparent focus-visible:border-transparent focus-visible:bg-transparent dark:bg-transparent dark:hover:bg-transparent dark:focus-visible:bg-transparent'

const workflowConfigPanelFormSchema = z.object({
  label: z.string().trim().min(1, '节点名称不能为空'),
  description: z.string().trim(),
  inputs: nodeInputBindingsSchema,
  outputs: nodeOutputDefinitionsSchema,
  config: z.record(z.string(), z.unknown()),
})

type WorkflowConfigPanelFormInput = z.input<typeof workflowConfigPanelFormSchema>

function resolveInitialNodeConfig(
  nodeType: NodeType | undefined,
  config: WorkflowNode['config'],
): Record<string, unknown> {
  if (!nodeType) return { ...config }

  const parsedConfig = nodeType.schema.safeParse(config)
  const normalizedConfig = parsedConfig.success ? parsedConfig.data : undefined

  return normalizedConfig &&
    typeof normalizedConfig === 'object' &&
    !Array.isArray(normalizedConfig)
    ? { ...normalizedConfig }
    : { ...config }
}

export const WorkflowConfigPanel = ({
  node,
  configRenderers,
  defaultLabel,
  availableVariables = [],
  nextStepDisabled = false,
  nextStepOpen = false,
  onApply,
  onClose,
  onDraftValidationIssuesChange,
  canChangeNextStepNode,
  canDeleteNextStepNode,
  onChangeNextStepNode,
  onDeleteNextStepNode,
  onDisconnectNextStepNode,
  onNextStepOpenChange,
  onNextStepNodeSelect,
}: WorkflowConfigPanelProps) => {
  const nodeType = nodeRegistry.get(node.type)
  const resolvedDefaultLabel = defaultLabel ?? nodeType?.definition.label ?? node.type
  const { form, updateFormField } = useFormData<WorkflowConfigPanelFormInput>({
    label: node.label ?? resolvedDefaultLabel,
    description: node.description ?? nodeType?.definition.description ?? '',
    inputs: { ...node.inputs },
    outputs: [...node.outputs],
    config: resolveInitialNodeConfig(nodeType, node.config),
  })

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

  const configValidation = validateFormByZod(nodeType.schema, form.config)
  const errors: NodeConfigFieldErrors = configValidation.success ? {} : configValidation.errors
  const inputs = form.inputs ?? {}
  const outputs = form.outputs ?? []
  const inputValidation = validateFormByZod(nodeInputBindingsSchema, inputs)
  const outputValidation = validateFormByZod(nodeOutputDefinitionsSchema, outputs)
  const inputErrors: NodeVariableFieldErrors = inputValidation.success ? {} : inputValidation.errors
  const outputErrors: NodeVariableFieldErrors = outputValidation.success
    ? {}
    : outputValidation.errors

  function reportDraftValidationIssues(changes: Partial<WorkflowConfigPanelFormInput>) {
    const draftForm = {
      ...form,
      inputs,
      outputs,
      ...changes,
    }
    const draftFormValidation = validateFormByZod(workflowConfigPanelFormSchema, draftForm)
    const draftConfigValidation = validateFormByZod(nodeType!.schema, draftForm.config)
    const messages = [
      ...(draftFormValidation.success ? [] : Object.values(draftFormValidation.errors)),
      ...(draftConfigValidation.success ? [] : Object.values(draftConfigValidation.errors)),
    ].filter((message): message is string => typeof message === 'string' && message.length > 0)

    onDraftValidationIssuesChange(node.id, [...new Set(messages)])
  }

  function handleLabelChange(value: string) {
    updateFormField('label', value)
    reportDraftValidationIssues({ label: value })
    const parsedLabel = validateFormByZod(workflowConfigPanelFormSchema.shape.label, value)

    if (parsedLabel.success) {
      onApply({
        ...node,
        label: parsedLabel.data,
      })
    }
  }

  function handleLabelBlur() {
    const parsedLabel = validateFormByZod(workflowConfigPanelFormSchema.shape.label, form.label)

    if (!parsedLabel.success) {
      const resetLabel =
        resolvedDefaultLabel === nodeType!.definition.label ? undefined : resolvedDefaultLabel

      updateFormField('label', resolvedDefaultLabel)
      reportDraftValidationIssues({ label: resolvedDefaultLabel })

      if (node.label !== resetLabel) {
        onApply({
          ...node,
          label: resetLabel,
        })
      }
      return
    }

    const nextLabel = parsedLabel.data
    updateFormField('label', nextLabel)
    reportDraftValidationIssues({ label: nextLabel })

    if (nextLabel !== (node.label ?? resolvedDefaultLabel)) {
      onApply({
        ...node,
        label: nextLabel,
      })
    }
  }

  function handleDescriptionChange(value: string) {
    updateFormField('description', value)
    reportDraftValidationIssues({ description: value })
    const parsedDescription = validateFormByZod(
      workflowConfigPanelFormSchema.shape.description,
      value,
    )

    if (!parsedDescription.success) return

    onApply({
      ...node,
      description: parsedDescription.data,
    })
  }

  function handleDescriptionBlur() {
    const parsedDescription = validateFormByZod(
      workflowConfigPanelFormSchema.shape.description,
      form.description,
    )

    if (!parsedDescription.success) return

    const nextDescription = parsedDescription.data
    updateFormField('description', nextDescription)
    reportDraftValidationIssues({ description: nextDescription })

    if (nextDescription !== (node.description ?? nodeType!.definition.description ?? '')) {
      onApply({
        ...node,
        description: nextDescription,
      })
    }
  }

  function handleConfigChange(nextConfig: Record<string, unknown>) {
    const parsedConfig = validateFormByZod(nodeType!.schema, nextConfig)

    updateFormField('config', nextConfig)
    reportDraftValidationIssues({ config: nextConfig })

    if (!parsedConfig.success) return

    onApply({
      ...node,
      config: parsedConfig.data,
    })
  }

  function handleFieldChange(name: string, value: unknown) {
    handleConfigChange({
      ...form.config,
      [name]: value,
    })
  }

  function handleInputsChange(nextInputs: NodeInputBindingsFormValue) {
    updateFormField('inputs', nextInputs)
    reportDraftValidationIssues({ inputs: nextInputs })
    const parsedInputs = validateFormByZod(nodeInputBindingsSchema, nextInputs)

    if (!parsedInputs.success) return

    onApply({
      ...node,
      inputs: parsedInputs.data,
    })
  }

  function handleOutputsChange(nextOutputs: WorkflowNode['outputs']) {
    updateFormField('outputs', nextOutputs)
    reportDraftValidationIssues({ outputs: nextOutputs })
    const parsedOutputs = validateFormByZod(nodeOutputDefinitionsSchema, nextOutputs)

    if (!parsedOutputs.success) return

    onApply({
      ...node,
      outputs: parsedOutputs.data,
    })
  }

  const formFields = nodeType.form
  const hasFields = formFields && Object.keys(formFields).length > 0
  const configRenderer = nodeType.configRenderer
  const hasConfigSection = Boolean(configRenderer || hasFields)
  const variableForm = resolveNodeVariableForm(nodeType.variableForm)
  const inputVariableSection = variableForm.input
  const outputVariableSection = variableForm.output
  const hasPanelContent = Boolean(
    inputVariableSection || configRenderer || hasFields || outputVariableSection,
  )

  return (
    <aside className="nodrag nowheel bg-background border-border/50 flex h-full w-full flex-col overflow-hidden rounded-2xl border-[0.5px] shadow-lg">
      <NodeHeader
        definition={nodeType.definition}
        className="px-4 pt-4 pb-1"
        label={
          <Input
            value={form.label}
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
          value={form.description}
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        {hasPanelContent ? (
          <div className="py-3">
            {/* 输入变量配置（可以通过插件注册自定义配置表单，在packages/form子包中） */}
            {inputVariableSection ? (
              <div className="px-5">
                <NodeVariableSection
                  section={inputVariableSection}
                  inputs={inputs}
                  outputs={outputs}
                  availableVariables={availableVariables}
                  inputErrors={inputErrors}
                  outputErrors={outputErrors}
                  onInputsChange={handleInputsChange}
                  onOutputsChange={handleOutputsChange}
                />
              </div>
            ) : null}

            {inputVariableSection && hasConfigSection ? (
              <Separator className="bg-border/50 mt-5 mb-3" />
            ) : null}

            {/* 完整配置使用专属 renderer；字段配置统一按 field.ui 分发。 */}
            {configRenderer ? (
              <div className="px-5">
                <NodeConfigSection
                  renderer={configRenderer}
                  renderers={configRenderers}
                  config={form.config}
                  availableVariables={availableVariables}
                  errors={errors}
                  onConfigChange={handleConfigChange}
                />
              </div>
            ) : hasFields ? (
              <div className="px-5">
                <NodeConfigFields
                  fields={formFields}
                  renderers={builtinWorkflowNodeConfigFieldRenderers}
                  values={form.config}
                  errors={errors}
                  availableVariables={availableVariables}
                  onChange={handleFieldChange}
                />
              </div>
            ) : null}

            {outputVariableSection && (inputVariableSection || hasConfigSection) ? (
              <Separator className="bg-border/50 mt-5 mb-3" />
            ) : null}

            {/* 输出变量配置 */}
            {outputVariableSection ? (
              <div className="px-5">
                <NodeVariableSection
                  section={outputVariableSection}
                  inputs={inputs}
                  outputs={outputs}
                  availableVariables={availableVariables}
                  inputErrors={inputErrors}
                  outputErrors={outputErrors}
                  onInputsChange={handleInputsChange}
                  onOutputsChange={handleOutputsChange}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground px-5 py-3 text-sm">当前节点暂无可配置项</p>
        )}

        {errors.form ? (
          <p className="text-destructive mt-3 px-5 py-3 text-xs leading-4">{errors.form}</p>
        ) : null}

        <Separator className="bg-border/50 mt-3" />

        {/* 下一个节点连接器渲染 */}
        <WorkflowNextStep
          nodeId={node.id}
          nodeType={nodeType}
          disabled={nextStepDisabled}
          open={nextStepOpen}
          className="px-5 pt-3 pb-5"
          canChangeNode={canChangeNextStepNode}
          canDeleteNode={canDeleteNextStepNode}
          onChangeNode={onChangeNextStepNode}
          onDeleteNode={onDeleteNextStepNode}
          onDisconnectNode={onDisconnectNextStepNode}
          onOpenChange={onNextStepOpenChange}
          onSelectNode={onNextStepNodeSelect}
        />
      </div>
    </aside>
  )
}
