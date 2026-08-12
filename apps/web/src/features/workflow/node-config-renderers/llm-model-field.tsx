import {
  llmModelSchema,
  type LlmModelConfig,
  type LlmModelFieldSchema,
  type LlmModelParametersInput,
} from '@ai-workflow/core'
import type { FieldRendererProps } from '@ai-workflow/form'
import { Badge } from '@ai-workflow/ui/components/badge'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { RefreshCw, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'

import { type ModelGroupDto, type ModelProviderType } from '@/api/models'
import { useWorkflowModelCatalog } from '@/components/workflow/workflow-model-catalog-context'
import { getModelProviderStrategy } from '@/features/models'

import { LlmModelParametersDialog } from './llm-model-parameters-dialog'

interface AvailableModelOption {
  configuredModelId: string
  displayName: string
  groupId: string
  groupName: string
  modelId: string
  providerType: ModelProviderType
}

interface AvailableModelGroup {
  groupId: string
  groupName: string
  models: AvailableModelOption[]
  providerType: ModelProviderType
}

type LlmModelFieldProps = FieldRendererProps<LlmModelFieldSchema, LlmModelConfig>

function getModelReference(value: unknown): LlmModelConfig {
  const result = llmModelSchema.safeParse(value)

  return result.success ? result.data : llmModelSchema.parse({})
}

function getAvailableModelGroups(groups: readonly ModelGroupDto[]): AvailableModelGroup[] {
  return groups.flatMap((group) => {
    if (!group.enabled || group.modelType !== 'chat') return []

    const models = group.models.flatMap((model) =>
      model.enabled
        ? [
            {
              configuredModelId: model.id,
              displayName: model.displayName || model.modelId,
              groupId: group.id,
              groupName: group.name,
              modelId: model.modelId,
              providerType: group.providerType,
            },
          ]
        : [],
    )

    return models.length > 0
      ? [
          {
            groupId: group.id,
            groupName: group.name,
            models,
            providerType: group.providerType,
          },
        ]
      : []
  })
}

export function LlmModelField({ field, value, error, disabled, onChange }: LlmModelFieldProps) {
  const [settingsOpen, setSettingsOpen] = useState(false),
    { load, loaded, loadError, loading, modelGroups, reload } = useWorkflowModelCatalog(),
    modelReference = getModelReference(value),
    availableModelGroups = getAvailableModelGroups(modelGroups),
    availableModels = availableModelGroups.flatMap((group) => group.models),
    selectedModel = availableModels.find(
      (model) =>
        model.groupId === modelReference.groupId &&
        model.configuredModelId === modelReference.configuredModelId,
    ),
    hasStoredModel = Boolean(modelReference.groupId || modelReference.configuredModelId)

  useEffect(() => {
    load()
  }, [load])

  function handleModelChange(configuredModelId: string) {
    const nextModel = availableModels.find((model) => model.configuredModelId === configuredModelId)
    if (!nextModel) return

    onChange({
      groupId: nextModel.groupId,
      configuredModelId: nextModel.configuredModelId,
      groupName: nextModel.groupName,
      modelId: nextModel.modelId,
      modelName: nextModel.displayName,
      providerType: nextModel.providerType,
      parameters: {},
    })
  }

  function handleSaveModelParameters(parameters: LlmModelParametersInput) {
    onChange({
      ...modelReference,
      ...(selectedModel
        ? {
            groupName: selectedModel.groupName,
            modelId: selectedModel.modelId,
            modelName: selectedModel.displayName,
            providerType: selectedModel.providerType,
          }
        : {}),
      parameters,
    })
  }

  return (
    <>
      <Form.Field
        label={field.label}
        description={field.description}
        error={error}
        required={field.required}
        actions={
          loadError ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={disabled || loading}
              onClick={reload}
            >
              <RefreshCw aria-hidden />
              重试
            </Button>
          ) : undefined
        }
      >
        <div className="bg-input flex min-w-0 items-center rounded-md">
          <Select
            value={selectedModel?.configuredModelId}
            disabled={disabled || !loaded || loading || loadError || availableModels.length === 0}
            onValueChange={handleModelChange}
          >
            <SelectTrigger
              aria-label={field.label}
              aria-invalid={Boolean(error)}
              className="h-9 min-w-0 flex-1 rounded-r-none bg-transparent hover:z-10 focus-visible:z-10"
            >
              <SelectValue
                placeholder={
                  loadError
                    ? '模型加载失败'
                    : !loaded || loading
                      ? '正在加载模型...'
                      : availableModels.length === 0
                        ? '暂无可用模型'
                        : hasStoredModel
                          ? '已配置模型不可用'
                          : '请选择模型'
                }
              >
                {selectedModel ? <SelectedModelValue model={selectedModel} /> : null}
              </SelectValue>
            </SelectTrigger>

            <SelectContent
              position="popper"
              align="start"
              sideOffset={4}
              className="w-(--radix-select-trigger-width)"
            >
              {availableModelGroups.map((group, groupIndex) => {
                const ProviderIcon = getModelProviderStrategy(group.providerType).icon

                return (
                  <SelectGroup key={group.groupId}>
                    {groupIndex > 0 ? <SelectSeparator /> : null}
                    <SelectLabel className="flex items-center gap-1.5">
                      <ProviderIcon aria-hidden className="size-3.5" />
                      <span className="truncate">{group.groupName}</span>
                    </SelectLabel>
                    {group.models.map((model) => (
                      <SelectItem
                        key={model.configuredModelId}
                        value={model.configuredModelId}
                        textValue={`${model.displayName} ${model.modelId} ${group.groupName}`}
                      >
                        <span className="min-w-0 flex-1 truncate">{model.displayName}</span>
                        <Badge
                          variant="outline"
                          className="text-muted-foreground h-5 shrink-0 rounded-md px-1.5 text-[10px]"
                        >
                          CHAT
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )
              })}
            </SelectContent>
          </Select>

          <span className="bg-border/50 h-5 w-px shrink-0" aria-hidden />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hover:border-input-focus hover:bg-background focus-visible:border-input-focus focus-visible:bg-background dark:hover:bg-background dark:focus-visible:bg-background size-9 shrink-0 rounded-l-none border border-transparent bg-transparent hover:z-10 focus-visible:z-10"
            aria-label="设置模型参数"
            disabled={disabled || !selectedModel}
            onClick={() => setSettingsOpen(true)}
          >
            <SlidersHorizontal aria-hidden />
          </Button>
        </div>
      </Form.Field>

      {settingsOpen && selectedModel ? (
        <LlmModelParametersDialog
          open
          modelId={selectedModel.modelId}
          modelName={selectedModel.displayName}
          providerType={selectedModel.providerType}
          value={modelReference.parameters}
          onOpenChange={setSettingsOpen}
          onSave={handleSaveModelParameters}
        />
      ) : null}
    </>
  )
}

function SelectedModelValue({ model }: { model: AvailableModelOption }) {
  const ProviderIcon = getModelProviderStrategy(model.providerType).icon

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <ProviderIcon aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{model.displayName}</span>
      <Badge
        variant="outline"
        className="text-muted-foreground h-5 shrink-0 rounded-md px-1.5 text-[10px]"
      >
        CHAT
      </Badge>
    </span>
  )
}
