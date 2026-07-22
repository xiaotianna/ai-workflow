import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ai-workflow/ui/components/dropdown-menu'
import { cn } from '@ai-workflow/ui/lib/utils'
import { CircleUserRound, Power } from 'lucide-react'

import { UserAvatar } from '@/components/user-avatar'

const displayName = 'Dify'
const email = '1402772884@qq.com'

function AccountMenuItem({
  icon: Icon,
  label,
  className,
  destructive,
}: {
  icon: typeof CircleUserRound
  label: string
  className?: string
  destructive?: boolean
}) {
  return (
    <DropdownMenuItem
      className={cn(
        destructive &&
          'text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive',
        className,
      )}
    >
      <Icon aria-hidden className={destructive ? 'text-current' : 'text-muted-foreground'} />
      <span className="min-w-0 flex-1">{label}</span>
    </DropdownMenuItem>
  )
}

export function AccountMenu() {
  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="hover:bg-muted focus-visible:bg-muted active:bg-muted aria-expanded:bg-muted flex w-fit max-w-full min-w-0 cursor-pointer items-center gap-2 rounded-full bg-transparent py-1.5 pr-3 pl-1.5 text-left outline-hidden transition-colors"
          >
            <UserAvatar username={displayName} />
            <span className="min-w-0 flex-1 truncate pl-2 text-sm font-medium">{displayName}</span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={8}
          className="w-60 gap-0 rounded-2xl p-1.5"
        >
          <div className="bg-muted/60 mb-1 flex items-start gap-2.5 rounded-xl p-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="text-muted-foreground truncate text-xs">{email}</p>
            </div>
            <UserAvatar username={displayName} className="size-9" />
          </div>

          <AccountMenuItem icon={CircleUserRound} label="账户" />

          <DropdownMenuSeparator className="my-1" />
          <AccountMenuItem icon={Power} label="登出" destructive />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
