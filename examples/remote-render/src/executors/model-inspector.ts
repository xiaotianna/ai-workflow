import { defineExecutor } from '@ai-workflow/plugin/executor'

function requiredString(value: unknown, message: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(message)
  return value.trim()
}

export default defineExecutor(({ config, inputs, workflowRunId, nodeRunId, attempt, signal }) => {
  if (signal.aborted) throw new Error('Executor 已取消')

  const model = config.model
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    throw new Error('模型配置格式无效')
  }

  const groupId = requiredString(model.groupId, '请先选择模型组'),
    configuredModelId = requiredString(model.configuredModelId, '请先选择模型')

  return {
    outputs: {
      response: {
        selectedModel: {
          groupId,
          configuredModelId,
          groupName: typeof model.groupName === 'string' ? model.groupName : '',
          modelId: typeof model.modelId === 'string' ? model.modelId : '',
          modelName: typeof model.modelName === 'string' ? model.modelName : '',
          providerType: typeof model.providerType === 'string' ? model.providerType : '',
          parameters:
            model.parameters &&
            typeof model.parameters === 'object' &&
            !Array.isArray(model.parameters)
              ? model.parameters
              : {},
        },
        prompt: requiredString(config.prompt, '测试提示词不能为空'),
        input: inputs.input ?? null,
        context: {
          workflowRunId,
          nodeRunId,
          attempt,
        },
      },
    },
  }
})
