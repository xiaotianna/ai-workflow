import { modelProviderStrategies } from './provider-strategies'
import { type ModelGroup } from './schema'

export function createInitialModelGroups(): ModelGroup[] {
  return modelProviderStrategies.map((strategy) => strategy.createDefaultGroup())
}
