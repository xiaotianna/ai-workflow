import { Button } from '@ai-workflow/ui/components/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ai-workflow/ui/components/tabs'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  createModelGroup,
  deleteModelGroup,
  listModelGroups,
  updateConfiguredModelEnabled,
  updateModelGroup,
  updateModelGroupEnabled,
  type CreateModelGroupParams,
  type ModelGroupDto,
  type ModelType,
  type UpdateModelGroupParams,
} from '@/api/models'
import { PageContent } from '@/components/page-content'
import { PageHeaderActions } from '@/components/page-header-actions'
import { PageTitle } from '@/components/page-title'
import {
  DeleteModelGroupDialog,
  ModelGroupAccordion,
  ModelGroupDialog,
  type ModelGroupInput,
} from '@/features/models'

const MODEL_TABS = [
  {
    value: 'chat',
    label: '对话',
  },
  {
    value: 'embedding',
    label: '嵌入',
  },
] as const

function isModelTab(value: string | null): value is ModelType {
  return MODEL_TABS.some((tab) => tab.value === value)
}

export default function ModelsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab = isModelTab(tabParam) ? tabParam : 'chat'
  const [modelGroups, setModelGroups] = useState<ModelGroupDto[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [initialError, setInitialError] = useState(false)
  const [reloadRevision, setReloadRevision] = useState(0)
  const [modelGroupDialogOpen, setModelGroupDialogOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string>()
  const [deletingGroupId, setDeletingGroupId] = useState<string>()

  const editingGroup = modelGroups.find((group) => group.id === editingGroupId)
  const deletingGroup = modelGroups.find((group) => group.id === deletingGroupId)

  useEffect(() => {
    if (isModelTab(tabParam)) return

    setSearchParams(
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams)
        nextParams.set('tab', 'chat')
        return nextParams
      },
      {
        replace: true,
      },
    )
  }, [setSearchParams, tabParam])

  useEffect(() => {
    const controller = new AbortController()

    setInitialLoading(true)
    setInitialError(false)

    void listModelGroups(undefined, controller.signal)
      .then(({ items }) => {
        setModelGroups(items)
      })
      .catch(() => {
        if (!controller.signal.aborted) setInitialError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setInitialLoading(false)
      })

    return () => controller.abort()
  }, [reloadRevision])

  function handleTabChange(value: string) {
    if (!isModelTab(value)) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('tab', value)
    setSearchParams(nextParams)
  }

  function openCreateDialog() {
    setEditingGroupId(undefined)
    setModelGroupDialogOpen(true)
  }

  function openEditDialog(group: ModelGroupDto) {
    setEditingGroupId(group.id)
    setModelGroupDialogOpen(true)
  }

  function handleModelGroupDialogOpenChange(open: boolean) {
    setModelGroupDialogOpen(open)
    if (!open) setEditingGroupId(undefined)
  }

  async function handleSaveGroup(input: ModelGroupInput) {
    if (editingGroup) {
      const updatedGroup = await updateModelGroup(
        editingGroup.id,
        toUpdateModelGroupParams(input, editingGroup),
      )
      setModelGroups((currentGroups) =>
        currentGroups.map((group) => (group.id === updatedGroup.id ? updatedGroup : group)),
      )
      showToast('success', '模型组已保存')
      return
    }

    const createdGroup = await createModelGroup(toCreateModelGroupParams(input, activeTab))
    setModelGroups((currentGroups) => [...currentGroups, createdGroup])
    showToast('success', '模型组已创建')
  }

  async function handleGroupEnabledChange(groupId: string, enabled: boolean) {
    setModelGroups((currentGroups) =>
      currentGroups.map((group) => (group.id === groupId ? { ...group, enabled } : group)),
    )

    try {
      await updateModelGroupEnabled(groupId, enabled)
    } catch {
      setModelGroups((currentGroups) =>
        currentGroups.map((group) =>
          group.id === groupId ? { ...group, enabled: !enabled } : group,
        ),
      )
    }
  }

  async function handleModelEnabledChange(
    groupId: string,
    configuredModelId: string,
    enabled: boolean,
  ) {
    updateLocalModelEnabled(groupId, configuredModelId, enabled)

    try {
      await updateConfiguredModelEnabled(groupId, configuredModelId, enabled)
    } catch {
      updateLocalModelEnabled(groupId, configuredModelId, !enabled)
    }
  }

  function updateLocalModelEnabled(groupId: string, configuredModelId: string, enabled: boolean) {
    setModelGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              models: group.models.map((model) =>
                model.id === configuredModelId ? { ...model, enabled } : model,
              ),
            }
          : group,
      ),
    )
  }

  async function handleDeleteGroup() {
    if (!deletingGroup) return

    await deleteModelGroup(deletingGroup.id)
    setModelGroups((currentGroups) =>
      currentGroups.filter((group) => group.id !== deletingGroup.id),
    )
    setDeletingGroupId(undefined)
    showToast('success', '模型组已删除')
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="flex min-h-full flex-col">
      <PageTitle title="模型管理" />

      <PageHeaderActions className="justify-between">
        <TabsList aria-label="模型类型">
          {MODEL_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <Button
          type="button"
          size="sm"
          disabled={initialLoading || initialError}
          onClick={openCreateDialog}
        >
          <Plus aria-hidden />
          新增模型组
        </Button>
      </PageHeaderActions>

      <PageContent className="mt-5 pb-6">
        {MODEL_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {initialLoading ? (
              <ModelGroupsStatus message="正在加载模型配置..." />
            ) : initialError ? (
              <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-muted-foreground text-sm">模型配置加载失败</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setReloadRevision((revision) => revision + 1)}
                >
                  重新加载
                </Button>
              </div>
            ) : (
              <ModelGroupAccordion
                groups={modelGroups.filter((group) => group.modelType === tab.value)}
                onDelete={(group) => setDeletingGroupId(group.id)}
                onEdit={openEditDialog}
                onGroupEnabledChange={(groupId, enabled) => {
                  void handleGroupEnabledChange(groupId, enabled)
                }}
                onModelEnabledChange={(groupId, configuredModelId, enabled) => {
                  void handleModelEnabledChange(groupId, configuredModelId, enabled)
                }}
              />
            )}
          </TabsContent>
        ))}
      </PageContent>

      <ModelGroupDialog
        group={editingGroup}
        modelType={editingGroup?.modelType ?? activeTab}
        open={modelGroupDialogOpen}
        onOpenChange={handleModelGroupDialogOpenChange}
        onSave={handleSaveGroup}
      />

      <DeleteModelGroupDialog
        group={deletingGroup}
        open={Boolean(deletingGroup)}
        onOpenChange={(open) => {
          if (!open) setDeletingGroupId(undefined)
        }}
        onDelete={handleDeleteGroup}
      />
    </Tabs>
  )
}

function ModelGroupsStatus({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="text-muted-foreground flex min-h-56 items-center justify-center px-6 text-sm"
    >
      {message}
    </div>
  )
}

function toCreateModelGroupParams(
  input: ModelGroupInput,
  modelType: ModelType,
): CreateModelGroupParams {
  return {
    modelType,
    name: input.name,
    providerType: input.providerType,
    baseUrl: input.baseUrl ?? null,
    ...(input.apiKey ? { apiKey: input.apiKey } : {}),
    models: input.models.map((model) => ({
      modelId: model.modelId,
      displayName: model.displayName,
      enabled: model.enabled,
    })),
  }
}

function toUpdateModelGroupParams(
  input: ModelGroupInput,
  currentGroup: ModelGroupDto,
): UpdateModelGroupParams {
  const apiKeyUnchanged =
    currentGroup.providerType === input.providerType && currentGroup.maskedApiKey === input.apiKey

  return {
    name: input.name,
    providerType: input.providerType,
    baseUrl: input.baseUrl ?? null,
    apiKey: apiKeyUnchanged ? undefined : (input.apiKey ?? null),
    models: input.models.map((model) => ({
      id: model.id,
      modelId: model.modelId,
      displayName: model.displayName,
      enabled: model.enabled,
    })),
  }
}
