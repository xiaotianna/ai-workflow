import { z } from 'zod'

import { DATA_TYPE_KINDS } from '../port/data-types'
import type { NodeDefinition } from './node-definition'
import { jsonValueSchema } from './workflow-node-schema'

export const ERROR_HANDLING_MODES = {
  NONE: 'none',
  DEFAULT_VALUE: 'default_value',
  ERROR_BRANCH: 'error_branch',
} as const

export type ErrorHandlingMode = (typeof ERROR_HANDLING_MODES)[keyof typeof ERROR_HANDLING_MODES]

export const ERROR_HANDLING_OPTIONS = [
  {
    label: '无',
    description: '节点发生异常且未处理时，工作流将停止运行',
    value: ERROR_HANDLING_MODES.NONE,
  },
  {
    label: '默认值',
    description: '节点发生异常时，输出指定的默认内容',
    value: ERROR_HANDLING_MODES.DEFAULT_VALUE,
  },
  {
    label: '异常分支',
    description: '节点发生异常时，执行单独的异常分支',
    value: ERROR_HANDLING_MODES.ERROR_BRANCH,
  },
] as const satisfies ReadonlyArray<{
  label: string
  description: string
  value: ErrorHandlingMode
}>

export const ERROR_HANDLING_PORT_ID = 'error'

export const errorHandlingSchema = z
  .discriminatedUnion('mode', [
    z.object({
      mode: z.literal(ERROR_HANDLING_MODES.NONE),
    }),
    z.object({
      mode: z.literal(ERROR_HANDLING_MODES.DEFAULT_VALUE),
      defaultValue: jsonValueSchema.default({}),
    }),
    z.object({
      mode: z.literal(ERROR_HANDLING_MODES.ERROR_BRANCH),
    }),
  ])
  .default({ mode: ERROR_HANDLING_MODES.NONE })

export type ErrorHandling = z.output<typeof errorHandlingSchema>
export type ErrorHandlingInput = z.input<typeof errorHandlingSchema>

export function getErrorHandlingOption(mode: ErrorHandlingMode) {
  return ERROR_HANDLING_OPTIONS.find((option) => option.value === mode)
}

export function resolveErrorHandlingPorts(
  ports: NodeDefinition['ports'],
  errorHandling: ErrorHandling,
): NodeDefinition['ports'] {
  if (errorHandling.mode !== ERROR_HANDLING_MODES.ERROR_BRANCH) return ports

  return {
    inputs: ports.inputs,
    outputs: {
      ...ports.outputs,
      [ERROR_HANDLING_PORT_ID]: {
        label: '异常分支',
        description: '节点发生异常时进入该分支',
        dataType: DATA_TYPE_KINDS.JSON,
        multiple: true,
      },
    },
  }
}
