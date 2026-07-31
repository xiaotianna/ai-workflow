import { z } from 'zod'

export const CODE_NODE_DEFAULT_INPUT_KEYS = ['arg1', 'arg2'] as const
export const CODE_NODE_DEFAULT_OUTPUT_KEY = 'result'

export function createCodeNodeInitialCode(inputKeys: readonly string[], outputKey: string): string {
  const resultExpression = inputKeys.join(' + ') || 'undefined'

  return `function main({${inputKeys.join(', ')}}) {
    return {
        ${outputKey}: ${resultExpression}
    }
}`
}

export const codeNodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, '代码不能为空')
    .default(createCodeNodeInitialCode(CODE_NODE_DEFAULT_INPUT_KEYS, CODE_NODE_DEFAULT_OUTPUT_KEY)),
})

export type CodeNodeConfig = z.output<typeof codeNodeSchema>
