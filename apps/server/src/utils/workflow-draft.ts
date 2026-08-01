export interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  nodes: unknown[]
  edges: unknown[]
  outputs: unknown[]
  environmentVariables: WorkflowEnvironmentVariableDefinition[]
}

type WorkflowEnvironmentVariableDefinition =
  | {
      id: string
      name: string
      description: string
      type: 'string' | 'secret'
      value: string
    }
  | {
      id: string
      name: string
      description: string
      type: 'number'
      value: number
    }

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

export function parseWorkflowDefinition(rawDefinition: unknown): WorkflowDefinition | undefined {
  const environmentVariables = isRecord(rawDefinition)
    ? parseWorkflowEnvironmentVariables(rawDefinition.environmentVariables)
    : undefined

  if (
    !isRecord(rawDefinition) ||
    typeof rawDefinition.id !== 'string' ||
    !rawDefinition.id ||
    typeof rawDefinition.name !== 'string' ||
    !rawDefinition.name ||
    (rawDefinition.description !== undefined && typeof rawDefinition.description !== 'string') ||
    !isWorkflowNodes(rawDefinition.nodes) ||
    !isWorkflowEdges(rawDefinition.edges) ||
    (rawDefinition.outputs !== undefined && !Array.isArray(rawDefinition.outputs)) ||
    !environmentVariables ||
    !hasUniqueStringIds(rawDefinition.nodes) ||
    !hasUniqueStringIds(rawDefinition.edges)
  ) {
    return undefined
  }

  const nodeIds = new Set(rawDefinition.nodes.map((node) => node.id))
  const hasInvalidEdgeReference = rawDefinition.edges.some(
    (edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target),
  )

  if (hasInvalidEdgeReference) return undefined

  return {
    id: rawDefinition.id,
    name: rawDefinition.name,
    ...(rawDefinition.description !== undefined ? { description: rawDefinition.description } : {}),
    nodes: rawDefinition.nodes,
    edges: rawDefinition.edges,
    outputs: rawDefinition.outputs ?? [],
    environmentVariables,
  }
}

export function redactWorkflowDefinitionSecrets(
  definition: WorkflowDefinition,
): WorkflowDefinition {
  return replaceWorkflowDefinitionSecrets(definition, '')
}

export function maskWorkflowDefinitionSecrets(definition: WorkflowDefinition): WorkflowDefinition {
  return replaceWorkflowDefinitionSecrets(definition, WORKFLOW_SECRET_MASK)
}

export function restoreMaskedWorkflowDefinitionSecrets(
  definition: WorkflowDefinition,
  persistedDefinition: WorkflowDefinition,
): WorkflowDefinition {
  const persistedSecrets = new Map<string, string>()

  for (const variable of persistedDefinition.environmentVariables) {
    if (variable.type === 'secret') {
      persistedSecrets.set(variable.id, variable.value)
    }
  }

  return {
    ...definition,
    environmentVariables: definition.environmentVariables.map((variable) =>
      variable.type === 'secret' && variable.value === WORKFLOW_SECRET_MASK
        ? { ...variable, value: persistedSecrets.get(variable.id) ?? variable.value }
        : variable,
    ),
  }
}

function replaceWorkflowDefinitionSecrets(
  definition: WorkflowDefinition,
  replacement: string,
): WorkflowDefinition {
  return {
    ...definition,
    environmentVariables: definition.environmentVariables.map((variable) =>
      variable.type === 'secret' ? { ...variable, value: replacement } : variable,
    ),
  }
}

function parseWorkflowEnvironmentVariables(
  value: unknown,
): WorkflowEnvironmentVariableDefinition[] | undefined {
  if (value === undefined) return []
  if (!Array.isArray(value)) return undefined

  const variables: WorkflowEnvironmentVariableDefinition[] = []

  for (const variable of value) {
    if (
      !isRecord(variable) ||
      typeof variable.id !== 'string' ||
      !variable.id ||
      typeof variable.name !== 'string' ||
      !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name) ||
      variable.name.length > 64 ||
      (variable.description !== undefined &&
        (typeof variable.description !== 'string' || variable.description.length > 200))
    ) {
      return undefined
    }

    const description = variable.description ?? ''

    if (
      (variable.type === 'string' || variable.type === 'secret') &&
      typeof variable.value === 'string'
    ) {
      variables.push({
        id: variable.id,
        name: variable.name,
        description,
        type: variable.type,
        value: variable.value,
      })
      continue
    }

    if (variable.type === 'number' && isFiniteNumber(variable.value)) {
      variables.push({
        id: variable.id,
        name: variable.name,
        description,
        type: variable.type,
        value: variable.value,
      })
      continue
    }

    return undefined
  }

  if (new Set(variables.map(({ id }) => id)).size !== variables.length) return undefined
  if (new Set(variables.map(({ name }) => name)).size !== variables.length) return undefined

  return variables
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

function isWorkflowNodes(value: unknown): value is Array<Record<string, unknown> & { id: string }> {
  return (
    Array.isArray(value) &&
    value.every(
      (node) =>
        isRecord(node) &&
        typeof node.id === 'string' &&
        Boolean(node.id) &&
        typeof node.type === 'string' &&
        Boolean(node.type) &&
        isRecord(node.config) &&
        isRecord(node.inputs) &&
        Array.isArray(node.outputs) &&
        (node.parentId === undefined ||
          (typeof node.parentId === 'string' && Boolean(node.parentId))),
    )
  )
}

function isWorkflowEdges(value: unknown): value is Array<
  Record<string, unknown> & {
    id: string
    source: string
    target: string
  }
> {
  return (
    Array.isArray(value) &&
    value.every(
      (edge) =>
        isRecord(edge) &&
        typeof edge.id === 'string' &&
        Boolean(edge.id) &&
        typeof edge.source === 'string' &&
        Boolean(edge.source) &&
        typeof edge.target === 'string' &&
        Boolean(edge.target) &&
        edge.source !== edge.target &&
        typeof edge.sourceHandle === 'string' &&
        Boolean(edge.sourceHandle) &&
        typeof edge.targetHandle === 'string' &&
        Boolean(edge.targetHandle),
    )
  )
}

function hasUniqueStringIds(values: Array<Record<string, unknown> & { id: string }>): boolean {
  return new Set(values.map(({ id }) => id)).size === values.length
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
