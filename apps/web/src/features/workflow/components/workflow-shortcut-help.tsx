import { Tooltip } from '@/components/tooltip'
import { Button } from '@ai-workflow/ui/components/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@ai-workflow/ui/components/sheet'
import { CircleHelp } from 'lucide-react'

import { WORKFLOW_SHORTCUT_GROUPS } from '../workflow-shortcut-definitions'
import { WorkflowShortcutKeys } from './workflow-shortcut-keys'

interface WorkflowShortcutHelpProps {
  open: boolean
  disabled?: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkflowShortcutHelp({
  open,
  disabled = false,
  onOpenChange,
}: WorkflowShortcutHelpProps) {
  return (
    <Sheet open={disabled ? false : open} onOpenChange={onOpenChange}>
      <Tooltip content="快捷键">
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="查看工作流快捷键"
            className="nodrag nopan nowheel"
            disabled={disabled}
          >
            <CircleHelp className="size-4" aria-hidden />
          </Button>
        </SheetTrigger>
      </Tooltip>
      <SheetContent
        side="right"
        className="w-96! gap-0 sm:max-w-96!"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <SheetHeader className="border-border border-b pr-12">
          <SheetTitle>工作流快捷键</SheetTitle>
          <SheetDescription>焦点位于输入框或代码编辑器时，不会触发画布快捷键。</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {WORKFLOW_SHORTCUT_GROUPS.map((group) => (
              <section key={group.id} aria-labelledby={`workflow-shortcut-group-${group.id}`}>
                <h3
                  id={`workflow-shortcut-group-${group.id}`}
                  className="text-muted-foreground mb-2 text-xs font-medium"
                >
                  {group.label}
                </h3>
                <ul className="space-y-1">
                  {group.shortcuts.map((shortcut) => (
                    <li
                      key={shortcut.id}
                      className="flex min-h-9 items-center justify-between gap-4 rounded-lg px-2 py-1.5"
                    >
                      <span className="text-sm">{shortcut.label}</span>
                      <WorkflowShortcutKeys keys={shortcut.keys} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
