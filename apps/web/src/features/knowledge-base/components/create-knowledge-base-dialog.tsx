import { CREATE_KNOWLEDGE_BASE_INITIAL_VALUES, type CreateKnowledgeBaseInput } from '../schema'
import { KnowledgeBaseFormDialog } from './knowledge-base-form-dialog'

interface CreateKnowledgeBaseDialogProps {
  open: boolean
  onCreate: (input: CreateKnowledgeBaseInput) => unknown | Promise<unknown>
  onOpenChange: (open: boolean) => void
}

export function CreateKnowledgeBaseDialog({
  open,
  onCreate,
  onOpenChange,
}: CreateKnowledgeBaseDialogProps) {
  return (
    <KnowledgeBaseFormDialog
      initialValues={CREATE_KNOWLEDGE_BASE_INITIAL_VALUES}
      open={open}
      submitLabel="创建"
      title="创建知识库"
      onOpenChange={onOpenChange}
      onSubmit={onCreate}
    />
  )
}
