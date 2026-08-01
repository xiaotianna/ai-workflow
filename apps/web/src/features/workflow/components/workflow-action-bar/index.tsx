import { TestRun } from './test-run'
import { RunHistory } from './run-history'
import { CheckList } from './check-list'
import { EnvVariables } from './env-variables'
import { SystemVariables } from './system-variables'
import { Publish } from './publish'
import { VersionHistory } from './version-history'
import type { WorkflowAuxiliaryPanelType } from '../workflow-auxiliary-panel'

interface WorkflowActionBarProps {
  activePanel?: WorkflowAuxiliaryPanelType
  disabled?: boolean
  onPanelToggle: (panel: WorkflowAuxiliaryPanelType) => void
  onTestRun: () => void
}

export const WorkflowActionBar = ({
  activePanel,
  disabled = false,
  onPanelToggle,
  onTestRun,
}: WorkflowActionBarProps) => {
  return (
    <fieldset
      disabled={disabled}
      aria-label="工作流操作"
      className="m-0 flex min-w-0 items-center gap-1.5 border-0 p-0"
    >
      {/* 测试运行 */}
      <TestRun onClick={onTestRun} />
      {/* 运行历史 */}
      <RunHistory
        active={activePanel === 'run-history'}
        onClick={() => onPanelToggle('run-history')}
      />
      {/* 检查清单 */}
      <CheckList
        active={activePanel === 'check-list'}
        onClick={() => onPanelToggle('check-list')}
      />
      {/* 环境变量 */}
      <EnvVariables
        active={activePanel === 'environment-variables'}
        onClick={() => onPanelToggle('environment-variables')}
      />
      {/* 系统变量 */}
      <SystemVariables
        active={activePanel === 'system-variables'}
        onClick={() => onPanelToggle('system-variables')}
      />
      {/* 发布 */}
      <Publish />
      {/* 版本历史 */}
      <VersionHistory
        active={activePanel === 'version-history'}
        onClick={() => onPanelToggle('version-history')}
      />
    </fieldset>
  )
}
