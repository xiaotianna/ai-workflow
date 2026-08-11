import type { CreatedKnowledgeApiKeyDto, KnowledgeApiKeyDto } from '@/api/knowledge-bases'
import { Button } from '@ai-workflow/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ai-workflow/ui/components/table'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { Copy, LoaderCircle, Plus, Trash2 } from 'lucide-react'

interface KnowledgeApiKeyDialogProps {
  open: boolean
  loading: boolean
  keys: readonly KnowledgeApiKeyDto[]
  creating: boolean
  revokingKeyId?: string
  revokeTarget?: KnowledgeApiKeyDto
  createdKey?: CreatedKnowledgeApiKeyDto
  onOpenChange: (open: boolean) => void
  onCreate: () => void
  onRequestRevoke: (key: KnowledgeApiKeyDto | undefined) => void
  onRevoke: () => void
  onCreatedKeyClose: () => void
}

export function KnowledgeApiKeyDialog({
  open,
  loading,
  keys,
  creating,
  revokingKeyId,
  revokeTarget,
  createdKey,
  onOpenChange,
  onCreate,
  onRequestRevoke,
  onRevoke,
  onCreatedKeyClose,
}: KnowledgeApiKeyDialogProps) {
  const pending = creating || Boolean(revokingKeyId)

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !pending && onOpenChange(nextOpen)}>
        <DialogContent className="max-w-4xl gap-6" showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>知识库 API 密钥</DialogTitle>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              完整密钥仅在创建成功时展示一次。密钥只允许检索当前知识库，请勿写入前端代码或公开仓库。
            </p>
          </DialogHeader>

          <Table aria-label="知识库 API 密钥">
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
              {loading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="text-muted-foreground h-28 text-center">
                    <LoaderCircle
                      aria-label="正在加载 API 密钥"
                      className="mx-auto size-4 animate-spin motion-reduce:animate-none"
                    />
                  </TableCell>
                </TableRow>
              ) : keys.length === 0 ? (
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
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="删除 API 密钥"
                        disabled={pending}
                        onClick={() => onRequestRevoke(key)}
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading || pending}
              onClick={onCreate}
            >
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
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(createdKey)}
        onOpenChange={(nextOpen) => !nextOpen && onCreatedKeyClose()}
      >
        <DialogContent className="max-w-2xl gap-6">
          <DialogHeader>
            <DialogTitle>保存 API 密钥</DialogTitle>
            <DialogDescription>
              请立即复制并安全保存。关闭此窗口后，完整密钥将无法再次查看。
            </DialogDescription>
          </DialogHeader>
          <div className="bg-input flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5">
            <code className="text-foreground min-w-0 flex-1 truncate font-mono text-sm">
              {createdKey?.key}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground shrink-0"
              aria-label="复制新创建的 API 密钥"
              onClick={() => void copyKey(createdKey?.key)}
            >
              <Copy aria-hidden className="size-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="confirm" size="sm" onClick={onCreatedKeyClose}>
              已保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(revokeTarget)}
        onOpenChange={(nextOpen) => !revokingKeyId && !nextOpen && onRequestRevoke(undefined)}
      >
        <DialogContent showCloseButton={!revokingKeyId}>
          <DialogHeader>
            <DialogTitle>确认删除 API 密钥</DialogTitle>
            <DialogDescription>
              删除“{revokeTarget?.maskedKey}”后，使用此密钥的调用将立即失效且无法恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm" disabled={Boolean(revokingKeyId)}>
                取消
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={Boolean(revokingKeyId)}
              onClick={onRevoke}
            >
              {revokingKeyId ? '删除中…' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

async function copyKey(key: string | undefined): Promise<void> {
  if (!key) return
  try {
    await navigator.clipboard.writeText(key)
    showToast('success', 'API 密钥已复制')
  } catch {
    showToast('error', '复制失败，请手动保存密钥')
  }
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
