import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Button } from '@ai-workflow/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'
import { FileDropzone } from '@ai-workflow/ui/components/file-dropzone'
import { Form } from '@ai-workflow/ui/components/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { Textarea } from '@ai-workflow/ui/components/textarea'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { useState, type FormEvent } from 'react'

import {
  PLUGIN_PUBLISH_INITIAL_VALUES,
  pluginPublishSchema,
  type PluginPublishFormInput,
  type PluginPublishInput,
} from '../schema'

interface PluginPublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPublish?: (input: PluginPublishInput) => unknown | Promise<unknown>
}

export function PluginPublishDialog({ open, onOpenChange, onPublish }: PluginPublishDialogProps) {
  const { form, resetForm, updateFormField } = useFormData<PluginPublishFormInput>(
      PLUGIN_PUBLISH_INITIAL_VALUES,
    ),
    [submitted, setSubmitted] = useState(false),
    [changelogTouched, setChangelogTouched] = useState(false),
    [publishing, setPublishing] = useState(false),
    validationResult = validateFormByZod(pluginPublishSchema, form),
    formErrors = validationResult.errors,
    fileError = submitted || form.file ? formErrors.file : undefined,
    changelogError = submitted || changelogTouched ? formErrors.changelog : undefined

  function resetDialog() {
    resetForm()
    setSubmitted(false)
    setChangelogTouched(false)
    setPublishing(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (publishing && !nextOpen) return
    if (!nextOpen) resetDialog()
    onOpenChange(nextOpen)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)

    const result = validateFormByZod(pluginPublishSchema, form)
    if (!result.success) return

    if (!onPublish) {
      showToast('info', '插件上传接口尚未接入，发布参数已完成校验')
      return
    }

    setPublishing(true)

    try {
      await onPublish(result.data)
      showToast('success', '插件已提交发布')
      resetDialog()
      onOpenChange(false)
    } catch {
      setPublishing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg" showCloseButton={!publishing}>
        <DialogHeader>
          <DialogTitle>发布插件</DialogTitle>
          <DialogDescription>
            上传由 CLI 的 pack 命令生成的插件包。插件 ID、版本和发布者将从 Manifest
            中读取并由平台校验。
          </DialogDescription>
        </DialogHeader>

        <Form onSubmit={handleSubmit}>
          <Form.Field required label="插件包" error={fileError}>
            <FileDropzone
              file={form.file}
              inputName="pluginPackage"
              accept=".tgz,application/gzip,application/x-gzip"
              disabled={publishing}
              aria-label="选择或拖拽上传插件包"
              aria-invalid={Boolean(fileError)}
              onFileChange={(file) => updateFormField('file', file)}
            />
          </Form.Field>

          <Form.Field required label="可见范围">
            <Select
              value={form.visibility}
              disabled={publishing}
              onValueChange={(value) =>
                updateFormField('visibility', value as PluginPublishFormInput['visibility'])
              }
            >
              <SelectTrigger aria-label="插件可见范围" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectItem value="PUBLIC">公开发布到 Marketplace</SelectItem>
                <SelectItem value="PRIVATE">仅自己可见</SelectItem>
              </SelectContent>
            </Select>
          </Form.Field>

          <Form.Field label="版本说明" error={changelogError}>
            <Textarea
              value={form.changelog}
              disabled={publishing}
              maxLength={5000}
              rows={4}
              aria-label="版本说明（可选）"
              aria-invalid={Boolean(changelogError)}
              placeholder="说明本次版本新增、调整或修复的内容"
              onBlur={() => setChangelogTouched(true)}
              onChange={(event) => updateFormField('changelog', event.target.value)}
            />
          </Form.Field>

          <DialogFooter className="pt-1">
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm" disabled={publishing}>
                取消
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="confirm"
              size="sm"
              disabled={publishing || !validationResult.success}
            >
              {publishing ? '发布中...' : '上传并发布'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
