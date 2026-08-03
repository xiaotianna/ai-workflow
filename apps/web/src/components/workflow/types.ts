import type { Workflow, WorkflowNode } from '@ai-workflow/core'
import type { NodeExecutionStatus } from '@ai-workflow/nodes-ui'
import type { Node, Viewport, XYPosition } from '@xyflow/react'

// 工作流编辑器数据（分为core的运行数据，和渲染数据）
export interface WorkflowEditorSnapshot {
  /**
   * core数据（用于校验、保存和执行）
   * {
        id: 'workflow-1',
        name: '订单处理',
        nodes: [...],
        edges: [...],
     }
   */
  workflow: Workflow
  /**
   * 画布布局数据
   * {
        positions: {
            'start-1': { x: 100, y: 200 },
            'condition-1': { x: 400, y: 200 },
        },
        viewport: {
            x: 20,
            y: 40,
            zoom: 0.8,
        },
     }
   */
  layout: {
    // 'id': { x: xx, y: xx }
    positions: Record<string, XYPosition>
    viewport?: Viewport
    // 只需要保存loop容器尺寸
    sizes?: Record<string, { width: number; height: number }>
  }
}

/**
 * react-flow node节点类型扩展
 * 在传递给<ReactFlow>组件的时候，需要传递nodeTypes
 * 最终的数据结构：
{
  id: 'start-1',
  type: 'start',
  position: { x: 100, y: 100 },
  data: {
    label?: string,
    description?: string,
    config: (core node).config,
    inputs: (core node).inputs,
    outputs: (core node).outputs,
  },

  data.config => 节点定义的schema
}
 */
export interface WorkflowCanvasNodeData extends Record<string, unknown> {
  label?: WorkflowNode['label']
  description?: WorkflowNode['description']
  config: WorkflowNode['config']
  inputs: WorkflowNode['inputs']
  outputs: WorkflowNode['outputs']
  executionStatus?: NodeExecutionStatus
}

export interface WorkflowCanvasNode extends Node<WorkflowCanvasNodeData> {
  type: WorkflowNode['type']
}
