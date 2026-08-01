import type { CreateKnowledgeBaseInput } from '../schema'
import type { KnowledgeBaseListItem } from '../types'
import { KnowledgeBaseFormDialog } from './knowledge-base-form-dialog'

interface EditKnowledgeBaseDialogProps {
  knowledgeBase: KnowledgeBaseListItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (input: CreateKnowledgeBaseInput) => unknown | Promise<unknown>
}

export function EditKnowledgeBaseDialog({
  knowledgeBase,
  open,
  onOpenChange,
  onUpdate,
}: EditKnowledgeBaseDialogProps) {
  return (
    <KnowledgeBaseFormDialog
      initialValues={{
        title: knowledgeBase.title,
        icon: isKnowledgeBaseIcon(knowledgeBase.icon) ? knowledgeBase.icon : '📚',
        description: knowledgeBase.description ?? '',
      }}
      open={open}
      submitLabel="保存"
      title="编辑知识库信息"
      onOpenChange={onOpenChange}
      onSubmit={onUpdate}
    />
  )
}

function isKnowledgeBaseIcon(icon: string | undefined): icon is CreateKnowledgeBaseInput['icon'] {
  return (
    icon === '📚' ||
    icon === '📄' ||
    icon === '📁' ||
    icon === '🔍' ||
    icon === '💡' ||
    icon === '🧠'
  )
}
