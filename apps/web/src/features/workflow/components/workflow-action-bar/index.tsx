import { TestRun } from './test-run'
import { RunHistory } from './run-history'
import { CheckList } from './check-list'
import { EnvVariables } from './env-variables'
import { SystemVariables } from './system-variables'
import { Publish } from './publish'
import { VersionHistory } from './version-history'

interface WorkflowActionBarProps {
  disabled?: boolean
}

export const WorkflowActionBar = ({ disabled = false }: WorkflowActionBarProps) => {
  return (
    <fieldset
      disabled={disabled}
      aria-label="工作流操作"
      className="m-0 flex min-w-0 items-center gap-1.5 border-0 p-0"
    >
      {/* 测试运行 */}
      <TestRun />
      {/* 运行历史 */}
      <RunHistory />
      {/* 检查清单 */}
      <CheckList />
      {/* 环境变量 */}
      <EnvVariables />
      {/* 系统变量 */}
      <SystemVariables />
      {/* 发布 */}
      <Publish />
      {/* 版本历史 */}
      <VersionHistory />
    </fieldset>
  )
}
