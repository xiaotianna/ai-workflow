import { AddNode } from './add-node'
import { OpenAIPanel } from './open-ai-panel'

export const WorkflowCanvasToolbar = () => {
  return (
    <div className="bg-background flex items-center gap-1 rounded-lg p-0.5 shadow-lg">
      {/* 添加节点按钮 */}
      <AddNode />
      {/* 打开ai面板 */}
      <OpenAIPanel />
    </div>
  )
}
