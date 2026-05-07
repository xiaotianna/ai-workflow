import type { ZodTypeAny } from 'zod'

import type { NodeDefinition } from './node-definition'

export interface NodeType<TSchema extends ZodTypeAny = ZodTypeAny> {
  schema: TSchema
  definition: NodeDefinition<TSchema>
}
