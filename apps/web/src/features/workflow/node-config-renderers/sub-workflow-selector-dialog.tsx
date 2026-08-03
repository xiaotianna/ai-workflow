import { subWorkflowReferenceSchema, type SubWorkflowReference } from '@ai-workflow/core'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Button } from '@ai-workflow/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'
import { Form } from '@ai-workflow/ui/components/form'
import { WorkflowReferenceIcon } from '@ai-workflow/nodes-ui'
import { cn } from '@ai-workflow/ui/lib/utils'
import type { FormEvent } from 'react'
import { z } from 'zod'

import type { StudioAppDto } from '@/api/studio'

interface SubWorkflowSelectorDialogProps {
  apps: readonly StudioAppDto[]
  excludeAppId?: string
  loadError: boolean
  loading: boolean
  onOpenChange: (open: boolean) => void
  onSave: (app: StudioAppDto) => void | Promise<void>
  open: boolean
  saving?: boolean
  value: SubWorkflowReference
}

interface SubWorkflowOption {
  icon?: string
  id: string
  title: string
  description?: string
}

const subWorkflowSelectionSchema = z.object({
  appId: z.string().trim().min(1, '请选择子工作流'),
})

type SubWorkflowSelectionForm = z.input<typeof subWorkflowSelectionSchema>

export function SubWorkflowSelectorDialog({
  apps,
  excludeAppId,
  loadError,
  loading,
  onOpenChange,
  onSave,
  open,
  saving = false,
  value,
}: SubWorkflowSelectorDialogProps) {
  const selectableApps = apps.filter((app) => app.id !== excludeAppId)
  const { form, updateFormField } = useFormData<SubWorkflowSelectionForm>({
    appId: value.appId || '',
  })
  const validationResult = validateFormByZod(subWorkflowSelectionSchema, form)
  const selectedAppId = form.appId?.trim() ?? ''
  const unavailableOption =
    value.appId &&
    !selectableApps.some((app) => app.id === value.appId) &&
    value.appId !== excludeAppId
      ? {
          id: value.appId,
          title: value.name ?? `不可用的工作流（${value.appId}）`,
          ...(value.icon ? { icon: value.icon } : {}),
          description: '当前不可用，请重新选择',
        }
      : undefined
  const options: SubWorkflowOption[] = [
    ...(unavailableOption ? [unavailableOption] : []),
    ...selectableApps.map((app) => ({
      id: app.id,
      title: app.title,
      ...(app.icon ? { icon: app.icon } : {}),
      ...(app.description ? { description: app.description } : {}),
    })),
  ]

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const result = validateFormByZod(subWorkflowSelectionSchema, form)
    if (!result.success || saving) return

    const app = selectableApps.find((item) => item.id === result.data.appId)
    if (!app) return

    void onSave(app)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex min-h-72 max-w-md flex-col gap-5">
        <DialogHeader>
          <DialogTitle>选择子工作流</DialogTitle>
        </DialogHeader>

        <Form className="flex min-h-0 flex-1 flex-col space-y-0" onSubmit={handleSubmit}>
          <div className="-mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-1 py-0.5">
            {options.map((app) => {
              const selected = selectedAppId === app.id

              return (
                <button
                  key={app.id}
                  type="button"
                  aria-pressed={selected}
                  className={cn(
                    'flex min-h-11 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border px-2 py-2 text-left shadow-xs transition-[background-color,border-color,box-shadow] duration-150 outline-none',
                    selected
                      ? 'border-primary bg-primary/10 hover:bg-primary/15 focus-visible:border-primary focus-visible:bg-primary/15'
                      : 'border-border/60 bg-background hover:border-input-focus hover:bg-muted/40 focus-visible:border-input-focus focus-visible:bg-muted/40',
                  )}
                  onClick={() => updateFormField('appId', app.id)}
                >
                  <WorkflowReferenceIcon icon={app.icon} title={app.title} />
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground block truncate text-sm font-medium">
                      {app.title}
                    </span>
                    {app.description ? (
                      <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                        {app.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              )
            })}

            {options.length === 0 ? (
              <div
                role="status"
                className="text-muted-foreground bg-muted/40 flex min-h-24 items-center justify-center rounded-xl px-4 text-center text-sm"
              >
                {loading
                  ? '正在加载工作流列表'
                  : loadError
                    ? '工作流列表加载失败，请重新打开编辑器后重试'
                    : '暂无已发布的工作流，请先发布其他应用'}
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-5 items-center sm:justify-end">
            <div className="flex items-center gap-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary" size="sm" disabled={saving}>
                  取消
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="confirm"
                size="sm"
                disabled={!validationResult.success || saving}
              >
                {saving ? '同步中...' : '确认'}
              </Button>
            </div>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function normalizeSubWorkflowReference(value: unknown): SubWorkflowReference {
  const result = subWorkflowReferenceSchema.safeParse(value)

  return result.success
    ? result.data
    : {
        id: '',
        appId: '',
      }
}
