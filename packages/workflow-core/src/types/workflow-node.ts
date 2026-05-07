import type { InputValue } from './input-value'

export interface WorkflowNode {
  id: string

  type: string

  position?: {
    x: number
    y: number
  }

  data: Record<string, InputValue>
}
