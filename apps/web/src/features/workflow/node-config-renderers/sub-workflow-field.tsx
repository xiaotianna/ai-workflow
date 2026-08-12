import {
  BuiltinNodeType,
  type SubWorkflowFieldSchema,
  type SubWorkflowReference,
} from '@ai-workflow/core'
import type { FieldRendererProps } from '@ai-workflow/form'
import { WorkflowReferenceIcon } from '@ai-workflow/nodes-ui'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { PencilLine, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useEffect, useState } from 'react'

import { getStudioSubWorkflowContract, type StudioAppDto } from '@/api/studio'
import { useWorkflowStudioAppCatalog } from '@/components/workflow/workflow-studio-app-catalog-context'

import { useWorkflowNodeConfigActions } from '../components/workflow-node-config-actions-context'
import {
  normalizeSubWorkflowReference,
  SubWorkflowSelectorDialog,
} from './sub-workflow-selector-dialog'

type SubWorkflowFieldProps = FieldRendererProps<SubWorkflowFieldSchema, SubWorkflowReference>

export function SubWorkflowField({ name, field, value, error, disabled }: SubWorkflowFieldProps) {
  const [selectorOpen, setSelectorOpen] = useState(false),
    [saving, setSaving] = useState(false),
    { applySubWorkflowSelection } = useWorkflowNodeConfigActions(),
    { apps, currentAppId, load, loaded, loading, loadError, reload } =
      useWorkflowStudioAppCatalog(),
    workflowReference = normalizeSubWorkflowReference(value),
    selectedApp =
      apps.find((app) => app.id === workflowReference.appId) ??
      (workflowReference.appId || workflowReference.id
        ? {
            id: workflowReference.appId || workflowReference.id,
            title:
              workflowReference.name ??
              `旧配置工作流（${workflowReference.appId || workflowReference.id}）`,
            author: '',
            createdAt: '',
            updatedAt: '',
            ...(workflowReference.icon ? { icon: workflowReference.icon } : {}),
          }
        : undefined),
    hasSelection = Boolean(workflowReference.id || workflowReference.appId),
    unavailable =
      loaded &&
      hasSelection &&
      Boolean(workflowReference.appId) &&
      !apps.some((app) => app.id === workflowReference.appId),
    canOpenSelector = !disabled && loaded && !saving,
    description = getSubWorkflowFieldDescription({
      hasApps: apps.some((app) => app.id !== currentAppId),
      loaded,
      loadError,
      loading,
      unavailable,
    })

  useEffect(() => {
    load()
  }, [load])

  async function handleSelectApp(app: StudioAppDto) {
    setSaving(true)

    try {
      const contract = await getStudioSubWorkflowContract(app.id),
        nextWorkflow: SubWorkflowReference = {
          id: contract.workflowId,
          appId: app.id,
          name: app.title,
          ...(app.icon ? { icon: app.icon } : {}),
        }

      // 通过配置面板 action 同步 config / inputs / outputs，避免字段 onChange 用旧 node 覆盖变量
      applySubWorkflowSelection({
        workflow: nextWorkflow,
        target: {
          nodes: [
            {
              type: BuiltinNodeType.START,
              outputs: contract.inputVariables,
            },
          ],
          outputs: contract.outputVariables,
        },
      })
      setSelectorOpen(false)
    } catch {
      showToast('error', '读取已发布子工作流配置失败，请确认目标已发布后重试')
    } finally {
      setSaving(false)
    }
  }

  function handleClear() {
    applySubWorkflowSelection({
      workflow: {
        id: '',
        appId: '',
      },
      target: {
        nodes: [],
        outputs: [],
      },
    })
  }

  return (
    <>
      <Form.Field
        data-field-name={name}
        label={field.label}
        description={description}
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
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={!canOpenSelector}
              aria-label={hasSelection ? '更换子工作流' : '选择子工作流'}
              className="text-muted-foreground hover:text-foreground focus-visible:text-foreground"
              onClick={() => setSelectorOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          )
        }
      >
        <MotionConfig reducedMotion="user">
          {selectedApp ? (
            <div className="space-y-2">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  layout="position"
                  key={selectedApp.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  <div className="group/sub-workflow border-border/60 bg-background relative flex h-11 min-w-0 overflow-hidden rounded-lg border-[0.5px] shadow-xs transition-shadow duration-200 ease-out hover:shadow-md motion-reduce:transition-none">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5">
                      <WorkflowReferenceIcon icon={selectedApp.icon} title={selectedApp.title} />
                      <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                        {selectedApp.title}
                      </span>
                    </div>

                    <div className="bg-background pointer-events-none absolute inset-y-0 right-1 flex items-center gap-1 pl-3 opacity-0 transition-opacity group-focus-within/sub-workflow:pointer-events-auto group-focus-within/sub-workflow:opacity-100 group-hover/sub-workflow:pointer-events-auto group-hover/sub-workflow:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={!canOpenSelector}
                        aria-label={`更换${selectedApp.title}`}
                        className="text-muted-foreground"
                        onClick={() => setSelectorOpen(true)}
                      >
                        <PencilLine className="size-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={disabled || saving}
                        aria-label={`清除${selectedApp.title}`}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive"
                        onClick={handleClear}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-muted-foreground bg-muted/40 flex min-h-16 items-center justify-center rounded-xl px-4 text-center text-sm font-medium">
              {getSubWorkflowEmptyState({
                hasApps: apps.some((app) => app.id !== currentAppId),
                loaded,
                loadError,
                loading,
              })}
            </div>
          )}
        </MotionConfig>
      </Form.Field>

      {selectorOpen ? (
        <SubWorkflowSelectorDialog
          open
          value={workflowReference}
          apps={apps}
          excludeAppId={currentAppId}
          loading={loading}
          loadError={loadError}
          saving={saving}
          onOpenChange={setSelectorOpen}
          onSave={handleSelectApp}
        />
      ) : null}
    </>
  )
}

interface SubWorkflowCatalogState {
  hasApps: boolean
  loaded: boolean
  loadError: boolean
  loading: boolean
}

interface SubWorkflowFieldDescriptionOptions extends SubWorkflowCatalogState {
  unavailable: boolean
}

function getSubWorkflowFieldDescription({
  hasApps,
  loaded,
  loadError,
  loading,
  unavailable,
}: SubWorkflowFieldDescriptionOptions): string | undefined {
  if ((!loaded || loading) && !hasApps) return undefined
  if (loadError && !hasApps) return undefined

  if (unavailable) {
    return '已保存的子工作流当前不可用，请重新选择'
  }

  return undefined
}

function getSubWorkflowEmptyState({
  hasApps,
  loaded,
  loadError,
  loading,
}: SubWorkflowCatalogState): string {
  if (loadError && !hasApps) return '工作流列表加载失败'
  if ((!loaded || loading) && !hasApps) return '正在加载工作流列表'
  if (!hasApps) return '暂无已发布的工作流，请先发布其他应用'

  return '点击“+”按钮选择已发布的子工作流'
}
