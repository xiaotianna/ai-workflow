import { z } from 'zod'

export const endNodeSchema = z.object({})

export type EndNodeConfig = z.output<typeof endNodeSchema>
