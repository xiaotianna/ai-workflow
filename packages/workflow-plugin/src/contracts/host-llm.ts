import { llmNodeSchema, type DataType, type JsonValue } from '@ai-workflow/core'

import type { PluginFieldSchema } from './field'

export interface HostLlmContractIssue {
  readonly path: readonly PropertyKey[]
  readonly message: string
}

interface HostLlmPortDefinition {
  readonly dataType?: DataType
  readonly required?: boolean
  readonly multiple?: boolean
}

interface HostLlmFixedOutput {
  readonly key: string
  readonly dataType: DataType
}

interface HostLlmContractInput {
  readonly initialConfig: JsonValue
  readonly form: Readonly<Record<string, PluginFieldSchema>>
  readonly inputPorts: Readonly<Record<string, HostLlmPortDefinition>>
  readonly outputPorts: Readonly<Record<string, HostLlmPortDefinition>>
  readonly fixedOutputs: readonly HostLlmFixedOutput[]
}

export function getHostLlmContractIssues(
  input: HostLlmContractInput,
): readonly HostLlmContractIssue[] {
  const issues: HostLlmContractIssue[] = []
  const configResult = llmNodeSchema.safeParse(input.initialConfig)
  if (!configResult.success) {
    for (const issue of configResult.error.issues) {
      issues.push({
        path: ['initialConfig', ...issue.path],
        message: `host-llm 初始配置无效：${issue.message}`,
      })
    }
  }

  expectField(input.form, 'model', 'llm_model', issues)
  expectField(input.form, 'messages', 'context_messages', issues)
  expectField(input.form, 'errorHandling', 'error_handling', issues)
  expectPort(input.inputPorts, 'input', 'json', true, false, '输入', issues)
  expectPort(input.outputPorts, 'result', 'string', false, true, '输出', issues)

  const resultOutput = input.fixedOutputs.find((output) => output.key === 'result')
  if (!resultOutput || resultOutput.dataType !== 'string') {
    issues.push({
      path: ['fixedOutputs'],
      message: 'host-llm 必须声明 string 类型的固定输出 result',
    })
  }

  return issues
}

function expectField(
  form: Readonly<Record<string, PluginFieldSchema>>,
  name: string,
  ui: string,
  issues: HostLlmContractIssue[],
) {
  if (form[name]?.ui === ui) return
  issues.push({
    path: ['form', name],
    message: `host-llm 字段 ${name} 必须使用 ${ui}`,
  })
}

function expectPort(
  ports: Readonly<Record<string, HostLlmPortDefinition>>,
  id: string,
  dataType: DataType,
  required: boolean,
  multiple: boolean,
  direction: string,
  issues: HostLlmContractIssue[],
) {
  const port = ports[id]
  if (
    port?.dataType === dataType &&
    Boolean(port.required) === required &&
    Boolean(port.multiple) === multiple
  ) {
    return
  }

  issues.push({
    path: ['ports', direction === '输入' ? 'inputs' : 'outputs', id],
    message: `host-llm ${direction}端口 ${id} 必须使用内置 LLM 端口契约`,
  })
}
