export interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  nodes: unknown[]
  edges: unknown[]
  outputs: unknown[]
}

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
