import {
  ENVIRONMENT_VARIABLE_TYPES,
  type DataType,
  type EnvironmentVariableType,
} from '@ai-workflow/core'
import { getDataTypeTag } from '@ai-workflow/form/components/data-type-select'

export const ENVIRONMENT_VARIABLE_TYPE_LABELS = {
  [ENVIRONMENT_VARIABLE_TYPES.STRING]: 'String',
  [ENVIRONMENT_VARIABLE_TYPES.NUMBER]: 'Number',
  [ENVIRONMENT_VARIABLE_TYPES.SECRET]: 'Secret',
} as const satisfies Record<EnvironmentVariableType, string>

export function getWorkflowVariableDataTypeLabel(dataType: DataType) {
  const tag = getDataTypeTag(dataType)

  return `${tag.charAt(0).toUpperCase()}${tag.slice(1)}`
}
