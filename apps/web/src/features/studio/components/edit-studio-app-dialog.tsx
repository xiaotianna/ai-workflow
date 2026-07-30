import type { CreateStudioAppInput } from '../schema'
import type { StudioAppListItem } from '../types'
import { StudioAppFormDialog } from './studio-app-form-dialog'

interface EditStudioAppDialogProps {
  app: StudioAppListItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (input: CreateStudioAppInput) => unknown | Promise<unknown>
}

export function EditStudioAppDialog({
  app,
  open,
  onOpenChange,
  onUpdate,
}: EditStudioAppDialogProps) {
  return (
    <StudioAppFormDialog
      initialValues={{
        title: app.title,
        icon: isStudioAppIcon(app.icon) ? app.icon : '🤖',
        description: app.description ?? '',
      }}
      open={open}
      submitLabel="保存"
      title="编辑应用信息"
      onOpenChange={onOpenChange}
      onSubmit={onUpdate}
    />
  )
}

function isStudioAppIcon(icon: string | undefined): icon is CreateStudioAppInput['icon'] {
  return (
    icon === '🤖' ||
    icon === '✨' ||
    icon === '💡' ||
    icon === '🚀' ||
    icon === '🧩' ||
    icon === '📊'
  )
}
