import type { ErrorObject } from 'ajv'

export interface ProtocolValidationIssue {
  path: string
  message: string
}

export class ProtocolValidationError extends Error {
  readonly issues: readonly ProtocolValidationIssue[]

  constructor(message: string, issues: readonly ProtocolValidationIssue[]) {
    super(message)
    this.name = 'ProtocolValidationError'
    this.issues = issues
  }
}

export function toProtocolValidationIssues(
  errors: readonly ErrorObject[] | null | undefined,
): ProtocolValidationIssue[] {
  return (errors ?? []).map((error) => ({
    path: error.instancePath || '/',
    message: error.message ?? error.keyword,
  }))
}
