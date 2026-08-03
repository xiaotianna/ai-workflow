import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

import executeNodeCommandSchema from '../../schemas/execute-node-command.schema.json' with { type: 'json' }
import executeNodeResultSchema from '../../schemas/execute-node-result.schema.json' with { type: 'json' }
import jsonValueSchema from '../../schemas/json-value.schema.json' with { type: 'json' }
import type { ExecuteNodeCommand } from '../generated/execute-node-command.generated'
import type { ExecuteNodeResult } from '../generated/execute-node-result.generated'
import { ProtocolValidationError, toProtocolValidationIssues } from './protocol-validation-error'

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
})

addFormats(ajv)
ajv.addSchema(jsonValueSchema)

const validateExecuteNodeCommand: ValidateFunction<ExecuteNodeCommand> =
  ajv.compile<ExecuteNodeCommand>(executeNodeCommandSchema)

const validateExecuteNodeResult: ValidateFunction<ExecuteNodeResult> =
  ajv.compile<ExecuteNodeResult>(executeNodeResultSchema)

function parseWithValidator<T>(value: unknown, validator: ValidateFunction<T>, message: string): T {
  if (validator(value)) {
    return value
  }

  throw new ProtocolValidationError(message, toProtocolValidationIssues(validator.errors))
}

export function parseExecuteNodeCommand(value: unknown): ExecuteNodeCommand {
  return parseWithValidator(value, validateExecuteNodeCommand, '节点执行命令不符合协议')
}

export function parseExecuteNodeResult(value: unknown): ExecuteNodeResult {
  return parseWithValidator(value, validateExecuteNodeResult, '节点执行结果不符合协议')
}
