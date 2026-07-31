import type { ModelProviderTypeValue } from '@/constant/model'
import { BadRequestException, Injectable } from '@nestjs/common'
import type { ModelProviderAdapter } from './model-provider.adapter'
import { OllamaModelProviderAdapter } from './ollama.adapter'
import { OpenAiCompatibleModelProviderAdapter } from './openai-compatible.adapter'

@Injectable()
export class ModelProviderRegistry {
  private readonly adapters = new Map<ModelProviderTypeValue, ModelProviderAdapter>([
    ['openai', new OpenAiCompatibleModelProviderAdapter('openai', 'https://api.openai.com/v1')],
    ['deepseek', new OpenAiCompatibleModelProviderAdapter('deepseek', 'https://api.deepseek.com')],
    ['ollama', new OllamaModelProviderAdapter()],
  ])

  get(type: ModelProviderTypeValue): ModelProviderAdapter {
    const adapter = this.adapters.get(type)

    if (!adapter) {
      throw new BadRequestException('不支持当前模型供应商')
    }

    return adapter
  }
}
