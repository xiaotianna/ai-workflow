export interface WorkflowVersionListItemVo {
  id: string
  version: number
  name?: string
  createdAt: Date
  createdBy?: {
    id: string
    username: string
  }
}

export interface WorkflowVersionListVo {
  items: WorkflowVersionListItemVo[]
}
