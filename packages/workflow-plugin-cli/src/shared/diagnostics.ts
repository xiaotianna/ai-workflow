export interface PluginCliErrorOptions {
  readonly code: string
  readonly details?: readonly string[]
  readonly cause?: unknown
}

export class PluginCliError extends Error {
  readonly code: string
  readonly details: readonly string[]

  constructor(message: string, options: PluginCliErrorOptions) {
    super(message, { cause: options.cause })
    this.name = 'PluginCliError'
    this.code = options.code
    this.details = options.details ?? []
  }
}

function isErrorWithIssues(error: unknown): error is {
  readonly issues: readonly {
    readonly path: readonly PropertyKey[]
    readonly message: string
  }[]
} {
  return (
    typeof error === 'object' && error !== null && 'issues' in error && Array.isArray(error.issues)
  )
}

export function formatSchemaIssues(error: unknown): string[] {
  if (!isErrorWithIssues(error)) return []

  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.map(String).join('.') : '<root>'
    return `${path}: ${issue.message}`
  })
}

export function formatPluginCliError(error: unknown): string {
  if (error instanceof PluginCliError) {
    const details = error.details.map((detail) => `  - ${detail}`).join('\n')
    return details.length > 0
      ? `[${error.code}] ${error.message}\n${details}`
      : `[${error.code}] ${error.message}`
  }

  if (error instanceof Error) return error.message
  return String(error)
}
