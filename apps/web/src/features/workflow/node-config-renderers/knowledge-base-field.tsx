import type { KnowledgeBaseFieldSchema } from '@ai-workflow/core'
import type { FieldRendererProps } from '@ai-workflow/form'
import { Form } from '@ai-workflow/ui/components/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'

import { useWorkflowKnowledgeBaseCatalog } from '@/components/workflow/workflow-knowledge-base-catalog-context'

type KnowledgeBaseFieldProps = FieldRendererProps<KnowledgeBaseFieldSchema, string>

export function KnowledgeBaseField({
  name,
  field,
  value,
  error,
  disabled,
  onChange,
}: KnowledgeBaseFieldProps) {
  const { knowledgeBases, loading, loadError } = useWorkflowKnowledgeBaseCatalog()
  const selectedKnowledgeBase = knowledgeBases.find((knowledgeBase) => knowledgeBase.id === value)
  const unavailableKnowledgeBaseId = value && !selectedKnowledgeBase ? value : undefined
  const selectedKnowledgeBaseUnavailable = Boolean(unavailableKnowledgeBaseId)

  const description = getKnowledgeBaseFieldDescription({
    defaultDescription: field.description,
    hasKnowledgeBases: knowledgeBases.length > 0,
    loading,
    loadError,
    selectedKnowledgeBaseUnavailable,
  })

  return (
    <Form.Field
      label={field.label}
      description={description}
      error={error}
      required={field.required}
    >
      <Select
        name={name}
        value={value || undefined}
        disabled={disabled}
        required={field.required}
        onValueChange={onChange}
      >
        <SelectTrigger className="w-full" aria-label={field.label} aria-invalid={Boolean(error)}>
          <SelectValue
            placeholder={
              loading
                ? '正在加载知识库...'
                : loadError
                  ? '知识库加载失败'
                  : knowledgeBases.length === 0
                    ? '暂无知识库'
                    : selectedKnowledgeBaseUnavailable
                      ? '已配置知识库不可用'
                      : '请选择知识库'
            }
          />
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          sideOffset={4}
          className="w-(--radix-select-trigger-width)"
        >
          {unavailableKnowledgeBaseId ? (
            <SelectItem value={unavailableKnowledgeBaseId}>
              {`不可用的知识库（${unavailableKnowledgeBaseId}）`}
            </SelectItem>
          ) : null}
          {knowledgeBases.map((knowledgeBase) => (
            <SelectItem key={knowledgeBase.id} value={knowledgeBase.id}>
              {knowledgeBase.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Form.Field>
  )
}

interface KnowledgeBaseFieldDescriptionOptions {
  defaultDescription?: string
  hasKnowledgeBases: boolean
  loading: boolean
  loadError: boolean
  selectedKnowledgeBaseUnavailable: boolean
}

function getKnowledgeBaseFieldDescription({
  defaultDescription,
  hasKnowledgeBases,
  loading,
  loadError,
  selectedKnowledgeBaseUnavailable,
}: KnowledgeBaseFieldDescriptionOptions): string | undefined {
  if (loading && !hasKnowledgeBases) {
    return '正在加载知识库列表'
  }

  if (loadError && !hasKnowledgeBases) {
    return '知识库列表加载失败，请重新打开编辑器后重试'
  }

  if (selectedKnowledgeBaseUnavailable) {
    return '已保存的知识库当前不可用，请重新选择'
  }

  if (!hasKnowledgeBases) {
    return '暂无知识库，请先创建空白知识库'
  }

  return defaultDescription
}
