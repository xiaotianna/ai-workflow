import { z } from 'zod'

export const loopExitNodeSchema = z.object({})

export type LoopExitNodeConfig = z.output<typeof loopExitNodeSchema>
