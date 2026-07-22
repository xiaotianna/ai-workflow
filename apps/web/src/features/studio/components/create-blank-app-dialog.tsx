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
import { Input } from '@ai-workflow/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { Textarea } from '@ai-workflow/ui/components/textarea'
import { useRef, useState, type FormEvent } from 'react'

import type { CreateStudioAppInput } from '../types'

const appIcons = ['🤖', '✨', '💡', '🚀', '🧩', '📊'] as const

interface CreateBlankAppDialogProps {
  open: boolean
  onCreate: (input: CreateStudioAppInput) => void
  onOpenChange: (open: boolean) => void
}

export function CreateBlankAppDialog({ open, onCreate, onOpenChange }: CreateBlankAppDialogProps) {
  const [appName, setAppName] = useState('')
  const [appIcon, setAppIcon] = useState<(typeof appIcons)[number]>('🤖')
  const [appDescription, setAppDescription] = useState('')
  const appNameInputRef = useRef<HTMLInputElement>(null)
  const isFormValid = Boolean(appName.trim())

  function resetForm() {
    setAppName('')
    setAppIcon('🤖')
    setAppDescription('')
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isFormValid) return

    onCreate({
      title: appName.trim(),
      icon: appIcon,
      description: appDescription.trim() || undefined,
    })
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          appNameInputRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>创建空白应用</DialogTitle>
        </DialogHeader>

        <Form onSubmit={handleSubmit}>
          <Form.Field required label="应用名称 & 图标">
            <div className="flex items-center gap-2">
              <Select
                value={appIcon}
                onValueChange={(value) => setAppIcon(value as (typeof appIcons)[number])}
              >
                <SelectTrigger
                  size="sm"
                  aria-label="应用图标"
                  className="w-11 shrink-0 justify-center rounded-lg px-2 [&>svg]:hidden"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start" className="min-w-28">
                  {appIcons.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      <span className="text-base leading-none">{icon}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                ref={appNameInputRef}
                value={appName}
                onChange={(event) => setAppName(event.target.value)}
                aria-label="应用名称"
                autoComplete="off"
                maxLength={40}
                placeholder="输入应用名称"
                className="bg-muted/80 focus-visible:bg-background h-8 rounded-lg border-transparent px-3 text-sm shadow-none"
              />
            </div>
          </Form.Field>

          <Form.Field label="描述">
            <Textarea
              value={appDescription}
              onChange={(event) => setAppDescription(event.target.value)}
              aria-label="应用描述（可选）"
              maxLength={200}
              placeholder="输入应用描述"
              className="bg-muted/80 focus-visible:bg-background min-h-24 resize-none rounded-lg border-transparent px-3 py-2 text-sm shadow-none"
            />
          </Form.Field>

          <DialogFooter className="pt-1">
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm">
                取消
              </Button>
            </DialogClose>
            <Button type="submit" variant="confirm" size="sm" disabled={!isFormValid}>
              创建
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
