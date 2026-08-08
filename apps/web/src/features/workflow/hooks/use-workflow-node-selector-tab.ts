import type { NodeSelectorTab } from '@ai-workflow/nodes-ui'
import { useCallback, useEffect, useState } from 'react'

const NODE_SELECTOR_TAB_STORAGE_PREFIX = 'ai-workflow.node-selector-tab'

function readPersistedNodeSelectorTab(workflowId: string): NodeSelectorTab {
  const value = globalThis.localStorage.getItem(`${NODE_SELECTOR_TAB_STORAGE_PREFIX}.${workflowId}`)
  return value === 'plugin' ? 'plugin' : 'builtin'
}

function persistNodeSelectorTab(workflowId: string, tab: NodeSelectorTab) {
  globalThis.localStorage.setItem(`${NODE_SELECTOR_TAB_STORAGE_PREFIX}.${workflowId}`, tab)
}

export function useWorkflowNodeSelectorTab(workflowId: string) {
  const [activeTab, setActiveTab] = useState<NodeSelectorTab>(() =>
    readPersistedNodeSelectorTab(workflowId),
  )

  useEffect(() => {
    setActiveTab(readPersistedNodeSelectorTab(workflowId))
  }, [workflowId])

  const handleActiveTabChange = useCallback(
    (tab: NodeSelectorTab) => {
      setActiveTab(tab)
      persistNodeSelectorTab(workflowId, tab)
    },
    [workflowId],
  )

  return {
    activeTab,
    onActiveTabChange: handleActiveTabChange,
  }
}
