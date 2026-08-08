import { showToast } from '@ai-workflow/ui/lib/toast'
import { useEffect } from 'react'

import type { WorkflowPluginRuntime } from '../plugin-runtime'

export function useWorkflowPluginRuntimeToasts(runtime: WorkflowPluginRuntime | undefined) {
  useEffect(() => {
    if (!runtime) return
    if (!runtime.hasUnresolvedRemoteUi && runtime.pluginRemoteErrors.size === 0) return

    const errorMessages = [...runtime.pluginRemoteErrors.values()]
    if (errorMessages.length > 0) {
      showToast(
        'warning',
        `插件 Remote UI 未能完整加载，编辑器已进入只读模式。${errorMessages.join('；')}`,
      )
      return
    }

    showToast(
      'warning',
      '插件 Remote UI 未能完整加载，编辑器已进入只读模式。Manifest 声明的 Remote 组件未全部注册，请检查插件版本与 web/remoteEntry.js 是否匹配。',
    )
  }, [runtime])
}
