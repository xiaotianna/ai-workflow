import type { AppApiKeyDto } from '@/api/app-api'
import { Button } from '@ai-workflow/ui/components/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ai-workflow/ui/components/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ai-workflow/ui/components/table'
import { LoaderCircle, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

interface ApiKeyDialogProps {
  children?: ReactNode
  open: boolean
  keys: readonly AppApiKeyDto[]
  creating: boolean
  revokingKeyId?: string
  onOpenChange: (open: boolean) => void
  onCreate: () => void
  onRevoke: (apiKeyId: string) => void
}

export function ApiKeyDialog({
  children,
  open,
  keys,
  creating,
  revokingKeyId,
  onOpenChange,
  onCreate,
  onRevoke,
}: ApiKeyDialogProps) {
  const pending = creating || Boolean(revokingKeyId)

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !pending && onOpenChange(nextOpen)}>
      <DialogContent className="max-w-4xl gap-6" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>API 密钥</DialogTitle>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            请妥善保管 API Key。列表只显示不可复制的掩码，完整密钥仅在创建成功时展示一次。
          </p>
        </DialogHeader>

        <Table aria-label="应用 API 密钥">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>密钥</TableHead>
              <TableHead className="w-[190px]">创建时间</TableHead>
              <TableHead className="w-[190px]">最后使用</TableHead>
              <TableHead className="w-14">
                <span className="sr-only">操作</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="text-muted-foreground h-28 text-center">
                  暂无 API 密钥
                </TableCell>
              </TableRow>
            ) : (
              keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-mono text-[13px] select-none">
                    {key.maskedKey}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatDateTime(key.createdAt)}</TableCell>
                  <TableCell className="tabular-nums">
                    {key.lastUsedAt ? formatDateTime(key.lastUsedAt) : '从未'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive"
                      aria-label="删除 API 密钥"
                      disabled={pending}
                      onClick={() => onRevoke(key.id)}
                    >
                      {revokingKeyId === key.id ? (
                        <LoaderCircle
                          aria-hidden
                          className="size-3.5 animate-spin motion-reduce:animate-none"
                        />
                      ) : (
                        <Trash2 aria-hidden className="size-3.5" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div>
          <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={onCreate}>
            {creating ? (
              <LoaderCircle
                aria-hidden
                data-icon="inline-start"
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Plus aria-hidden data-icon="inline-start" />
            )}
            {creating ? '生成中...' : '创建密钥'}
          </Button>
        </div>

        {children}
      </DialogContent>
    </Dialog>
  )
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replaceAll('/', '-')
}
