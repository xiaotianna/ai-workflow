import {
  BuiltinNodeType,
  FIELD_UI_TYPES,
  validateExecutorWorkflow,
  type FieldSchema,
  type NodeRegistryReader,
  type Workflow,
  type WorkflowNode,
  type WorkflowValidationIssue,
} from '@ai-workflow/core'

export interface WorkflowCheckListIssue {
  id: string
  message: string
  nodeId: string
  nodeLabel: string
  nodeType: string
}

export function appendWorkflowNodeDraftValidationIssues(
  issues: readonly WorkflowCheckListIssue[],
  node: WorkflowNode | undefined,
  messages: readonly string[],
  nodeRegistry: NodeRegistryReader,
): readonly WorkflowCheckListIssue[] {
  if (!node || messages.length === 0) return issues

  const existingMessages = new Set(
    issues.filter((issue) => issue.nodeId === node.id).map((issue) => issue.message),
  )
  const nodeLabel = node.label?.trim() || nodeRegistry.get(node.type)?.definition.label || node.type
  const draftIssues = messages.flatMap((message, index) => {
    if (existingMessages.has(message)) return []

    existingMessages.add(message)
    return [
      {
        id: `${node.id}-draft-${index}`,
        message,
        nodeId: node.id,
        nodeLabel,
        nodeType: node.type,
      },
    ]
  })

  return [...issues, ...draftIssues]
}

interface PendingCheckListIssue {
  message: string
  node: WorkflowNode
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isRequiredFieldEmpty(field: FieldSchema, value: unknown) {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') {
    return value.trim().length === 0
  }
  if (Array.isArray(value)) return value.length === 0

  if (field.ui === FIELD_UI_TYPES.LLM_MODEL) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return true

    const model = value as Record<string, unknown>
    return !isNonEmptyString(model.groupId) || !isNonEmptyString(model.configuredModelId)
  }

  if (field.ui === FIELD_UI_TYPES.SUB_WORKFLOW) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return true

    const workflow = value as Record<string, unknown>
    return !isNonEmptyString(workflow.id)
  }

  return false
}

function getConfigIssueMessage(
  node: WorkflowNode,
  issue: { message: string; path: PropertyKey[] },
  nodeRegistry: NodeRegistryReader,
) {
  const nodeType = nodeRegistry.get(node.type)
  const fieldName = typeof issue.path[0] === 'string' ? issue.path[0] : undefined
  const fieldLabel = fieldName ? nodeType?.form?.[fieldName]?.label : undefined

  if (!fieldLabel || issue.message.includes(fieldLabel)) return issue.message
  return `${fieldLabel}：${issue.message}`
}

function getValidationIssueNodeId(issue: WorkflowValidationIssue, workflow: Workflow) {
  if (issue.scope === 'node') return issue.nodeId
  if (issue.scope !== 'edge') return undefined
  if (issue.nodeId) return issue.nodeId

  const edge = workflow.edges.find((candidate) => candidate.id === issue.edgeId)
  return edge?.target ?? edge?.source
}

function getValidationIssueMessage(
  issue: WorkflowValidationIssue,
  node: WorkflowNode,
  nodeRegistry: NodeRegistryReader,
) {
  if (issue.scope === 'workflow') return issue.message

  if (issue.portId && issue.message.startsWith('必填输入端口尚未连接')) {
    const portLabel = nodeRegistry.get(node.type)?.definition.ports.inputs[issue.portId]?.label
    return `${portLabel ?? issue.portId}尚未连接`
  }

  return issue.message
}

function collectNodeConfigIssues(node: WorkflowNode, nodeRegistry: NodeRegistryReader) {
  const nodeType = nodeRegistry.get(node.type)
  if (!nodeType) return []

  const issues: string[] = []
  const emptyRequiredFieldNames = new Set<string>()

  for (const [fieldName, field] of Object.entries(nodeType.form ?? {})) {
    const value = node.config[fieldName]

    if (field.ui === FIELD_UI_TYPES.CONDITION_BRANCHES && Array.isArray(value)) {
      for (const branch of value) {
        if (typeof branch !== 'object' || branch === null || Array.isArray(branch)) continue

        const condition = branch as Record<string, unknown>
        if (condition.isFallback === true) continue
        if (Array.isArray(condition.rules) && condition.rules.length > 0) continue

        const conditionLabel = isNonEmptyString(condition.conditionLabel)
          ? condition.conditionLabel
          : field.label
        issues.push(`${conditionLabel}不能为空`)
      }
    }

    if (field.required === true && isRequiredFieldEmpty(field, value)) {
      emptyRequiredFieldNames.add(fieldName)
      issues.push(`${field.label}不能为空`)
    }
  }

  const parsedConfig = nodeType.schema.safeParse(node.config)
  if (!parsedConfig.success) {
    for (const issue of parsedConfig.error.issues) {
      const fieldName = typeof issue.path[0] === 'string' ? issue.path[0] : undefined
      if (fieldName && emptyRequiredFieldNames.has(fieldName)) continue

      issues.push(getConfigIssueMessage(node, issue, nodeRegistry))
    }
  }

  if (node.type === BuiltinNodeType.END && Object.keys(node.inputs).length === 0) {
    issues.push('输出变量不能为空')
  }

  return issues
}

/** 根据当前 Core 工作流数据派生检查清单；调用方负责按工作流引用缓存计算结果。 */
export function createWorkflowCheckListIssues(
  workflow: Workflow,
  nodeRegistry: NodeRegistryReader,
): WorkflowCheckListIssue[] {
  const nodeById = new Map(workflow.nodes.map((node) => [node.id, node]))
  const pendingIssues: PendingCheckListIssue[] = []
  const issueKeys = new Set<string>()

  function appendIssue(node: WorkflowNode, message: string) {
    const issueKey = `${node.id}:${message}`
    if (issueKeys.has(issueKey)) return

    issueKeys.add(issueKey)
    pendingIssues.push({ message, node })
  }

  for (const node of workflow.nodes) {
    for (const message of collectNodeConfigIssues(node, nodeRegistry)) {
      appendIssue(node, message)
    }
  }

  for (const issue of validateExecutorWorkflow(workflow, nodeRegistry)) {
    if (issue.scope === 'node' && issue.field === 'config') continue

    const nodeId = getValidationIssueNodeId(issue, workflow)
    const node = nodeId ? nodeById.get(nodeId) : undefined
    if (!node) continue

    appendIssue(node, getValidationIssueMessage(issue, node, nodeRegistry))
  }

  return pendingIssues.map(({ message, node }, index) => ({
    id: `${node.id}-${index}`,
    message,
    nodeId: node.id,
    nodeLabel: node.label?.trim() || nodeRegistry.get(node.type)?.definition.label || node.type,
    nodeType: node.type,
  }))
}
