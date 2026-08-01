import { z } from 'zod'

import { DATA_TYPE_KINDS, type DataType } from '../port/data-types'

export const SYSTEM_VARIABLE_NAMESPACE = 'sys'

export const SYSTEM_VARIABLE_KEYS = {
  USER_ID: 'user_id',
  APP_ID: 'app_id',
  WORKFLOW_ID: 'workflow_id',
  WORKFLOW_RUN_ID: 'workflow_run_id',
  TIMESTAMP: 'timestamp',
} as const

export type SystemVariableKey = (typeof SYSTEM_VARIABLE_KEYS)[keyof typeof SYSTEM_VARIABLE_KEYS]

export const systemVariableKeySchema = z.enum(SYSTEM_VARIABLE_KEYS)

export interface SystemVariableDefinition {
  readonly key: SystemVariableKey
  readonly dataType: DataType
  readonly description: string
}

export const SYSTEM_VARIABLE_DEFINITIONS = [
  {
    key: SYSTEM_VARIABLE_KEYS.USER_ID,
    dataType: DATA_TYPE_KINDS.STRING,
    description: '用户 ID',
  },
  {
    key: SYSTEM_VARIABLE_KEYS.APP_ID,
    dataType: DATA_TYPE_KINDS.STRING,
    description: '应用 ID',
  },
  {
    key: SYSTEM_VARIABLE_KEYS.WORKFLOW_ID,
    dataType: DATA_TYPE_KINDS.STRING,
    description: '工作流 ID',
  },
  {
    key: SYSTEM_VARIABLE_KEYS.WORKFLOW_RUN_ID,
    dataType: DATA_TYPE_KINDS.STRING,
    description: '工作流运行 ID',
  },
  {
    key: SYSTEM_VARIABLE_KEYS.TIMESTAMP,
    dataType: DATA_TYPE_KINDS.NUMBER,
    description: '应用开始运行的时间戳',
  },
] as const satisfies readonly SystemVariableDefinition[]
