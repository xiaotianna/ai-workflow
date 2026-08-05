import {
  BuiltinNodeType,
  createSubWorkflowNodeVariables,
  deriveCodeNodeOutputs,
  nodeInputBindingsSchema,
  nodeOutputDefinitionsSchema,
  nodeRegistry,
  normalizeNodeOutputs,
  resolveNodeVariableForm,
  synchronizeCodeNodeOutputs,
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
import { Tabs, TabsContent } from '@ai-workflow/ui/components/tabs'
import { LoaderCircle, Pause, Play, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'

import { useWorkflowNodeLastRun } from '../hooks/use-workflow-node-last-run'
import { builtinWorkflowNodeConfigFieldRenderers } from '../node-config-renderers/builtin'
import {
  WorkflowNodeConfigActionsProvider,
  type SubWorkflowSelectionPayload,
} from './workflow-node-config-actions-context'
import { WorkflowNextStep } from './workflow-next-step'
import { WorkflowNodeLastRunPanel } from './workflow-node-last-run-panel'
import { WorkflowPanelTabsList, WorkflowPanelTabsTrigger } from './workflow-panel-tabs'
import { WorkflowSingleNodeTestRunOverlay } from './workflow-single-node-test-run-overlay'

type WorkflowConfigPanelTab = 'settings' | 'last-run'

interface WorkflowConfigPanelProps {
  appId?: string
  node: WorkflowNode
  configRenderers?: NodeConfigRendererMap
  defaultLabel?: string
  availableVariables?: readonly AvailableVariableOption[]
  nextStepDisabled?: boolean
  errorBranchNextStepDisabled?: boolean
  errorBranchNextStepOpen?: boolean
  nextStepOpen?: boolean
  canRunNode?: boolean
  focusLastRunTabKey?: number
  lastRunRefreshKey?: number
  singleNodeTestRunOpen?: boolean
  testRunCanPause?: boolean
  testRunPausing?: boolean
  testRunPending?: boolean
  onApply: (node: WorkflowNode) => void
  onClose: () => void
  onCloseSingleNodeTestRun?: () => void
  onDraftValidationIssuesChange: (nodeId: string, messages: readonly string[]) => void
  canChangeNextStepNode: (nodeId: string, sourceHandle?: string) => boolean
  canDeleteNextStepNode: (nodeId: string) => boolean
  onChangeNextStepNode: (
    nodeId: string,
    anchorPosition?: { x: number; y: number },
    sourceHandle?: string,
  ) => void
  onDeleteNextStepNode: (nodeId: string) => void
  onDisconnectNextStepNode: (nodeId: string, sourceHandle?: string) => void
  onNextStepOpenChange: (open: boolean, trigger: HTMLButtonElement, sourceHandle?: string) => void
  onNextStepNodeSelect: (nodeId: string) => void
  onOpenSingleNodeTestRun?: () => void
  onPauseTestRun?: () => void
  onSubmitSingleNodeTestRun?: (input: Record<string, unknown>) => void | Promise<void>
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
type NodeOutputDefinitionsFormValue = NonNullable<WorkflowConfigPanelFormInput['outputs']>

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

function normalizeConfigPanelOutputs(
  node: WorkflowNode,
  nodeType: NodeType | undefined,
  config: Readonly<Record<string, unknown>>,
  outputs: NodeOutputDefinitionsFormValue,
): NodeOutputDefinitionsFormValue {
  const parsedOutputs = validateFormByZod(nodeOutputDefinitionsSchema, outputs)
  if (!parsedOutputs.success) return [...outputs]

  const normalizedOutputs = normalizeNodeOutputs(parsedOutputs.data, nodeType?.fixedOutputs)

  return node.type === BuiltinNodeType.CODE && typeof config.code === 'string'
    ? synchronizeCodeNodeOutputs(config.code, normalizedOutputs)
    : normalizedOutputs
}

export const WorkflowConfigPanel = ({
  appId,
  node,
  configRenderers,
  defaultLabel,
  availableVariables = [],
  nextStepDisabled = false,
  errorBranchNextStepDisabled = false,
  errorBranchNextStepOpen = false,
  nextStepOpen = false,
  canRunNode = false,
  focusLastRunTabKey = 0,
  lastRunRefreshKey = 0,
  singleNodeTestRunOpen = false,
  testRunCanPause = false,
  testRunPausing = false,
  testRunPending = false,
  onApply,
  onClose,
  onCloseSingleNodeTestRun,
  onDraftValidationIssuesChange,
  canChangeNextStepNode,
  canDeleteNextStepNode,
  onChangeNextStepNode,
  onDeleteNextStepNode,
  onDisconnectNextStepNode,
  onNextStepOpenChange,
  onNextStepNodeSelect,
  onOpenSingleNodeTestRun,
  onPauseTestRun,
  onSubmitSingleNodeTestRun,
}: WorkflowConfigPanelProps) => {
  const nodeType = nodeRegistry.get(node.type)
  const resolvedDefaultLabel = defaultLabel ?? nodeType?.definition.label ?? node.type
  const initialConfig = resolveInitialNodeConfig(nodeType, node.config)
  const [activeTab, setActiveTab] = useState<WorkflowConfigPanelTab>('settings')
  const lastRunQuery = useWorkflowNodeLastRun(
    appId,
    node.id,
    activeTab === 'last-run',
    lastRunRefreshKey,
  )
  const { form, updateFormField } = useFormData<WorkflowConfigPanelFormInput>({
    label: node.label ?? resolvedDefaultLabel,
    description: node.description ?? nodeType?.definition.description ?? '',
    inputs: { ...node.inputs },
    outputs: normalizeConfigPanelOutputs(node, nodeType, initialConfig, node.outputs),
    config: initialConfig,
  })

  useEffect(() => {
    setActiveTab('settings')
  }, [node.id])

  useEffect(() => {
    if (focusLastRunTabKey > 0) setActiveTab('last-run')
  }, [focusLastRunTabKey])

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
  const outputValidation = validateFormByZod(nodeOutputDefinitionsSchema, outputs)
  const derivedCodeOutputs =
    node.type === BuiltinNodeType.CODE && typeof form.config.code === 'string'
      ? deriveCodeNodeOutputs(form.config.code)
      : undefined
  const lastValidCodeOutputs = outputValidation.success
    ? outputValidation.data.filter((output) => output.value === undefined)
    : []
  const fixedOutputs =
    node.type === BuiltinNodeType.CODE
      ? (derivedCodeOutputs ?? lastValidCodeOutputs)
      : nodeType.fixedOutputs
  const inputValidation = validateFormByZod(nodeInputBindingsSchema, inputs)
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
    const nextOutputs = normalizeConfigPanelOutputs(node, nodeType, nextConfig, outputs)
    const parsedOutputs = validateFormByZod(nodeOutputDefinitionsSchema, nextOutputs)

    updateFormField('config', nextConfig)
    updateFormField('outputs', nextOutputs)
    reportDraftValidationIssues({ config: nextConfig, outputs: nextOutputs })

    if (!parsedConfig.success || !parsedOutputs.success) return

    onApply({
      ...node,
      config: parsedConfig.data,
      outputs: parsedOutputs.data,
    })
  }

  function handleFieldChange(name: string, value: unknown) {
    handleConfigChange({
      ...form.config,
      [name]: value,
    })
  }

  function handleSubWorkflowSelection(payload: SubWorkflowSelectionPayload) {
    const { inputs: nextInputs, outputs: nextOutputs } = createSubWorkflowNodeVariables(
      payload.target,
      inputs,
    )
    const nextConfig = {
      ...form.config,
      workflow: payload.workflow,
    }
    const parsedConfig = validateFormByZod(nodeType!.schema, nextConfig)
    const parsedInputs = validateFormByZod(nodeInputBindingsSchema, nextInputs)
    const parsedOutputs = validateFormByZod(nodeOutputDefinitionsSchema, nextOutputs)

    updateFormField('config', nextConfig)
    updateFormField('inputs', nextInputs)
    updateFormField('outputs', nextOutputs)
    reportDraftValidationIssues({
      config: nextConfig,
      inputs: nextInputs,
      outputs: nextOutputs,
    })

    if (!parsedConfig.success || !parsedInputs.success || !parsedOutputs.success) return

    onApply({
      ...node,
      config: parsedConfig.data,
      inputs: parsedInputs.data,
      outputs: parsedOutputs.data,
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
    const normalizedOutputs = normalizeNodeOutputs(nextOutputs, fixedOutputs)

    updateFormField('outputs', normalizedOutputs)
    reportDraftValidationIssues({ outputs: normalizedOutputs })
    const parsedOutputs = validateFormByZod(nodeOutputDefinitionsSchema, normalizedOutputs)

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
  // 子工作流需先选择目标再同步输入键，配置区放在输入变量之前
  const configBeforeInputs = node.type === BuiltinNodeType.SUB_WORKFLOW
  const hasPanelContent = Boolean(
    inputVariableSection || configRenderer || hasFields || outputVariableSection,
  )

  const configSection = configRenderer ? (
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
  ) : null

  const inputSection = inputVariableSection ? (
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
  ) : null

  const outputSection = outputVariableSection ? (
    <div className="px-5">
      <NodeVariableSection
        section={outputVariableSection}
        inputs={inputs}
        outputs={outputs}
        fixedOutputs={fixedOutputs}
        availableVariables={availableVariables}
        inputErrors={inputErrors}
        outputErrors={outputErrors}
        onInputsChange={handleInputsChange}
        onOutputsChange={handleOutputsChange}
      />
    </div>
  ) : null

  const nodeLabel = form.label || resolvedDefaultLabel

  return (
    <aside className="nodrag nowheel nokey bg-background border-border/50 relative flex h-full w-full flex-col overflow-hidden rounded-2xl border-[0.5px] shadow-lg">
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
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              aria-busy={testRunPausing}
              aria-label={testRunPending ? '暂停当前运行' : '运行该节点'}
              disabled={
                testRunPending
                  ? !testRunCanPause || testRunPausing || !onPauseTestRun
                  : !canRunNode || !onOpenSingleNodeTestRun
              }
              onClick={() => {
                if (testRunPending) {
                  onPauseTestRun?.()
                  return
                }
                onOpenSingleNodeTestRun?.()
              }}
            >
              {testRunPausing ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : testRunPending ? (
                <Pause className="size-4" aria-hidden />
              ) : (
                <Play className="size-4" aria-hidden />
              )}
            </Button>
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

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as WorkflowConfigPanelTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <WorkflowPanelTabsList aria-label="节点配置内容" className="shrink-0">
          <WorkflowPanelTabsTrigger value="settings">设置</WorkflowPanelTabsTrigger>
          <WorkflowPanelTabsTrigger value="last-run">上次运行</WorkflowPanelTabsTrigger>
        </WorkflowPanelTabsList>

        <TabsContent value="settings" className="min-h-0 flex-1 overflow-y-auto">
          <WorkflowNodeConfigActionsProvider applySubWorkflowSelection={handleSubWorkflowSelection}>
            {hasPanelContent ? (
              <div className="py-3">
                {configBeforeInputs ? (
                  <>
                    {configSection}
                    {hasConfigSection && inputVariableSection ? (
                      <Separator className="bg-border/50 mt-5 mb-3" />
                    ) : null}
                    {inputSection}
                  </>
                ) : (
                  <>
                    {inputSection}
                    {inputVariableSection && hasConfigSection ? (
                      <Separator className="bg-border/50 mt-5 mb-3" />
                    ) : null}
                    {configSection}
                  </>
                )}

                {outputVariableSection && (inputVariableSection || hasConfigSection) ? (
                  <Separator className="bg-border/50 mt-5 mb-3" />
                ) : null}

                {outputSection}
              </div>
            ) : (
              <p className="text-muted-foreground px-5 py-3 text-sm">当前节点暂无可配置项</p>
            )}
          </WorkflowNodeConfigActionsProvider>

          {errors.form ? (
            <p className="text-destructive mt-3 px-5 py-3 text-xs leading-4">{errors.form}</p>
          ) : null}

          <Separator className="bg-border/50 mt-3" />

          {/* 下一个节点连接器渲染 */}
          <WorkflowNextStep
            nodeId={node.id}
            nodeType={nodeType}
            disabled={nextStepDisabled}
            errorBranchDisabled={errorBranchNextStepDisabled}
            errorBranchOpen={errorBranchNextStepOpen}
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
        </TabsContent>

        <TabsContent value="last-run" className="min-h-0 flex-1 overflow-y-auto">
          <WorkflowNodeLastRunPanel
            error={lastRunQuery.error}
            lastRun={lastRunQuery.lastRun}
            loading={lastRunQuery.loading}
            onRetry={lastRunQuery.reload}
          />
        </TabsContent>
      </Tabs>

      {singleNodeTestRunOpen ? (
        <WorkflowSingleNodeTestRunOverlay
          node={node}
          nodeLabel={nodeLabel}
          pausing={testRunPausing}
          pending={testRunPending}
          onClose={() => onCloseSingleNodeTestRun?.()}
          onPause={() => onPauseTestRun?.()}
          onRun={(input) => void onSubmitSingleNodeTestRun?.(input)}
        />
      ) : null}
    </aside>
  )
}
