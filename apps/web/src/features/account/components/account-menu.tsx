import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ai-workflow/ui/components/dropdown-menu'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { cn } from '@ai-workflow/ui/lib/utils'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getCurrentUser, logout } from '@/api/auth'
import { UserAvatar } from '@/components/user-avatar'
import { clearAuthSession, getAuthUser, saveAuthUser, type AuthUser } from '@/features/auth'

import { EditAccountDialog } from './edit-account-dialog'
import { LogoutConfirmDialog } from './logout-confirm-dialog'

function AccountMenuItem({
  label,
  className,
  destructive,
  disabled,
  onSelect,
}: {
  label: string
  className?: string
  destructive?: boolean
  disabled?: boolean
  onSelect?: () => void
}) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        destructive &&
          'text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive',
        className,
      )}
    >
      <span className="min-w-0 flex-1">{label}</span>
    </DropdownMenuItem>
  )
}

export function AccountMenu({ className }: { className?: string }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser())
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const displayName = user?.username ?? '用户'
  const phone = user?.phone ?? '正在获取用户信息…'

  useEffect(() => {
    const controller = new AbortController()
    let isActive = true

    void getCurrentUser(controller.signal)
      .then((currentUser) => {
        if (!isActive) {
          return
        }

        setUser(currentUser)
        saveAuthUser(currentUser)
      })
      .catch(() => undefined)

    return () => {
      isActive = false
      controller.abort()
    }
  }, [])

  async function handleLogout() {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)

    try {
      await logout()
      showToast('success', '已退出登录')
    } catch {
      return
    } finally {
      clearAuthSession()
      setIsLogoutDialogOpen(false)
      setIsLoggingOut(false)
      navigate('/auth', { replace: true })
    }
  }

  function handleUserUpdated(updatedUser: AuthUser) {
    setUser(updatedUser)
    saveAuthUser(updatedUser)
  }

  return (
    <div className={cn('flex min-w-0 items-center', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="hover:bg-muted focus-visible:bg-muted active:bg-muted aria-expanded:bg-muted inline-flex w-fit max-w-full min-w-0 cursor-pointer items-center rounded-full bg-transparent py-1.5 pr-3 pl-1.5 text-left outline-hidden transition-colors"
          >
            <UserAvatar username={displayName} />
            <span className="min-w-0 truncate pl-2 text-sm font-medium">{displayName}</span>
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
              <p className="text-muted-foreground truncate text-xs">{phone}</p>
            </div>
            <UserAvatar username={displayName} className="size-9" />
          </div>

          <AccountMenuItem
            label="账户"
            disabled={!user}
            onSelect={() => setIsEditDialogOpen(true)}
          />

          <DropdownMenuSeparator className="my-1" />
          <AccountMenuItem
            label="退出登录"
            destructive
            onSelect={() => setIsLogoutDialogOpen(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {user ? (
        <EditAccountDialog
          open={isEditDialogOpen}
          user={user}
          onOpenChange={setIsEditDialogOpen}
          onUpdated={handleUserUpdated}
        />
      ) : null}
      <LogoutConfirmDialog
        open={isLogoutDialogOpen}
        isSubmitting={isLoggingOut}
        onOpenChange={setIsLogoutDialogOpen}
        onConfirm={() => void handleLogout()}
      />
    </div>
  )
}
