import { Button } from '@ai-workflow/ui/components/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ai-workflow/ui/components/tabs'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { PageContent } from '@/components/page-content'
import { PageHeaderActions } from '@/components/page-header-actions'
import { PageTitle } from '@/components/page-title'
import {
  createInitialModelGroups,
  DeleteModelGroupDialog,
  getModelProviderStrategy,
  ModelGroupAccordion,
  ModelGroupDialog,
  type ModelGroup,
  type ModelGroupInput,
} from '@/features/models'

function createModelGroupId() {
  return `model-group-${globalThis.crypto.randomUUID()}`
}

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

type ModelTab = (typeof MODEL_TABS)[number]['value']
type ModelGroupsByTab = Record<ModelTab, ModelGroup[]>

function isModelTab(value: string | null): value is ModelTab {
  return MODEL_TABS.some((tab) => tab.value === value)
}

export default function ModelsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab = isModelTab(tabParam) ? tabParam : 'chat'
  const [modelGroupsByTab, setModelGroupsByTab] = useState<ModelGroupsByTab>(() => ({
    chat: createInitialModelGroups(),
    embedding: [],
  }))
  const [modelGroupDialogOpen, setModelGroupDialogOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string>()
  const [deletingGroupId, setDeletingGroupId] = useState<string>()

  const modelGroups = modelGroupsByTab[activeTab]
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

  function updateModelGroups(tab: ModelTab, update: (currentGroups: ModelGroup[]) => ModelGroup[]) {
    setModelGroupsByTab((currentGroupsByTab) => ({
      ...currentGroupsByTab,
      [tab]: update(currentGroupsByTab[tab]),
    }))
  }

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

  function openEditDialog(group: ModelGroup) {
    setEditingGroupId(group.id)
    setModelGroupDialogOpen(true)
  }

  function handleModelGroupDialogOpenChange(open: boolean) {
    setModelGroupDialogOpen(open)
    if (!open) setEditingGroupId(undefined)
  }

  function handleSaveGroup(input: ModelGroupInput) {
    const strategy = getModelProviderStrategy(input.providerType)
    const nextGroup = strategy.createGroup(input, {
      id: editingGroup?.id ?? createModelGroupId(),
      enabled: editingGroup?.enabled ?? true,
    })

    updateModelGroups(activeTab, (currentGroups) =>
      editingGroup
        ? currentGroups.map((group) => (group.id === editingGroup.id ? nextGroup : group))
        : [...currentGroups, nextGroup],
    )
    showToast('success', editingGroup ? '模型组已保存' : '模型组已创建')
  }

  function handleGroupEnabledChange(groupId: string, enabled: boolean) {
    updateModelGroups(activeTab, (currentGroups) =>
      currentGroups.map((group) => (group.id === groupId ? { ...group, enabled } : group)),
    )
  }

  function handleModelEnabledChange(groupId: string, modelId: string, enabled: boolean) {
    updateModelGroups(activeTab, (currentGroups) =>
      currentGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              models: group.models.map((model) =>
                model.modelId === modelId ? { ...model, enabled } : model,
              ),
            }
          : group,
      ),
    )
  }

  function handleDeleteGroup() {
    if (!deletingGroup) return

    updateModelGroups(activeTab, (currentGroups) =>
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

        <Button type="button" size="sm" onClick={openCreateDialog}>
          <Plus aria-hidden />
          新增模型组
        </Button>
      </PageHeaderActions>

      <PageContent className="mt-5 pb-6">
        {MODEL_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <ModelGroupAccordion
              groups={modelGroupsByTab[tab.value]}
              onDelete={(group) => setDeletingGroupId(group.id)}
              onEdit={openEditDialog}
              onGroupEnabledChange={handleGroupEnabledChange}
              onModelEnabledChange={handleModelEnabledChange}
            />
          </TabsContent>
        ))}
      </PageContent>

      <ModelGroupDialog
        group={editingGroup}
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
