import { z } from 'zod'

export const startNodeSchema = z.object({})

export type StartNodeConfig = z.infer<typeof startNodeSchema>
