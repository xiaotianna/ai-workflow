import { ENVIRONMENT_VARIABLE_TYPES, workflowSchema, type Workflow } from '@ai-workflow/core'

export const WORKFLOW_SECRET_MASK = '********'

export interface WorkflowLayout {
  positions: Record<string, { x: number; y: number }>
  viewport?: {
    x: number
    y: number
    zoom: number
  }
  sizes?: Record<string, { width: number; height: number }>
}

export function parseWorkflowDefinition(rawDefinition: unknown): Workflow | undefined {
  const parsed = workflowSchema.safeParse(rawDefinition)
  return parsed.success ? parsed.data : undefined
}

export function redactWorkflowDefinitionSecrets(definition: Workflow): Workflow {
  return replaceWorkflowDefinitionSecrets(definition, '')
}

export function maskWorkflowDefinitionSecrets(definition: Workflow): Workflow {
  return replaceWorkflowDefinitionSecrets(definition, WORKFLOW_SECRET_MASK)
}

export function restoreMaskedWorkflowDefinitionSecrets(
  definition: Workflow,
  persistedDefinition: Workflow,
): Workflow {
  const persistedSecrets = new Map<string, string>()

  for (const variable of persistedDefinition.environmentVariables) {
    if (variable.type === ENVIRONMENT_VARIABLE_TYPES.SECRET) {
      persistedSecrets.set(variable.id, variable.value)
    }
  }

  return {
    ...definition,
    environmentVariables: definition.environmentVariables.map((variable) =>
      variable.type === ENVIRONMENT_VARIABLE_TYPES.SECRET && variable.value === WORKFLOW_SECRET_MASK
        ? {
            ...variable,
            value: persistedSecrets.get(variable.id) ?? variable.value,
          }
        : variable,
    ),
  }
}

function replaceWorkflowDefinitionSecrets(definition: Workflow, replacement: string): Workflow {
  return {
    ...definition,
    environmentVariables: definition.environmentVariables.map((variable) =>
      variable.type === ENVIRONMENT_VARIABLE_TYPES.SECRET
        ? { ...variable, value: replacement }
        : variable,
    ),
  }
}

export function parseWorkflowLayout(rawLayout: unknown): WorkflowLayout | undefined {
  if (!isRecord(rawLayout) || !isRecord(rawLayout.positions)) return undefined

  const positions = parsePointRecord(rawLayout.positions)
  if (!positions) return undefined

  const viewport = rawLayout.viewport === undefined ? undefined : parseViewport(rawLayout.viewport)
  if (rawLayout.viewport !== undefined && !viewport) return undefined

  const sizes = rawLayout.sizes === undefined ? undefined : parseSizeRecord(rawLayout.sizes)
  if (rawLayout.sizes !== undefined && !sizes) return undefined

  return {
    positions,
    ...(viewport ? { viewport } : {}),
    ...(sizes ? { sizes } : {}),
  }
}

function parsePointRecord(
  value: Record<string, unknown>,
): Record<string, { x: number; y: number }> | undefined {
  const entries = Object.entries(value)

  if (
    entries.some(
      ([, point]) => !isRecord(point) || !isFiniteNumber(point.x) || !isFiniteNumber(point.y),
    )
  ) {
    return undefined
  }

  return Object.fromEntries(
    entries.map(([id, point]) => [
      id,
      {
        x: (point as Record<string, number>).x,
        y: (point as Record<string, number>).y,
      },
    ]),
  )
}

function parseViewport(value: unknown): WorkflowLayout['viewport'] | undefined {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.zoom) ||
    value.zoom <= 0
  ) {
    return undefined
  }

  return {
    x: value.x,
    y: value.y,
    zoom: value.zoom,
  }
}

function parseSizeRecord(
  value: unknown,
): Record<string, { width: number; height: number }> | undefined {
  if (!isRecord(value)) return undefined

  const entries = Object.entries(value)

  if (
    entries.some(
      ([, size]) =>
        !isRecord(size) ||
        !isFiniteNumber(size.width) ||
        !isFiniteNumber(size.height) ||
        size.width <= 0 ||
        size.height <= 0,
    )
  ) {
    return undefined
  }

  return Object.fromEntries(
    entries.map(([id, size]) => [
      id,
      {
        width: (size as Record<string, number>).width,
        height: (size as Record<string, number>).height,
      },
    ]),
  )
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
