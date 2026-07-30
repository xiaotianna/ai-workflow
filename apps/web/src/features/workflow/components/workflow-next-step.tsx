import type { WorkflowCanvasNode } from '@/components/workflow/types'
import { ActionMenuContent, type ActionMenuAction } from '@/components/action-menu-content'
import { nodeRegistry, type NodeType, type WorkflowEdge } from '@ai-workflow/core'
import { getNodeThemeColor, NodeIcon } from '@ai-workflow/nodes-ui'
import { Button } from '@ai-workflow/ui/components/button'
import { DropdownMenu, DropdownMenuTrigger } from '@ai-workflow/ui/components/dropdown-menu'
import { Form } from '@ai-workflow/ui/components/form'
import { cn } from '@ai-workflow/ui/lib/utils'
import { useEdges, useNodes, type XYPosition } from '@xyflow/react'
import { Ellipsis, Plus } from 'lucide-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useRef } from 'react'

interface WorkflowNextStepProps {
  nodeId: string
  nodeType: NodeType
  className?: string
  disabled?: boolean
  open?: boolean
  onOpenChange: (open: boolean, trigger: HTMLButtonElement) => void
  canChangeNode: (nodeId: string) => boolean
  canDeleteNode: (nodeId: string) => boolean
  onChangeNode: (nodeId: string, anchorPosition?: XYPosition) => void
  onDeleteNode: (nodeId: string) => void
  onDisconnectNode: (nodeId: string) => void
  onSelectNode: (nodeId: string) => void
}

interface WorkflowNextStepNodeProps {
  node: WorkflowCanvasNode
  canChange: boolean
  canDelete: boolean
  onChange: (nodeId: string, anchorPosition?: XYPosition) => void
  onDelete: (nodeId: string) => void
  onDisconnect: (nodeId: string) => void
  onSelect: (nodeId: string) => void
}

function getDirectDownstreamNodes(
  sourceNodeId: string,
  nodes: readonly WorkflowCanvasNode[],
  edges: readonly WorkflowEdge[],
) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const visitedNodeIds = new Set<string>()

  return edges.flatMap((edge) => {
    if (edge.source !== sourceNodeId || visitedNodeIds.has(edge.target)) return []

    const targetNode = nodesById.get(edge.target)
    if (!targetNode) return []

    visitedNodeIds.add(edge.target)
    return [targetNode]
  })
}

function WorkflowNextStepNode({
  node,
  canChange,
  canDelete,
  onChange,
  onDelete,
  onDisconnect,
  onSelect,
}: WorkflowNextStepNodeProps) {
  const actionTriggerRef = useRef<HTMLButtonElement>(null)
  const definition = nodeRegistry.get(node.type)?.definition
  const label = node.data.label?.trim() || definition?.label || node.type
  const actions: readonly ActionMenuAction[] = [
    {
      id: 'change',
      label: '更改',
      disabled: !canChange,
      onSelect: () => {
        const triggerBounds = actionTriggerRef.current?.getBoundingClientRect()

        onChange(
          node.id,
          triggerBounds
            ? {
                x: triggerBounds.right,
                y: triggerBounds.top,
              }
            : undefined,
        )
      },
    },
    {
      id: 'disconnect',
      label: '断开连接',
      onSelect: () => onDisconnect(node.id),
    },
    {
      id: 'delete',
      label: '删除',
      destructive: true,
      disabled: !canDelete,
      onSelect: () => onDelete(node.id),
    },
  ]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.16 }}
      className="border-border/60 bg-background hover:border-input-focus hover:bg-muted/30 focus-within:border-input-focus focus-within:bg-muted/30 flex h-9 w-full min-w-0 items-center rounded-lg border-[0.5px] shadow-xs transition-[background-color,border-color,box-shadow]"
    >
      <Button
        type="button"
        variant="ghost"
        aria-label={`打开${label}节点配置`}
        className="h-full min-w-0 flex-1 shrink justify-start gap-2 rounded-lg px-2 text-left shadow-none hover:bg-transparent focus-visible:bg-transparent"
        onClick={() => onSelect(node.id)}
      >
        <span
          className="text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-[0.5rem] shadow-md"
          style={{ backgroundColor: getNodeThemeColor(node.type) }}
        >
          <NodeIcon icon={definition?.icon} className="size-4" aria-hidden />
        </span>
        <span className="text-foreground truncate text-sm font-medium">{label}</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={actionTriggerRef}
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label={`${label}节点的更多操作`}
            className="text-muted-foreground hover:bg-button-secondary-bg focus-visible:bg-button-secondary-bg active:bg-button-secondary-bg mr-0.5 rounded-lg"
          >
            <span className="group-hover/button:bg-button-secondary-bg-hover group-focus-visible/button:bg-button-secondary-bg-hover group-active/button:bg-button-secondary-bg-active flex size-6 items-center justify-center rounded-md transition-colors">
              <Ellipsis aria-hidden className="size-4" />
            </span>
          </Button>
        </DropdownMenuTrigger>

        <ActionMenuContent actions={actions} className="w-36" sideOffset={6} />
      </DropdownMenu>
    </motion.div>
  )
}

export function WorkflowNextStep({
  nodeId,
  nodeType,
  className,
  disabled = false,
  open = false,
  onOpenChange,
  canChangeNode,
  canDeleteNode,
  onChangeNode,
  onDeleteNode,
  onDisconnectNode,
  onSelectNode,
}: WorkflowNextStepProps) {
  const nodes = useNodes<WorkflowCanvasNode>()
  const edges = useEdges<WorkflowEdge>()
  const nextNodes = getDirectDownstreamNodes(nodeId, nodes, edges)
  const definition = nodeType.definition
  const hasNextNodes = nextNodes.length > 0
  const actionLabel = hasNextNodes
    ? '添加并行节点'
    : disabled
      ? '当前节点暂无可用输出端口'
      : '选择下一个节点'

  return (
    <div className={className}>
      <Form.Field required label="下一步">
        <div className="space-y-3">
          <p className="text-muted-foreground text-xs">添加此工作流程中的下一个节点</p>

          <div className="flex items-start">
            <div className="border-border bg-background flex size-9 shrink-0 items-center justify-center rounded-xl border-[0.5px] shadow-xs">
              <span
                className="text-primary-foreground flex size-6 items-center justify-center rounded-[0.5rem] shadow-md"
                style={{ backgroundColor: getNodeThemeColor(definition.type) }}
              >
                <NodeIcon icon={definition.icon} className="size-4" aria-hidden />
              </span>
            </div>

            <span className="bg-workflow-edge mt-[17.5px] h-px w-6 shrink-0" aria-hidden />

            <MotionConfig reducedMotion="user">
              <div
                className={cn(
                  'min-w-0 flex-1 transition-[background-color,padding]',
                  hasNextNodes && 'bg-muted/60 space-y-0.5 rounded-xl p-0.5',
                )}
              >
                <AnimatePresence initial={false}>
                  {nextNodes.map((nextNode) => (
                    <WorkflowNextStepNode
                      key={nextNode.id}
                      node={nextNode}
                      canChange={canChangeNode(nextNode.id)}
                      canDelete={canDeleteNode(nextNode.id)}
                      onChange={onChangeNode}
                      onDelete={onDeleteNode}
                      onDisconnect={onDisconnectNode}
                      onSelect={onSelectNode}
                    />
                  ))}
                </AnimatePresence>

                <motion.button
                  layout
                  type="button"
                  disabled={disabled}
                  aria-expanded={open}
                  aria-haspopup="dialog"
                  aria-label={
                    disabled && hasNextNodes
                      ? `${actionLabel}，当前节点暂无可用输出端口`
                      : actionLabel
                  }
                  title={disabled && hasNextNodes ? '当前节点暂无可用输出端口' : undefined}
                  className={cn(
                    'border-border text-input-placeholder enabled:hover:border-input-focus enabled:hover:bg-background enabled:focus-visible:border-input-focus enabled:focus-visible:bg-background aria-expanded:border-input-focus aria-expanded:bg-background flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-dashed px-2 text-left text-xs font-medium transition-[background-color,border-color,color] enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
                    hasNextNodes ? 'bg-background/40' : 'bg-muted/50',
                  )}
                  onClick={(event) => onOpenChange(!open, event.currentTarget)}
                >
                  <span className="bg-input flex size-5 shrink-0 items-center justify-center rounded-md">
                    <Plus className="size-3.5" aria-hidden />
                  </span>
                  <span className="truncate">{actionLabel}</span>
                </motion.button>
              </div>
            </MotionConfig>
          </div>
        </div>
      </Form.Field>
    </div>
  )
}
