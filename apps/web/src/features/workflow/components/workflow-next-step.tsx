import type { WorkflowCanvasNode } from '@/components/workflow/types'
import { ActionMenuContent, type ActionMenuAction } from '@/components/action-menu-content'
import {
  ERROR_HANDLING_PORT_ID,
  getNodePorts,
  type NodeType,
  type WorkflowEdge,
} from '@ai-workflow/core'
import { NodeIconBadge } from '@ai-workflow/nodes-ui'
import { Button } from '@ai-workflow/ui/components/button'
import { DropdownMenu, DropdownMenuTrigger } from '@ai-workflow/ui/components/dropdown-menu'
import { Form } from '@ai-workflow/ui/components/form'
import { cn } from '@ai-workflow/ui/lib/utils'
import { useEdges, useNodes, type XYPosition } from '@xyflow/react'
import { Ellipsis, Plus } from 'lucide-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useRef } from 'react'
import { useWorkflowCatalog } from '../catalog/workflow-web-catalog'

interface WorkflowNextStepProps {
  nodeId: string
  nodeType: NodeType
  className?: string
  disabled?: boolean
  errorBranchDisabled?: boolean
  errorBranchOpen?: boolean
  open?: boolean
  onOpenChange: (open: boolean, trigger: HTMLButtonElement, sourceHandle?: string) => void
  canChangeNode: (nodeId: string, sourceHandle?: string) => boolean
  canDeleteNode: (nodeId: string) => boolean
  onChangeNode: (nodeId: string, anchorPosition?: XYPosition, sourceHandle?: string) => void
  onDeleteNode: (nodeId: string) => void
  onDisconnectNode: (nodeId: string, sourceHandle?: string) => void
  onSelectNode: (nodeId: string) => void
}

interface WorkflowNextStepNodeProps {
  node: WorkflowCanvasNode
  sourceHandle?: string
  canChange: boolean
  canDelete: boolean
  onChange: (nodeId: string, anchorPosition?: XYPosition, sourceHandle?: string) => void
  onDelete: (nodeId: string) => void
  onDisconnect: (nodeId: string, sourceHandle?: string) => void
  onSelect: (nodeId: string) => void
}

interface WorkflowNextStepAddButtonProps {
  disabled: boolean
  hasNodes: boolean
  label: string
  open: boolean
  disabledReason?: string
  onOpenChange: (trigger: HTMLButtonElement) => void
}

function getDirectDownstreamNodes(
  sourceNodeId: string,
  sourceHandleIds: ReadonlySet<string>,
  nodes: readonly WorkflowCanvasNode[],
  edges: readonly WorkflowEdge[],
) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const visitedNodeIds = new Set<string>()

  return edges.flatMap((edge) => {
    if (
      edge.source !== sourceNodeId ||
      !sourceHandleIds.has(edge.sourceHandle) ||
      visitedNodeIds.has(edge.target)
    ) {
      return []
    }

    const targetNode = nodesById.get(edge.target)
    if (!targetNode) return []

    visitedNodeIds.add(edge.target)
    return [targetNode]
  })
}

function WorkflowNextStepNode({
  node,
  sourceHandle,
  canChange,
  canDelete,
  onChange,
  onDelete,
  onDisconnect,
  onSelect,
}: WorkflowNextStepNodeProps) {
  const { nodeRegistry } = useWorkflowCatalog()
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
          sourceHandle,
        )
      },
    },
    {
      id: 'disconnect',
      label: '断开连接',
      onSelect: () => onDisconnect(node.id, sourceHandle),
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
      className="group/next-step-node border-border/60 bg-background hover:border-input-focus hover:bg-muted/30 focus-within:border-input-focus flex h-9 w-full min-w-0 items-center rounded-lg border-[0.5px] shadow-xs transition-[background-color,border-color,box-shadow]"
    >
      <Button
        type="button"
        variant="ghost"
        aria-label={`打开${label}节点配置`}
        className="h-full min-w-0 flex-1 shrink justify-start gap-2 rounded-lg px-2 text-left shadow-none hover:bg-transparent focus-visible:bg-transparent"
        onClick={() => onSelect(node.id)}
      >
        <NodeIconBadge
          type={node.type}
          icon={definition?.icon}
          className="rounded-[0.5rem] shadow-md"
        />
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
            className="text-muted-foreground hover:bg-button-secondary-bg focus-visible:bg-button-secondary-bg active:bg-button-secondary-bg pointer-events-none invisible mr-0.5 rounded-lg opacity-0 transition-opacity group-hover/next-step-node:pointer-events-auto group-hover/next-step-node:visible group-hover/next-step-node:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:visible data-[state=open]:opacity-100"
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

function WorkflowNextStepAddButton({
  disabled,
  hasNodes,
  label,
  open,
  disabledReason,
  onOpenChange,
}: WorkflowNextStepAddButtonProps) {
  return (
    <motion.button
      layout
      type="button"
      disabled={disabled}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={disabledReason ? `${label}，${disabledReason}` : label}
      title={disabledReason}
      className={cn(
        'border-border text-input-placeholder enabled:hover:border-input-focus enabled:hover:bg-background enabled:focus-visible:border-input-focus enabled:focus-visible:bg-background aria-expanded:border-input-focus aria-expanded:bg-background flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-dashed px-2 text-left text-xs font-medium transition-[background-color,border-color,color] enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
        hasNodes ? 'bg-background/40' : 'bg-muted/50',
      )}
      onClick={(event) => onOpenChange(event.currentTarget)}
    >
      <span className="bg-input flex size-5 shrink-0 items-center justify-center rounded-md">
        <Plus className="size-3.5" aria-hidden />
      </span>
      <span className="truncate">{label}</span>
    </motion.button>
  )
}

export function WorkflowNextStep({
  nodeId,
  nodeType,
  className,
  disabled = false,
  errorBranchDisabled = false,
  errorBranchOpen = false,
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
  const sourceNode = nodes.find((node) => node.id === nodeId)
  const parsedConfig = sourceNode ? nodeType.schema.safeParse(sourceNode.data.config) : undefined
  const outputPorts =
    parsedConfig?.success === true ? getNodePorts(nodeType, parsedConfig.data).outputs : {}
  const regularOutputPortIds = new Set(
    Object.keys(outputPorts).filter((portId) => portId !== ERROR_HANDLING_PORT_ID),
  )
  const hasErrorBranch = Boolean(outputPorts[ERROR_HANDLING_PORT_ID])
  const nextNodes = getDirectDownstreamNodes(nodeId, regularOutputPortIds, nodes, edges)
  const errorBranchNodes = hasErrorBranch
    ? getDirectDownstreamNodes(nodeId, new Set([ERROR_HANDLING_PORT_ID]), nodes, edges)
    : []
  const definition = nodeType.definition
  const hasNextNodes = nextNodes.length > 0
  const actionLabel = hasNextNodes
    ? '添加并行节点'
    : disabled
      ? '当前节点暂无可用输出端口'
      : '选择下一个节点'
  const hasErrorBranchNodes = errorBranchNodes.length > 0
  const errorBranchActionLabel = hasErrorBranchNodes ? '添加并行节点' : '添加异常分支'

  return (
    <div className={className}>
      <Form.Field required label="下一步">
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">添加此工作流程中的下一个节点</p>

          <div className="flex items-start">
            <NodeIconBadge
              type={definition.type}
              icon={definition.icon}
              className="rounded-[0.5rem] shadow-md"
            />

            <span className="bg-workflow-edge mt-[11.5px] h-px w-6 shrink-0" aria-hidden />

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

                <WorkflowNextStepAddButton
                  disabled={disabled}
                  hasNodes={hasNextNodes}
                  label={actionLabel}
                  open={open}
                  disabledReason={disabled && hasNextNodes ? '当前节点暂无可用输出端口' : undefined}
                  onOpenChange={(trigger) => onOpenChange(!open, trigger)}
                />
              </div>
            </MotionConfig>
          </div>

          {hasErrorBranch ? (
            <div className="border-warning/30 ml-15 rounded-xl border-[0.5px] bg-[#fffaeb] p-0.5">
              <div className="px-2.5 py-1 text-[11px] leading-4 font-semibold text-[#dc6803]">
                异常时
              </div>

              <MotionConfig reducedMotion="user">
                <div
                  className={cn(
                    'min-w-0 transition-[background-color,padding]',
                    hasErrorBranchNodes && 'space-y-0.5',
                  )}
                >
                  <AnimatePresence initial={false}>
                    {errorBranchNodes.map((nextNode) => (
                      <WorkflowNextStepNode
                        key={nextNode.id}
                        node={nextNode}
                        sourceHandle={ERROR_HANDLING_PORT_ID}
                        canChange={canChangeNode(nextNode.id, ERROR_HANDLING_PORT_ID)}
                        canDelete={canDeleteNode(nextNode.id)}
                        onChange={onChangeNode}
                        onDelete={onDeleteNode}
                        onDisconnect={onDisconnectNode}
                        onSelect={onSelectNode}
                      />
                    ))}
                  </AnimatePresence>

                  <WorkflowNextStepAddButton
                    disabled={errorBranchDisabled}
                    hasNodes={hasErrorBranchNodes}
                    label={errorBranchActionLabel}
                    open={errorBranchOpen}
                    onOpenChange={(trigger) =>
                      onOpenChange(!errorBranchOpen, trigger, ERROR_HANDLING_PORT_ID)
                    }
                  />
                </div>
              </MotionConfig>
            </div>
          ) : null}
        </div>
      </Form.Field>
    </div>
  )
}
