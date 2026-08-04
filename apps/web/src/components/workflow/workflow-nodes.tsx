import { useStore, type NodeProps, type NodeTypes, type ReactFlowState } from '@xyflow/react'
import type { WorkflowCanvasNode } from './types'
import {
  createBuiltinNodeUIRegistry,
  RenderNode,
  type ModelReferenceDisplayResolver,
} from '@ai-workflow/nodes-ui'
import {
  BuiltinNodeType,
  ENVIRONMENT_VARIABLE_NAMESPACE,
  nodeRegistry,
  type VariableReference,
  type WorkflowEnvironmentVariable,
} from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import { cn } from '@ai-workflow/ui/lib/utils'
import { Ellipsis } from 'lucide-react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { getWorkflowNodeDisplayLabel } from '@/utils/workflow/node-display'
import { WorkflowNodeHandle } from './workflow-node-handle'
import { useWorkflowLoopEditorContext } from './workflow-loop-editor-context'
import { LoopNodeResizeControl } from './loop-node-resize-control'
import { useWorkflowEnvironmentVariables } from './workflow-environment-variables-context'
import { modelProviderStrategies } from '@/features/models'

const nodeUIRegistry = createBuiltinNodeUIRegistry(nodeRegistry)
const EMPTY_NODE_DISPLAY_LABELS: ReadonlyMap<string, string> = new Map()

const resolvePersistedModelReferenceDisplay: ModelReferenceDisplayResolver = (reference) => {
  const modelName = reference.modelName?.trim() || reference.modelId?.trim()
  if (!modelName) return undefined

  const providerStrategy = modelProviderStrategies.find(
    (strategy) => strategy.type === reference.providerType,
  )
  const ProviderIcon = providerStrategy?.icon

  return {
    groupName: reference.groupName?.trim() ?? '',
    modelName,
    providerIcon: ProviderIcon ? <ProviderIcon aria-hidden /> : null,
  }
}

function selectNodeDisplayLabels(state: ReactFlowState): ReadonlyMap<string, string> {
  return new Map(
    state.nodes.map((node) => [
      node.id,
      getWorkflowNodeDisplayLabel({
        type: node.type ?? node.id,
        label: typeof node.data.label === 'string' ? node.data.label : undefined,
      }),
    ]),
  )
}

function nodeDisplayLabelsEqual(
  left: ReadonlyMap<string, string>,
  right: ReadonlyMap<string, string>,
) {
  if (left.size !== right.size) return false

  for (const [nodeId, label] of left) {
    if (right.get(nodeId) !== label) return false
  }

  return true
}

function resolveVariableReferenceDisplay(
  reference: VariableReference,
  nodeDisplayLabels: ReadonlyMap<string, string>,
  environmentVariables: readonly WorkflowEnvironmentVariable[],
) {
  const path = reference.path.length > 0 ? `.${reference.path.join('.')}` : ''

  if (reference.scope === ENVIRONMENT_VARIABLE_NAMESPACE) {
    const variable = environmentVariables.find((candidate) => candidate.id === reference.variableId)
    if (!variable) return undefined

    return {
      sourceLabel: ENVIRONMENT_VARIABLE_NAMESPACE,
      variableName: `${variable.name}${path}`,
    }
  }

  if (reference.scope !== 'node') return undefined

  const sourceLabel = nodeDisplayLabels.get(reference.nodeId)
  if (!sourceLabel) return undefined

  return {
    sourceLabel,
    variableName: `${reference.outputKey}${path}`,
  }
}

interface WorkflowNodeActionTriggerProps {
  selected: boolean
}

function openNodeContextMenu(event: ReactMouseEvent<HTMLButtonElement>) {
  event.stopPropagation()

  const nodeElement = event.currentTarget.closest('.react-flow__node')
  const triggerBounds = event.currentTarget.getBoundingClientRect()

  nodeElement?.dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      button: 2,
      buttons: 2,
      cancelable: true,
      clientX: triggerBounds.right,
      clientY: triggerBounds.bottom,
    }),
  )
}

function WorkflowNodeActionTrigger({ selected }: WorkflowNodeActionTriggerProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute right-1 bottom-full z-10 pb-1 opacity-0 transition-opacity',
        'group-focus-within/workflow-node:pointer-events-auto group-focus-within/workflow-node:opacity-100 group-hover/workflow-node:pointer-events-auto group-hover/workflow-node:opacity-100',
        selected && 'pointer-events-auto opacity-100',
      )}
    >
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        aria-haspopup="menu"
        aria-label="打开节点操作"
        className="nodrag nopan nowheel text-muted-foreground hover:bg-button-secondary-bg focus-visible:bg-button-secondary-bg active:bg-button-secondary-bg rounded-lg"
        onClick={openNodeContextMenu}
        onDoubleClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span className="group-hover/button:bg-button-secondary-bg-hover group-focus-visible/button:bg-button-secondary-bg-hover group-active/button:bg-button-secondary-bg-active flex size-6 items-center justify-center rounded-md transition-colors">
          <Ellipsis aria-hidden className="size-4" />
        </span>
      </Button>
    </div>
  )
}

const WorkflowNode = (props: NodeProps<WorkflowCanvasNode>) => {
  const { data, id, parentId, selected, type } = props
  const { addNodeToLoop, availableNodeTypes, disabled } = useWorkflowLoopEditorContext()
  const environmentVariables = useWorkflowEnvironmentVariables()
  const nodeDisplayLabels = useStore(
    (state) =>
      type === BuiltinNodeType.CONDITION
        ? selectNodeDisplayLabels(state)
        : EMPTY_NODE_DISPLAY_LABELS,
    nodeDisplayLabelsEqual,
  )

  return (
    <div
      className={cn('group/workflow-node relative', type === BuiltinNodeType.LOOP && 'size-full')}
    >
      <RenderNode
        node={{
          id,
          type,
          ...(data.label !== undefined ? { label: data.label } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          config: data.config,
          inputs: data.inputs,
          outputs: data.outputs,
          parentId,
        }}
        nodeRegistry={nodeRegistry}
        uiRegistry={nodeUIRegistry}
        selected={selected}
        disabled={disabled}
        renderPort={(portProps) => <WorkflowNodeHandle {...portProps} />}
        resolveVariableReferenceDisplay={
          type === BuiltinNodeType.CONDITION
            ? (reference) =>
                resolveVariableReferenceDisplay(reference, nodeDisplayLabels, environmentVariables)
            : undefined
        }
        resolveModelReferenceDisplay={
          type === BuiltinNodeType.LLM ? resolvePersistedModelReferenceDisplay : undefined
        }
        dragHandleClassName="drag-handle"
        executionStatus={data.executionStatus}
        executionProgress={data.executionProgress}
        editorCapabilities={
          disabled
            ? undefined
            : {
                [BuiltinNodeType.LOOP]: {
                  addChildNode: {
                    nodeTypes: availableNodeTypes,
                    onAddNode: (parentNodeId, childType) => addNodeToLoop(childType, parentNodeId),
                  },
                  resizeControl: <LoopNodeResizeControl />,
                },
              }
        }
      />
      {disabled ? null : <WorkflowNodeActionTrigger selected={selected} />}
    </div>
  )
}

// 动态注册react flow需要的node节点（nodeTypes）
export const workflowNodeTypes = nodeRegistry.list().reduce<NodeTypes>((nodeTypes, nodeType) => {
  nodeTypes[nodeType.definition.type] = WorkflowNode
  return nodeTypes
}, {})
