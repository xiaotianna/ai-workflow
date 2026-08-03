import { ERROR_HANDLING_MODES, ERROR_HANDLING_PORT_ID, type ErrorHandling } from '@ai-workflow/core'
import type { ReactNode } from 'react'

import {
  NodeContentList,
  NodeHeader,
  NodePortsRender,
  NodeWrapper,
} from '../../components/base-node'
import { NodeContentItem } from '../../components/node-content-item'
import type { NodeRendererProps } from '../../contracts/node-content'

interface ErrorHandlingNodeConfig {
  errorHandling: ErrorHandling
}

interface ErrorHandlingNodeProps<
  TConfig extends ErrorHandlingNodeConfig,
> extends NodeRendererProps<TConfig> {
  children: ReactNode
}

export function ErrorHandlingNode<TConfig extends ErrorHandlingNodeConfig>({
  node,
  definition,
  ports,
  selected = false,
  disabled = false,
  onSelect,
  onDelete,
  renderPort,
  children,
  executionStatus,
}: ErrorHandlingNodeProps<TConfig>) {
  const errorHandling = node.config.errorHandling
  const errorPort = ports.outputs[ERROR_HANDLING_PORT_ID]
  const regularOutputPorts = Object.fromEntries(
    Object.entries(ports.outputs).filter(([portId]) => portId !== ERROR_HANDLING_PORT_ID),
  )
  const showErrorHandling = errorHandling.mode !== ERROR_HANDLING_MODES.NONE

  return (
    <NodeWrapper
      selected={selected}
      disabled={disabled}
      onSelect={onSelect}
      executionStatus={executionStatus}
    >
      <NodeHeader definition={definition} onDelete={onDelete} executionStatus={executionStatus} />

      <NodePortsRender
        nodeId={node.id}
        direction="input"
        ports={ports.inputs}
        renderPort={renderPort}
      />
      <NodePortsRender
        nodeId={node.id}
        direction="output"
        ports={regularOutputPorts}
        renderPort={renderPort}
      />

      <NodeContentList>
        {children}

        {showErrorHandling ? (
          <div
            className={
              errorHandling.mode === ERROR_HANDLING_MODES.ERROR_BRANCH
                ? 'relative -mx-3 px-3'
                : undefined
            }
          >
            <NodeContentItem
              content={
                <div className="flex min-w-0 items-center justify-between gap-2 text-xs leading-4 font-medium">
                  <span className="text-muted-foreground">异常时</span>
                  <span className="text-muted-foreground truncate">
                    {errorHandling.mode === ERROR_HANDLING_MODES.DEFAULT_VALUE
                      ? '输出默认值'
                      : '异常分支'}
                  </span>
                </div>
              }
            />

            {errorHandling.mode === ERROR_HANDLING_MODES.ERROR_BRANCH && errorPort ? (
              <NodePortsRender
                nodeId={node.id}
                direction="output"
                ports={{ [ERROR_HANDLING_PORT_ID]: errorPort }}
                renderPort={renderPort}
                layout="centered"
              />
            ) : null}
          </div>
        ) : null}
      </NodeContentList>
    </NodeWrapper>
  )
}
