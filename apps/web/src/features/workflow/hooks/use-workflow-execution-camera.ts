import type { WorkflowCanvasNode } from '@/components/workflow/types'
import { useReactFlow, useStoreApi } from '@xyflow/react'
import { useEffect, useRef } from 'react'

import type { WorkflowNodeExecutionStatuses } from './use-workflow-test-run'

const FOCUS_DURATION_MS = 400

/** 测试运行推进到屏外节点时，保持缩放并以动画居中；已在视口内则不打断当前视角。 */
export function useWorkflowExecutionCamera(nodeExecutionStatuses: WorkflowNodeExecutionStatuses) {
  const { getZoom, setCenter } = useReactFlow<WorkflowCanvasNode>()
  const store = useStoreApi()
  const previousStatusesRef = useRef<WorkflowNodeExecutionStatuses>({})
  const focusedNodeIdsRef = useRef(new Set<string>())

  useEffect(() => {
    const previousStatuses = previousStatusesRef.current
    const nodeIds = Object.keys(nodeExecutionStatuses)

    if (nodeIds.length === 0) {
      previousStatusesRef.current = nodeExecutionStatuses
      focusedNodeIdsRef.current.clear()
      return
    }

    const candidateNodeIds: string[] = []
    for (const nodeId of nodeIds) {
      if (focusedNodeIdsRef.current.has(nodeId)) continue

      const status = nodeExecutionStatuses[nodeId]
      const previousStatus = previousStatuses[nodeId]
      // 正常路径：首次进入 RUNNING
      if (status === 'RUNNING' && previousStatus !== 'RUNNING') {
        candidateNodeIds.push(nodeId)
        continue
      }
      // 兜底：SSE 批处理可能跳过 RUNNING，节点首次出现即尝试跟镜头
      if (previousStatus === undefined) {
        candidateNodeIds.push(nodeId)
      }
    }

    previousStatusesRef.current = nodeExecutionStatuses
    if (candidateNodeIds.length === 0) return

    candidateNodeIds.sort((left, right) => {
      const leftRank = nodeExecutionStatuses[left] === 'RUNNING' ? 0 : 1
      const rightRank = nodeExecutionStatuses[right] === 'RUNNING' ? 0 : 1
      return leftRank - rightRank
    })

    const focusOffscreenNode = (): 'focused' | 'pending' | 'done' => {
      const { width, height, transform, nodeLookup, panZoom } = store.getState()
      if (!panZoom || width <= 0 || height <= 0) return 'pending'

      const [viewportX, viewportY, zoom] = transform
      let pendingMeasurement = false

      for (const nodeId of candidateNodeIds) {
        if (focusedNodeIdsRef.current.has(nodeId)) continue

        const internalNode = nodeLookup.get(nodeId)
        if (!internalNode) {
          pendingMeasurement = true
          continue
        }

        const { x, y } = internalNode.internals.positionAbsolute
        const nodeWidth = internalNode.measured.width
        const nodeHeight = internalNode.measured.height
        if (!nodeWidth || !nodeHeight) {
          pendingMeasurement = true
          continue
        }

        const screenLeft = x * zoom + viewportX
        const screenTop = y * zoom + viewportY
        const screenRight = screenLeft + nodeWidth * zoom
        const screenBottom = screenTop + nodeHeight * zoom
        const isOffScreen =
          screenRight < 0 || screenBottom < 0 || screenLeft > width || screenTop > height

        focusedNodeIdsRef.current.add(nodeId)
        if (!isOffScreen) continue

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        void setCenter(x + nodeWidth / 2, y + nodeHeight / 2, {
          zoom: getZoom(),
          duration: prefersReducedMotion ? 0 : FOCUS_DURATION_MS,
        })
        return 'focused'
      }

      return pendingMeasurement ? 'pending' : 'done'
    }

    if (focusOffscreenNode() !== 'pending') return

    let timeoutId: number | undefined
    const frameId = window.requestAnimationFrame(() => {
      if (focusOffscreenNode() !== 'pending') return
      timeoutId = window.setTimeout(() => {
        focusOffscreenNode()
      }, 50)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [getZoom, nodeExecutionStatuses, setCenter, store])
}
