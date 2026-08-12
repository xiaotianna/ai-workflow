import {
  ENVIRONMENT_VARIABLE_TYPES,
  type JsonValue,
  type VariableValue,
  type Workflow,
} from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import type { RuntimeState } from '../runtime/runtime-state-schema'
import { hasOwn } from '../utils/has-own'
import { parseJsonValue } from '../utils/json-value'
import { readJsonPath } from './read-json-path'

export interface VariableResolutionContext {
  readonly workflow: Workflow
  readonly state: RuntimeState
  readonly scopeKey: string
}

type NodeVariableReference = Extract<
  Extract<VariableValue, { type: 'reference' }>['reference'],
  { scope: 'node' }
>
type SystemVariableReference = Extract<
  Extract<VariableValue, { type: 'reference' }>['reference'],
  { scope: 'system' }
>
type EnvironmentVariableReference = Extract<
  Extract<VariableValue, { type: 'reference' }>['reference'],
  { scope: 'env' }
>

const ROOT_SCOPE_KEY = 'root'

function getNodeScopeKey(context: VariableResolutionContext, nodeId: string): string | undefined {
  const node = context.workflow.nodes.find((candidate) => candidate.id === nodeId)
  return node ? (node.parentId ?? ROOT_SCOPE_KEY) : undefined
}

/**
 * 当前 Scope 可以读取自身及任意祖先 Scope 的节点结果；不能反向读取后代，也不能读取兄弟 Scope。
 */
function isScopeVisible(context: VariableResolutionContext, referencedScopeKey: string): boolean {
  let currentScopeKey: string | undefined = context.scopeKey

  while (currentScopeKey) {
    if (currentScopeKey === referencedScopeKey) return true
    if (currentScopeKey === ROOT_SCOPE_KEY) return false

    currentScopeKey = getNodeScopeKey(context, currentScopeKey)
  }

  return false
}

function resolveNodeValue(
  value: NodeVariableReference,
  context: VariableResolutionContext,
): JsonValue {
  const nodeState = context.state.nodeStates[value.nodeId],
    executionKey = nodeState?.latestExecutionKey
  if (!executionKey) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.VARIABLE_NOT_FOUND,
      `节点 ${value.nodeId} 在当前 Scope 没有可见执行结果`,
      { nodeId: value.nodeId, scopeKey: context.scopeKey },
    )
  }

  const execution = context.state.executions[executionKey],
    referencedScopeKey = getNodeScopeKey(context, value.nodeId)
  if (
    !execution ||
    execution.nodeId !== value.nodeId ||
    !referencedScopeKey ||
    execution.scopeKey !== referencedScopeKey ||
    !isScopeVisible(context, referencedScopeKey) ||
    execution.status !== 'SUCCEEDED' ||
    !execution.outputs
  ) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      `节点 ${value.nodeId} 的最近执行记录不可用于变量解析`,
      {
        nodeId: value.nodeId,
        executionKey,
        scopeKey: context.scopeKey,
        referencedScopeKey: referencedScopeKey ?? null,
        executionScopeKey: execution?.scopeKey ?? null,
      },
    )
  }

  if (!hasOwn(execution.outputs, value.outputKey)) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.VARIABLE_NOT_FOUND,
      `节点 ${value.nodeId} 没有输出变量 ${value.outputKey}`,
      { nodeId: value.nodeId, outputKey: value.outputKey },
    )
  }

  return readJsonPath(
    execution.outputs[value.outputKey]!,
    value.path,
    `${value.nodeId}.${value.outputKey}`,
  )
}

function resolveSystemValue(
  value: SystemVariableReference,
  context: VariableResolutionContext,
): JsonValue {
  if (!hasOwn(context.state.systemVariables, value.key)) {
    throw new RuntimeError(RUNTIME_ERROR_CODES.VARIABLE_NOT_FOUND, `系统变量不存在：${value.key}`, {
      key: value.key,
    })
  }

  return readJsonPath(context.state.systemVariables[value.key], value.path, `sys.${value.key}`)
}

function resolveEnvironmentValue(
  value: EnvironmentVariableReference,
  context: VariableResolutionContext,
): JsonValue {
  const variable = context.workflow.environmentVariables.find(
    (candidate) => candidate.id === value.variableId,
  )

  if (!variable) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.VARIABLE_NOT_FOUND,
      `环境变量不存在：${value.variableId}`,
      { variableId: value.variableId },
    )
  }

  if (variable.type === ENVIRONMENT_VARIABLE_TYPES.SECRET) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.UNSUPPORTED_SECRET_VARIABLE,
      `Secret 环境变量 ${variable.name} 不能进入 RuntimeState 或 MQ`,
      { variableId: variable.id, variableName: variable.name },
    )
  }

  return readJsonPath(variable.value, value.path, `env.${variable.name}`)
}

export function resolveVariableValue(
  variableValue: VariableValue,
  context: VariableResolutionContext,
): JsonValue {
  if (variableValue.type === 'value') {
    return parseJsonValue(variableValue.value, 'variable.value')
  }

  switch (variableValue.reference.scope) {
    case 'node': {
      return resolveNodeValue(variableValue.reference, context)
    }
    case 'system': {
      return resolveSystemValue(variableValue.reference, context)
    }
    case 'env': {
      return resolveEnvironmentValue(variableValue.reference, context)
    }
  }
}
