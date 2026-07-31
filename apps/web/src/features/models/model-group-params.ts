import type { ModelGroupDto, UpdateModelGroupParams } from '@/api/models'

import type { ModelGroupInput } from './schema'

export function toUpdateModelGroupParams(
  input: ModelGroupInput,
  currentGroup: ModelGroupDto,
): UpdateModelGroupParams {
  const apiKeyUnchanged =
    currentGroup.providerType === input.providerType && currentGroup.maskedApiKey === input.apiKey

  return {
    name: input.name,
    providerType: input.providerType,
    baseUrl: input.baseUrl ?? null,
    apiKey: apiKeyUnchanged ? undefined : (input.apiKey ?? null),
    models: input.models.map((model) => ({
      id: model.id,
      modelId: model.modelId,
      displayName: model.displayName,
      enabled: model.enabled,
    })),
  }
}
