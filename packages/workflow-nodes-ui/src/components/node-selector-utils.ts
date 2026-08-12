import type { NodeType } from '@ai-workflow/core'

const PLUGIN_NODE_TYPE_PATTERN =
  /^plugin:((?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*)\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

export type NodeSelectorTab = 'builtin' | 'plugin'

/** 列表区域最小高度：约 5 行节点项（size-6 图标 + py-1 + gap-1） */
export const NODE_SELECTOR_LIST_MIN_HEIGHT_CLASS = 'min-h-44'

export function isPluginNodeType(type: string) {
  return PLUGIN_NODE_TYPE_PATTERN.test(type)
}

export function getPluginPackageNameFromNodeType(type: string) {
  const match = type.match(PLUGIN_NODE_TYPE_PATTERN)
  return match?.[1]
}

export function filterNodeTypesByQuery(nodeTypes: readonly NodeType[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return nodeTypes

  return nodeTypes.filter(({ definition }) =>
    [definition.label, definition.description, definition.type].some((value) =>
      value?.toLocaleLowerCase().includes(normalizedQuery),
    ),
  )
}

export function splitNodeTypesByOrigin(nodeTypes: readonly NodeType[]) {
  const builtinNodeTypes: NodeType[] = [],
    pluginNodeTypes: NodeType[] = []

  for (const nodeType of nodeTypes) {
    if (isPluginNodeType(nodeType.definition.type)) {
      pluginNodeTypes.push(nodeType)
    } else {
      builtinNodeTypes.push(nodeType)
    }
  }

  return { builtinNodeTypes, pluginNodeTypes }
}

export interface NodeSelectorPluginGroup {
  label: string
  nodeTypes: readonly NodeType[]
}

export function groupPluginNodeTypes(
  nodeTypes: readonly NodeType[],
  groupLabelByNodeType?: ReadonlyMap<string, string>,
) {
  const groups = new Map<string, NodeType[]>()

  for (const nodeType of nodeTypes) {
    const type = nodeType.definition.type,
      label =
        groupLabelByNodeType?.get(type) ??
        getPluginPackageNameFromNodeType(type) ??
        nodeType.definition.label,
      existingGroup = groups.get(label)
    if (existingGroup) {
      existingGroup.push(nodeType)
      continue
    }

    groups.set(label, [nodeType])
  }

  return [...groups.entries()].map(([label, groupedNodeTypes]) => ({
    label,
    nodeTypes: groupedNodeTypes,
  }))
}
