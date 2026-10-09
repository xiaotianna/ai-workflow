import {
  AGENT_TOOL_NAMES,
  AGENT_MAX_TOOL_RESULT_BYTES,
  agentToolInputSchemas,
  agentValidationSchema,
  maskAgentWorkflow,
  projectAgentData,
  type AgentToolDisplay,
  type AgentToolName,
} from '@ai-workflow/agent-protocol'
import type { AgentTool } from '@earendil-works/pi-agent-core'
import { Type } from 'typebox'
import { z } from 'zod'
import type { ToolContext } from '../tool-context.js'

const descriptions: Record<AgentToolName, string> = {
  read_canvas:
    '读取当前候选或本轮基线画布。nodeIds 可聚焦节点和邻接连线；返回完整领域定义，不含布局。',
  list_node_types: '搜索应用可用节点类型。plugins 由 Runtime 按当前候选注入。',
  get_node_type: '读取节点初始配置、输入输出、表单和端口。可提供 config 获取动态端口。',
  inspect_project_resources: '读取当前用户的模型、知识库、已发布子工作流或当前应用公开摘要。',
  list_workflow_runs: '读取当前应用最近运行记录，可按状态、触发方式、时间和搜索词筛选。',
  get_workflow_run: '读取当前应用某次运行的输入、输出、错误和节点追踪，大字段会脱敏和截断。',
  validate_workflow: '用 Server 的 Catalog、Core 保存和执行校验检查完整 Workflow。',
  set_canvas_candidate:
    '提交完整 Workflow 候选；只有 Server 校验全部通过才替换内存候选。不保存、不执行。',
}

export function projectToolArgs(name: string, raw: unknown): AgentToolDisplay {
  if (!AGENT_TOOL_NAMES.includes(name as AgentToolName)) return { summary: '未知工具' }
  const parsed = agentToolInputSchemas[name as AgentToolName].safeParse(raw)
  if (!parsed.success) return { summary: '正在校验工具参数' }
  const input = parsed.data,
    fields: Record<string, string | number | boolean> = {}
  for (const key of [
    'source',
    'type',
    'resource',
    'limit',
    'status',
    'trigger',
    'runId',
    'search',
    'from',
  ] as const) {
    if (key in input) {
      const value = (input as Record<string, unknown>)[key]
      if (typeof value === 'string' || typeof value === 'number') fields[key] = value
    }
  }
  if ('nodeIds' in input && input.nodeIds) fields.nodeCount = input.nodeIds.length
  if ('workflow' in input) fields.nodeCount = input.workflow.nodes.length
  const projected = projectAgentData(
    'workflow' in input ? { ...input, workflow: maskAgentWorkflow(input.workflow) } : input,
  )
  return { summary: descriptions[name as AgentToolName].split('。')[0]!, fields, ...projected }
}

export function projectToolResult(name: AgentToolName, raw: unknown): AgentToolDisplay {
  const projected = projectAgentData(raw),
    value = projected.data,
    wrapped = value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {},
    data = wrapped.truncated && 'data' in wrapped ? wrapped.data : value,
    result = data !== null && typeof data === 'object' && !Array.isArray(data) ? data : {},
    items = Array.isArray(data) ? data : Array.isArray(result.items) ? result.items : [],
    count = Array.isArray(result.nodes) ? result.nodes.length : 0
  let summary: string
  switch (name) {
    case 'read_canvas': {
      summary = `已读取 ${count} 个节点、${Array.isArray(result.edges) ? result.edges.length : 0} 条连线`
      break
    }
    case 'list_node_types': {
      summary = `找到 ${count} 种节点类型`
      break
    }
    case 'get_node_type': {
      summary = `已读取节点定义：${result.label ?? result.type}`
      break
    }
    case 'inspect_project_resources': {
      summary = 'name' in result ? `已读取应用：${result.name}` : `找到 ${items.length} 项项目资源`
      break
    }
    case 'list_workflow_runs': {
      summary = `找到 ${items.length} 条运行记录`
      break
    }
    case 'get_workflow_run': {
      summary = `运行状态：${result.status ?? '未知'} · ${Array.isArray(result.nodeRuns) ? result.nodeRuns.length : 0} 条节点追踪`
      break
    }
    case 'validate_workflow':
    case 'set_canvas_candidate': {
      summary = result.valid
        ? name === 'set_canvas_candidate'
          ? `候选已校验：${result.nodeCount} 个节点、${result.edgeCount} 条连线`
          : '工作流校验通过'
        : `校验未通过：${Array.isArray(result.issues) ? result.issues.length : 0} 项问题`
      break
    }
  }
  const truncated = projected.truncated || wrapped.truncated === true
  if (typeof result.summary === 'string') summary = result.summary
  return {
    ...projected,
    truncated,
    summary: `${summary}${truncated ? '（结果已截断）' : ''}`.slice(0, 1000),
  }
}

export function createTools(context: ToolContext): AgentTool[] {
  return AGENT_TOOL_NAMES.map((name): AgentTool => {
    const schema = agentToolInputSchemas[name]
    return {
      name,
      label: name,
      description: descriptions[name],
      executionMode: 'sequential',
      parameters: Type.Unsafe(z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' })),
      async execute(_callId, raw, signal) {
        try {
          signal?.throwIfAborted()
          if (Buffer.byteLength(JSON.stringify(raw)) > 1_048_576)
            throw new Error('工具输入超过大小限制')
          const input = schema.parse(raw)
          let data: unknown
          if (name === 'read_canvas') {
            const options = agentToolInputSchemas.read_canvas.parse(input),
              workflow =
                options.source === 'baseline'
                  ? context.baselineSnapshot.workflow
                  : context.workingCandidate,
              nodeIds = options.nodeIds ? new Set(options.nodeIds) : undefined
            if (
              nodeIds &&
              [...nodeIds].some((nodeId) => !workflow.nodes.some((node) => node.id === nodeId))
            )
              throw new Error('节点不属于当前画布')
            data = maskAgentWorkflow(
              nodeIds
                ? {
                    ...workflow,
                    nodes: workflow.nodes.filter((node) => nodeIds.has(node.id)),
                    edges: workflow.edges.filter(
                      (edge) => nodeIds.has(edge.source) || nodeIds.has(edge.target),
                    ),
                  }
                : workflow,
            )
          } else if (name === 'set_canvas_candidate' || name === 'validate_workflow') {
            const { workflow } = agentToolInputSchemas[name].parse(input)
            if (workflow.id !== context.baselineSnapshot.workflow.id)
              throw new Error('候选工作流 ID 与当前应用不一致')
            const result = agentValidationSchema.parse(
              await context.server(
                { tool: 'validate_workflow', input: { workflow: maskAgentWorkflow(workflow) } },
                signal,
              ),
            )
            data = result
            if (name === 'set_canvas_candidate') {
              if (!result.valid || !result.workflow)
                return {
                  content: [{ type: 'text', text: JSON.stringify(result) }],
                  details: { displayResult: projectToolResult(name, result) },
                  isError: true,
                }
              signal?.throwIfAborted()
              context.workingCandidate = result.workflow
              context.candidateChanged = true
              context.emit({
                type: 'candidate_ready',
                baseSnapshotHash: context.baseSnapshotHash,
                workflow: context.workingCandidate,
              })
              data = {
                valid: true,
                nodeCount: context.workingCandidate.nodes.length,
                edgeCount: context.workingCandidate.edges.length,
                outputCount: context.workingCandidate.outputs.length,
              }
            }
          } else if (name === 'list_node_types') {
            const options = agentToolInputSchemas.list_node_types.parse(input)
            data = await context.server(
              { tool: name, input: { ...options, plugins: context.workingCandidate.plugins } },
              signal,
            )
          } else if (name === 'get_node_type') {
            const options = agentToolInputSchemas.get_node_type.parse(input)
            data = await context.server(
              { tool: name, input: { ...options, plugins: context.workingCandidate.plugins } },
              signal,
            )
          } else if (name === 'inspect_project_resources') {
            data = await context.server(
              { tool: name, input: agentToolInputSchemas[name].parse(input) },
              signal,
            )
          } else if (name === 'list_workflow_runs') {
            data = await context.server(
              { tool: name, input: agentToolInputSchemas[name].parse(input) },
              signal,
            )
          } else {
            data = await context.server(
              {
                tool: 'get_workflow_run',
                input: agentToolInputSchemas.get_workflow_run.parse(input),
              },
              signal,
            )
          }
          const text = JSON.stringify(data)
          if (Buffer.byteLength(text) > AGENT_MAX_TOOL_RESULT_BYTES)
            throw new Error('工具结果超过大小限制，请聚焦更少节点或缩小查询范围')
          return {
            content: [{ type: 'text', text }],
            details: { displayResult: projectToolResult(name, data) },
            ...(name === 'validate_workflow' && !agentValidationSchema.parse(data).valid
              ? { isError: true }
              : {}),
          }
        } catch (error) {
          const message = signal?.aborted
            ? '工具已停止'
            : error instanceof z.ZodError
              ? '工具输入格式无效'
              : error instanceof Error
                ? error.message.slice(0, 500)
                : '工具执行失败'
          return {
            content: [{ type: 'text', text: message }],
            details: { summary: message },
            isError: true,
          }
        }
      },
    }
  })
}
