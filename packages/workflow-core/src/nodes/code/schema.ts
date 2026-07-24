import { z } from 'zod'

export const codeNodeSchema = z.object({
  code: z.string().trim().min(1, '代码不能为空').default('return input')
})

export type CodeNodeConfig = z.output<typeof codeNodeSchema>
