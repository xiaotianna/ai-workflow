import { Button } from '@ai-workflow/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ai-workflow/ui/components/dropdown-menu'
import { ChevronDown } from 'lucide-react'

export const Publish = () => {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" className="h-8 gap-0.5 rounded-lg pr-2 pl-3 text-[13px]">
            发布
            <ChevronDown className="size-3.5 opacity-80" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6}>
          <DropdownMenuItem>发布更新</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
