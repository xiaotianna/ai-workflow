import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import type { FieldRendererProps } from '../registry'

export const SelectField = ({ field, onChange }: FieldRendererProps) => {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{field.label}</div>
      <Select defaultValue="banana" onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent
        // position={alignItemWithTrigger ? "item-aligned" : "popper"}
        >
          <SelectGroup>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="blueberry">Blueberry</SelectItem>
            <SelectItem value="grapes">Grapes</SelectItem>
            <SelectItem value="pineapple">Pineapple</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      {field.description && (
        <div className="text-muted-foreground text-xs">{field.description}</div>
      )}
    </div>
  )
}
