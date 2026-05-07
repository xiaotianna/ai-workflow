import { WorkflowEdge } from './workflow-edge'
import { WorkflowNode } from './workflow-node'

export interface Workflow {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}
