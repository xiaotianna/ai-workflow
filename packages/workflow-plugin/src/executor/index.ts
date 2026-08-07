import type { JsonValue } from '@ai-workflow/core'

export interface PluginExecutorContext<
  TConfig extends Readonly<Record<string, JsonValue>> = Readonly<Record<string, JsonValue>>,
  TInputs extends Readonly<Record<string, JsonValue>> = Readonly<Record<string, JsonValue>>,
> {
  readonly config: Readonly<TConfig>
  readonly inputs: TInputs
  readonly workflowRunId: string
  readonly nodeRunId: string
  readonly attempt: number
  readonly signal: AbortSignal
}

export interface PluginExecutorResult<
  TOutputs extends Readonly<Record<string, JsonValue>> = Readonly<Record<string, JsonValue>>,
> {
  readonly outputs: TOutputs
}

export type PluginExecutor<
  TConfig extends Readonly<Record<string, JsonValue>> = Readonly<Record<string, JsonValue>>,
  TInputs extends Readonly<Record<string, JsonValue>> = Readonly<Record<string, JsonValue>>,
  TOutputs extends Readonly<Record<string, JsonValue>> = Readonly<Record<string, JsonValue>>,
> = (
  context: PluginExecutorContext<TConfig, TInputs>,
) => PluginExecutorResult<TOutputs> | Promise<PluginExecutorResult<TOutputs>>

export function defineExecutor<
  TConfig extends Readonly<Record<string, JsonValue>> = Readonly<Record<string, JsonValue>>,
  TInputs extends Readonly<Record<string, JsonValue>> = Readonly<Record<string, JsonValue>>,
  TOutputs extends Readonly<Record<string, JsonValue>> = Readonly<Record<string, JsonValue>>,
>(
  executor: PluginExecutor<TConfig, TInputs, TOutputs>,
): PluginExecutor<TConfig, TInputs, TOutputs> {
  return executor
}
