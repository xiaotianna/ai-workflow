import { z } from 'zod'

export const loopStartNodeSchema = z.object({})

export type LoopStartNodeConfig = z.output<typeof loopStartNodeSchema>
