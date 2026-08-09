import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ai-workflow/ui/components/dropdown-menu'
import { CircleHelp } from 'lucide-react'
import { Link } from 'react-router-dom'

function HelpMenuLink({ label, to }: { label: string; to: string }) {
  return (
    <DropdownMenuItem asChild>
      <Link to={to} target="_blank" rel="noreferrer">
        <span className="min-w-0 flex-1">{label}</span>
      </Link>
    </DropdownMenuItem>
  )
}

export function HelpMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="帮助与文档"
          className="hover:bg-muted focus-visible:bg-muted active:bg-muted aria-expanded:bg-muted inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-transparent outline-hidden transition-colors"
        >
          <CircleHelp aria-hidden className="text-muted-foreground size-4" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="end" sideOffset={8} className="w-44 rounded-2xl p-1.5">
        <HelpMenuLink label="工作流文档" to="/docs/ai-workflow" />
        <HelpMenuLink label="插件文档" to="/docs/plugin" />
        <DropdownMenuSeparator className="my-1" />
        <HelpMenuLink label="项目亮点文档" to="/docs/project/highlights" />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
