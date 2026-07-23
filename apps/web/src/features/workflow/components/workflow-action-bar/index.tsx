import { TestRun } from './test-run'
import { RunHistory } from './run-history'
import { CheckList } from './check-list'
import { EnvVariables } from './env-variables'
import { SystemVariables } from './system-variables'
import { Publish } from './publish'
import { VersionHistory } from './version-history'

export const WorkflowActionBar = () => {
  return (
    <div className="flex items-center gap-1.5">
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
    </div>
  )
}
