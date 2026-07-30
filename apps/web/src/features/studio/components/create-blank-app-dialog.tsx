import { CREATE_STUDIO_APP_INITIAL_VALUES, type CreateStudioAppInput } from '../schema'
import { StudioAppFormDialog } from './studio-app-form-dialog'

interface CreateBlankAppDialogProps {
  open: boolean
  onCreate: (input: CreateStudioAppInput) => unknown | Promise<unknown>
  onOpenChange: (open: boolean) => void
}

export function CreateBlankAppDialog({ open, onCreate, onOpenChange }: CreateBlankAppDialogProps) {
  return (
    <StudioAppFormDialog
      initialValues={CREATE_STUDIO_APP_INITIAL_VALUES}
      open={open}
      submitLabel="创建"
      title="创建空白应用"
      onOpenChange={onOpenChange}
      onSubmit={onCreate}
    />
  )
}
