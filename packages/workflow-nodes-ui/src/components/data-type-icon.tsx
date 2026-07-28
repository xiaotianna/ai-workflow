import { DataType } from '@ai-workflow/core'
import { Braces, Hash, SquareCheck, TypeOutline, type LucideIcon } from 'lucide-react'

const DATA_TYPE_ICONS = {
  string: TypeOutline,
  number: Hash,
  boolean: SquareCheck,
  json: Braces,
} satisfies Record<DataType, LucideIcon>

export function DataTypeIcon({ dataType }: { dataType: DataType }) {
  const Icon = DATA_TYPE_ICONS[dataType]

  return <Icon className="size-3.5 shrink-0" aria-hidden />
}
