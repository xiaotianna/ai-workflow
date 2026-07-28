import { Button } from '@ai-workflow/ui/components/button'
import { Plus } from 'lucide-react'

interface VariableSectionHeaderProps {
  label: string
  description?: string
  disabled?: boolean
  onAdd: () => void
}

export function VariableSectionHeader({
  label,
  description,
  disabled,
  onAdd,
}: VariableSectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-sm font-medium">{label}</h3>
        {description ? (
          <p className="text-muted-foreground mt-1 text-xs leading-4">{description}</p>
        ) : null}
      </div>
      <Button type="button" variant="secondary" size="xs" disabled={disabled} onClick={onAdd}>
        <Plus aria-hidden />
        添加变量
      </Button>
    </div>
  )
}
