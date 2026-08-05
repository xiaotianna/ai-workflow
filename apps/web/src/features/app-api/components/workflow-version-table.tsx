import type { AppApiVersionInputContractDto } from '@/api/app-api'
import { Button } from '@ai-workflow/ui/components/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ai-workflow/ui/components/table'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { Copy } from 'lucide-react'

interface WorkflowVersionTableProps {
  versions: readonly AppApiVersionInputContractDto[]
  currentVersionId?: string
}

export function WorkflowVersionTable({ versions, currentVersionId }: WorkflowVersionTableProps) {
  return (
    <section>
      <h3 id="published-versions" className="mb-2 scroll-mt-28 text-base font-semibold">
        可用版本
      </h3>
      <p className="text-muted-foreground mb-3 text-sm leading-6">
        指定版本执行时，请复制对应的 versionId。API Key 只能调用创建它的应用，不能跨应用复用。
      </p>

      <Table
        aria-label="工作流可用发布版本"
        containerClassName="max-h-72 overflow-auto"
        className="min-w-[680px] table-fixed"
      >
        <TableHeader className="bg-input sticky top-0 z-10 [&_tr]:border-0">
          <TableRow className="bg-input hover:bg-input border-0">
            <TableHead className="w-36 rounded-l-lg">版本</TableHead>
            <TableHead className="w-40">名称</TableHead>
            <TableHead>versionId</TableHead>
            <TableHead className="w-14 rounded-r-lg">
              <span className="sr-only">操作</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {versions.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="text-muted-foreground h-20 text-center">
                暂无已发布版本
              </TableCell>
            </TableRow>
          ) : (
            versions.map((version) => {
              const isCurrent = version.versionId === currentVersionId

              return (
                <TableRow key={version.versionId}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span className="font-medium">v{version.version}</span>
                      {isCurrent ? (
                        <span className="bg-success/10 text-success rounded-md px-1.5 py-0.5 text-[11px] font-medium">
                          当前
                        </span>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate">
                    {version.name ?? '未命名'}
                  </TableCell>
                  <TableCell className="font-mono text-[13px] select-text">
                    {version.versionId}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`复制 v${version.version} 的 versionId`}
                      onClick={() => void copyVersionId(version.versionId)}
                    >
                      <Copy aria-hidden className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </section>
  )
}

async function copyVersionId(versionId: string) {
  try {
    await navigator.clipboard.writeText(versionId)
    showToast('success', '已复制 versionId')
  } catch {
    showToast('error', '复制失败，请稍后重试')
  }
}
