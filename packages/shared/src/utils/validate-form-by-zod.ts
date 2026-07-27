import { z } from 'zod'

export type ZodFormErrors = Record<string, string>

export type ZodFormValidationResult<T> =
  | {
      success: true
      data: T
      errors: ZodFormErrors
    }
  | {
      success: false
      errors: ZodFormErrors
      message: string
    }

/**
 * 通用表单校验方法。
 *
 * 用法：
 * ```ts
 * const result = validateFormByZod(mySchema, formData);
 * if (!result.success) {
 *   toast.error(result.message);
 *   return;
 * }
 * const validData = result.data;
 * ```
 *
 * 说明：
 * - `schema` 传入 zod schema
 * - `data` 传入待校验表单数据
 * - 校验通过返回 `data`
 * - 校验失败返回 `message` 和 `errors`
 */
export function validateFormByZod<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  data: unknown,
): ZodFormValidationResult<z.infer<TSchema>> {
  const result = schema.safeParse(data)

  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: {},
    }
  }

  const errors = result.error.issues.reduce<ZodFormErrors>((acc, issue) => {
    const key = issue.path.length > 0 ? issue.path.join('.') : 'form'
    if (!acc[key]) {
      acc[key] = issue.message
    }
    return acc
  }, {})

  return {
    success: false,
    errors,
    message: result.error.issues[0]?.message ?? '表单校验失败',
  }
}
