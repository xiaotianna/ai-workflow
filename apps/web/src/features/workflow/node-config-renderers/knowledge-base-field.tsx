import {
  ragKnowledgeBaseReferencesSchema,
  type KnowledgeBaseFieldSchema,
  type RagKnowledgeBaseReference,
} from '@ai-workflow/core'
import type { FieldRendererProps } from '@ai-workflow/form'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { PencilLine, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useEffect, useState } from 'react'

import { useWorkflowKnowledgeBaseCatalog } from '@/components/workflow/workflow-knowledge-base-catalog-context'

import {
  KnowledgeBaseReferenceIcon,
  KnowledgeBaseSegmentationBadge,
} from './knowledge-base-reference'
import { KnowledgeBaseSelectorDialog } from './knowledge-base-selector-dialog'

type KnowledgeBaseFieldProps = FieldRendererProps<
  KnowledgeBaseFieldSchema,
  RagKnowledgeBaseReference[]
>

function normalizeKnowledgeBaseReferences(value: unknown): RagKnowledgeBaseReference[] {
  const result = ragKnowledgeBaseReferencesSchema.safeParse(value)

  return result.success ? result.data : []
}

export function KnowledgeBaseField({
  name,
  field,
  value,
  error,
  disabled,
  onChange,
}: KnowledgeBaseFieldProps) {
  const [selectorOpen, setSelectorOpen] = useState(false)
  const { knowledgeBases, load, loaded, loading, loadError, reload } =
    useWorkflowKnowledgeBaseCatalog()
  const knowledgeBaseReferences = normalizeKnowledgeBaseReferences(value)
  const selectedKnowledgeBases = knowledgeBaseReferences.map((reference) => {
    const knowledgeBase = knowledgeBases.find((item) => item.id === reference.id)

    return {
      id: reference.id,
      icon: knowledgeBase?.icon ?? reference.icon,
      title: knowledgeBase?.title ?? reference.title ?? `旧配置知识库（${reference.id}）`,
      segmentationMode: knowledgeBase?.segmentationMode,
    }
  })
  const unavailableKnowledgeBaseCount = loaded
    ? selectedKnowledgeBases.filter(
        (knowledgeBase) => !knowledgeBases.some((item) => item.id === knowledgeBase.id),
      ).length
    : 0
  const canOpenSelector = !disabled && loaded
  const description = getKnowledgeBaseFieldDescription({
    hasKnowledgeBases: knowledgeBases.length > 0,
    loaded,
    loadError,
    loading,
    unavailableKnowledgeBaseCount,
  })

  useEffect(() => {
    load()
  }, [load])

  function removeKnowledgeBase(knowledgeBaseId: string) {
    onChange(
      knowledgeBaseReferences.filter((knowledgeBase) => knowledgeBase.id !== knowledgeBaseId),
    )
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
              aria-label="添加引用知识库"
              className="text-muted-foreground hover:text-foreground focus-visible:text-foreground"
              onClick={() => setSelectorOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          )
        }
      >
        <MotionConfig reducedMotion="user">
          {selectedKnowledgeBases.length > 0 ? (
            <div className="space-y-2">
              <AnimatePresence initial={false} mode="popLayout">
                {selectedKnowledgeBases.map((knowledgeBase) => (
                  <motion.div
                    layout="position"
                    key={knowledgeBase.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                  >
                    <div className="group/knowledge-base border-border/60 bg-background relative flex h-11 min-w-0 overflow-hidden rounded-lg border-[0.5px] shadow-xs transition-shadow duration-200 ease-out hover:shadow-md motion-reduce:transition-none">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5">
                        <KnowledgeBaseReferenceIcon
                          icon={knowledgeBase.icon}
                          title={knowledgeBase.title}
                        />
                        <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                          {knowledgeBase.title}
                        </span>
                        <span className="ml-2 flex w-24 shrink-0 items-center justify-end transition-opacity group-focus-within/knowledge-base:opacity-0 group-hover/knowledge-base:opacity-0">
                          <KnowledgeBaseSegmentationBadge
                            segmentationMode={knowledgeBase.segmentationMode}
                          />
                        </span>
                      </div>

                      <div className="bg-background pointer-events-none absolute inset-y-0 right-1 flex items-center gap-1 pl-3 opacity-0 transition-opacity group-focus-within/knowledge-base:pointer-events-auto group-focus-within/knowledge-base:opacity-100 group-hover/knowledge-base:pointer-events-auto group-hover/knowledge-base:opacity-100">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          disabled={!canOpenSelector}
                          aria-label={`编辑${knowledgeBase.title}引用`}
                          className="text-muted-foreground"
                          onClick={() => setSelectorOpen(true)}
                        >
                          <PencilLine className="size-4" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          disabled={disabled}
                          aria-label={`删除${knowledgeBase.title}引用`}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive"
                          onClick={() => removeKnowledgeBase(knowledgeBase.id)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-muted-foreground bg-muted/40 flex min-h-16 items-center justify-center rounded-xl px-4 text-center text-sm font-medium">
              {getKnowledgeBaseEmptyState({
                hasKnowledgeBases: knowledgeBases.length > 0,
                loaded,
                loadError,
                loading,
              })}
            </div>
          )}
        </MotionConfig>
      </Form.Field>

      {selectorOpen ? (
        <KnowledgeBaseSelectorDialog
          open
          value={knowledgeBaseReferences}
          knowledgeBases={knowledgeBases}
          loading={loading}
          loadError={loadError}
          onOpenChange={setSelectorOpen}
          onSave={onChange}
        />
      ) : null}
    </>
  )
}

interface KnowledgeBaseCatalogState {
  hasKnowledgeBases: boolean
  loaded: boolean
  loadError: boolean
  loading: boolean
}

interface KnowledgeBaseFieldDescriptionOptions extends KnowledgeBaseCatalogState {
  unavailableKnowledgeBaseCount: number
}

function getKnowledgeBaseFieldDescription({
  hasKnowledgeBases,
  loaded,
  loadError,
  loading,
  unavailableKnowledgeBaseCount,
}: KnowledgeBaseFieldDescriptionOptions): string | undefined {
  if ((!loaded || loading) && !hasKnowledgeBases) return undefined
  if (loadError && !hasKnowledgeBases) return undefined

  if (unavailableKnowledgeBaseCount > 0) {
    return `${unavailableKnowledgeBaseCount} 个已保存的知识库当前不可用，请重新选择`
  }

  return undefined
}

function getKnowledgeBaseEmptyState({
  hasKnowledgeBases,
  loaded,
  loadError,
  loading,
}: KnowledgeBaseCatalogState): string {
  if (loadError && !hasKnowledgeBases) return '知识库列表加载失败'
  if ((!loaded || loading) && !hasKnowledgeBases) return '正在加载知识库列表'
  if (!hasKnowledgeBases) return '暂无知识库，请先创建空白知识库'

  return '点击“+”按钮添加知识库'
}
