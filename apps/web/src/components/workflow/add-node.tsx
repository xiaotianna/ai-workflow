import type { NodeType } from '@ai-workflow/core'
import { getNodeThemeColor, NodeIcon } from '@ai-workflow/nodes-ui'
import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { Plus, Search } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useState } from 'react'

interface AddNodeProps {
  nodeTypes: readonly NodeType[]
  onAddNode: (type: string) => void
}

function getAddNodeErrorMessage(error: unknown, nodeLabel: string) {
  const prefix = `无法添加「${nodeLabel}」节点`

  if (typeof error === 'object' && error !== null && 'issues' in error) {
    const issues = (error as { issues?: unknown }).issues
    if (Array.isArray(issues)) {
      const firstMessage = issues.find(
        (issue): issue is { message: string } =>
          typeof issue === 'object' &&
          issue !== null &&
          'message' in issue &&
          typeof issue.message === 'string',
      )?.message

      if (firstMessage) return `${prefix}：${firstMessage}`
    }
  }

  return error instanceof Error && error.message
    ? `${prefix}：${error.message}`
    : `${prefix}，请稍后重试`
}

export const AddNode = ({ nodeTypes, onAddNode }: AddNodeProps) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const filteredNodeTypes = nodeTypes.filter(({ definition }) =>
    [definition.label, definition.description, definition.type].some((value) =>
      value?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
    ),
  )

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) setQuery('')
  }

  function handleSelect(type: string) {
    const nodeLabel =
      nodeTypes.find(({ definition }) => definition.type === type)?.definition.label ?? type

    try {
      onAddNode(type)
      handleOpenChange(false)
    } catch (error) {
      handleOpenChange(false)
      showToast('error', getAddNodeErrorMessage(error, nodeLabel))
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <Button type="button" size="sm">
          <Plus className="size-3.5" aria-hidden />
          添加节点
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="end"
          sideOffset={8}
          collisionPadding={8}
          aria-label="节点选择"
          className="nodrag nopan nowheel border-border bg-popover/95 text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 w-[min(21rem,calc(100vw-2rem))] origin-(--radix-popover-content-transform-origin) rounded-xl border-[0.5px] p-2 shadow-lg outline-hidden backdrop-blur-[5px] duration-100"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="relative">
            <Search
              className="text-input-placeholder pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索节点名称、描述或类型"
              aria-label="搜索节点"
              className="h-8 pr-8 pl-8"
            />
          </div>

          <ul
            aria-label="可添加节点"
            className="mt-2 grid max-h-80 grid-cols-1 gap-1 overflow-y-auto overscroll-contain sm:grid-cols-2"
          >
            {filteredNodeTypes.map(({ definition }) => (
              <li key={definition.type}>
                <button
                  type="button"
                  className="hover:bg-accent focus-visible:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left outline-hidden transition-colors"
                  onClick={() => handleSelect(definition.type)}
                >
                  <span
                    className="text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: getNodeThemeColor(definition.type) }}
                  >
                    <NodeIcon icon={definition.icon} className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium">{definition.label}</span>
                </button>
              </li>
            ))}
          </ul>

          {filteredNodeTypes.length === 0 ? (
            <div
              role="status"
              className="text-muted-foreground flex min-h-20 items-center justify-center px-4 text-center text-sm"
            >
              没有找到匹配的节点
            </div>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
