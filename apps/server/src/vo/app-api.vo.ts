import type { DataType, EnvironmentVariableType, JsonValue } from '@ai-workflow/core'

export type AppApiPublishStatus = 'RUNNING' | 'UNPUBLISHED'

export interface AppApiInputVariableVo {
  key: string
  label: string
  dataType: DataType
  description?: string
  required: boolean
  defaultValue?: JsonValue
}

export interface AppApiVersionInputContractVo {
  versionId: string
  version: number
  name?: string
  inputVariables: AppApiInputVariableVo[]
}

export interface AppApiOverviewVo {
  appId: string
  status: AppApiPublishStatus
  shareEnabled: boolean
  shareToken?: string
  currentVersionId?: string
  versions: AppApiVersionInputContractVo[]
}

export interface PublicAppApiDocsVo {
  appId: string
  title: string
  author: string
  description?: string
  icon?: string
  status: AppApiPublishStatus
  currentVersionId?: string
  versions: AppApiVersionInputContractVo[]
}

export interface AppApiKeyVo {
  id: string
  maskedKey: string
  createdAt: Date
  lastUsedAt?: Date
}

export interface CreatedAppApiKeyVo extends AppApiKeyVo {
  key: string
}

export interface AppApiInfoVo {
  id: string
  name: string
  author: string
  description?: string
  icon?: string
}

export interface AppApiSystemVariableVo {
  key: string
  name: string
  dataType: DataType
  description: string
}

export interface AppApiEnvironmentVariableVo {
  id: string
  name: string
  type: EnvironmentVariableType
  description?: string
  sensitive: boolean
  value?: string | number
}

export interface AppApiParametersVo {
  systemVariables: AppApiSystemVariableVo[]
  environmentVariables: AppApiEnvironmentVariableVo[]
}
