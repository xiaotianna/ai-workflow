import type { WorkflowSaveStatus } from '../../hooks/use-workflow-save'

interface WorkflowStatusPanelProps {
  lastSavedAt?: Date
  saveStatus: WorkflowSaveStatus
}

function getSaveStatusLabel(saveStatus: WorkflowSaveStatus, lastSavedAt?: Date) {
  if (saveStatus === 'pending') return '等待自动保存…'
  if (saveStatus === 'saving') return '正在自动保存…'
  if (saveStatus === 'error') return '自动保存失败'
  if (!lastSavedAt) return '已自动保存'

  return `自动保存 ${lastSavedAt.toLocaleTimeString('zh-CN', { hour12: false })}`
}

export const WorkflowStatusPanel = ({ lastSavedAt, saveStatus }: WorkflowStatusPanelProps) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="text-muted-foreground flex items-center gap-1 rounded-md p-1 text-xs leading-4 backdrop-blur-[5px]"
    >
      <span>{getSaveStatusLabel(saveStatus, lastSavedAt)}</span>
      <span aria-hidden>·</span>
      <span>未发布</span>
    </div>
  )
}
