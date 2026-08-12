import { LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import type { PluginRuntimeCatalogDto } from '@/api/plugins'
import { WorkflowCatalogProvider } from '../catalog/workflow-web-catalog'
import {
  createWorkflowPluginRuntime,
  type WorkflowPluginRuntime,
} from './create-workflow-plugin-runtime'

interface WorkflowPluginRuntimeProviderProps {
  readonly runtimeCatalog: PluginRuntimeCatalogDto
  readonly children: ReactNode
  readonly loadingFallback?: ReactNode
  readonly errorFallback?: (error: Error) => ReactNode
  readonly onRuntimeReady?: (runtime: WorkflowPluginRuntime) => void
}

export function WorkflowPluginRuntimeProvider({
  runtimeCatalog,
  children,
  loadingFallback,
  errorFallback,
  onRuntimeReady,
}: WorkflowPluginRuntimeProviderProps) {
  const [state, setState] = useState<
      | { readonly status: 'loading' }
      | { readonly status: 'ready'; readonly runtime: WorkflowPluginRuntime }
      | { readonly status: 'error'; readonly error: Error }
    >({ status: 'loading' }),
    onRuntimeReadyRef = useRef(onRuntimeReady)
  onRuntimeReadyRef.current = onRuntimeReady

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })

    void createWorkflowPluginRuntime(runtimeCatalog, controller.signal)
      .then((runtime) => {
        if (controller.signal.aborted) return
        onRuntimeReadyRef.current?.(runtime)
        setState({ status: 'ready', runtime })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error('插件运行时加载失败'),
        })
      })

    return () => controller.abort()
  }, [runtimeCatalog.fingerprint])

  if (state.status === 'loading') {
    return (
      loadingFallback ?? (
        <div className="text-muted-foreground flex h-full min-h-40 items-center justify-center gap-2 text-sm">
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          正在加载插件运行时…
        </div>
      )
    )
  }

  if (state.status === 'error') {
    return (
      errorFallback?.(state.error) ?? (
        <div className="text-destructive flex h-full min-h-40 items-center justify-center px-6 text-sm">
          {state.error.message}
        </div>
      )
    )
  }

  return <WorkflowCatalogProvider catalog={state.runtime}>{children}</WorkflowCatalogProvider>
}
