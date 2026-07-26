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

import type { CreateKnowledgeBaseInput } from '../types'

const knowledgeBaseIcons = ['📚', '📄', '📁', '🔍', '💡', '🧠'] as const

interface CreateKnowledgeBaseDialogProps {
  open: boolean
  onCreate: (input: CreateKnowledgeBaseInput) => void
  onOpenChange: (open: boolean) => void
}

export function CreateKnowledgeBaseDialog({
  open,
  onCreate,
  onOpenChange,
}: CreateKnowledgeBaseDialogProps) {
  const [knowledgeBaseName, setKnowledgeBaseName] = useState('')
  const [knowledgeBaseIcon, setKnowledgeBaseIcon] =
    useState<(typeof knowledgeBaseIcons)[number]>('📚')
  const [knowledgeBaseDescription, setKnowledgeBaseDescription] = useState('')
  const knowledgeBaseNameInputRef = useRef<HTMLInputElement>(null)
  const isFormValid = Boolean(knowledgeBaseName.trim())

  function resetForm() {
    setKnowledgeBaseName('')
    setKnowledgeBaseIcon('📚')
    setKnowledgeBaseDescription('')
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isFormValid) return

    onCreate({
      title: knowledgeBaseName.trim(),
      icon: knowledgeBaseIcon,
      description: knowledgeBaseDescription.trim() || undefined,
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
          knowledgeBaseNameInputRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>创建知识库</DialogTitle>
        </DialogHeader>

        <Form onSubmit={handleSubmit}>
          <Form.Field required label="知识库名称 & 图标">
            <div className="flex items-center gap-2">
              <Select
                value={knowledgeBaseIcon}
                onValueChange={(value) =>
                  setKnowledgeBaseIcon(value as (typeof knowledgeBaseIcons)[number])
                }
              >
                <SelectTrigger
                  size="sm"
                  aria-label="知识库图标"
                  className="w-11 shrink-0 justify-center rounded-lg px-2 [&>svg]:hidden"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start" className="min-w-28">
                  {knowledgeBaseIcons.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      <span className="text-base leading-none">{icon}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                ref={knowledgeBaseNameInputRef}
                value={knowledgeBaseName}
                onChange={(event) => setKnowledgeBaseName(event.target.value)}
                aria-label="知识库名称"
                autoComplete="off"
                maxLength={40}
                placeholder="输入知识库名称"
                className="bg-muted/80 focus-visible:bg-background h-8 rounded-lg border-transparent px-3 text-sm shadow-none"
              />
            </div>
          </Form.Field>

          <Form.Field label="描述">
            <Textarea
              value={knowledgeBaseDescription}
              onChange={(event) => setKnowledgeBaseDescription(event.target.value)}
              aria-label="知识库描述（可选）"
              maxLength={200}
              placeholder="输入知识库描述"
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
