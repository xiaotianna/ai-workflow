import { z } from 'zod'
import { HTTP_METHODS } from './constant'

export const httpNodeSchema = z.object({
  url: z.string().trim().url('URL 格式不正确').default('https://example.invalid'),

  method: z.enum(HTTP_METHODS).default('GET'),
})

export type HttpNodeConfig = z.output<typeof httpNodeSchema>
