import { ENVIRONMENT_VARIABLE_TYPES, type WorkflowEnvironmentVariable } from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import { LockKeyhole, PencilLine, Trash2 } from 'lucide-react'

import { ENVIRONMENT_VARIABLE_TYPE_LABELS } from '../utils/workflow-variable-presentation'
import EnvIcon from './workflow-action-bar/icon/env-icon.svg'

interface WorkflowEnvironmentVariableItemProps {
  variable: WorkflowEnvironmentVariable
  onDelete: () => void
  onEdit: () => void
}

const SECRET_VALUE_MASK = '********'

function EnvironmentVariableIcon() {
  const maskImage = `url("${EnvIcon}")`

  return (
    <span
      aria-hidden
      className="inline-block size-4 shrink-0 bg-violet-600 dark:bg-violet-400"
      style={{
        WebkitMaskImage: maskImage,
        WebkitMaskPosition: 'center',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        maskImage,
        maskPosition: 'center',
        maskRepeat: 'no-repeat',
        maskSize: 'contain',
      }}
    />
  )
}

export function WorkflowEnvironmentVariableItem({
  variable,
  onDelete,
  onEdit,
}: WorkflowEnvironmentVariableItemProps) {
  const isSecret = variable.type === ENVIRONMENT_VARIABLE_TYPES.SECRET
  const displayValue = isSecret ? SECRET_VALUE_MASK : String(variable.value)
  const description = variable.description.trim()

  return (
    <div className="group bg-background border-border/60 hover:bg-input/60 overflow-hidden rounded-lg border shadow-xs transition-[background-color,box-shadow] hover:shadow-md">
      <div className="px-2.5 py-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <EnvironmentVariableIcon />
            <span
              className="text-foreground min-w-0 truncate text-sm font-medium"
              title={variable.name}
            >
              {variable.name}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs font-medium">
              {ENVIRONMENT_VARIABLE_TYPE_LABELS[variable.type]}
            </span>
            {isSecret ? (
              <LockKeyhole className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:bg-button-secondary-bg-active hover:text-foreground focus-visible:bg-button-secondary-bg-active focus-visible:text-foreground"
              aria-label={`编辑环境变量 ${variable.name}`}
              onClick={onEdit}
            >
              <PencilLine className="size-3.5" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive"
              aria-label={`删除环境变量 ${variable.name}`}
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="text-muted-foreground mt-1.5 truncate text-xs" title={displayValue}>
          {displayValue}
        </div>
      </div>

      {description ? (
        <div
          className="text-muted-foreground border-border/50 bg-muted/30 truncate border-t px-2.5 py-2 text-xs transition-colors group-hover:bg-transparent"
          title={description}
        >
          {description}
        </div>
      ) : null}
    </div>
  )
}
