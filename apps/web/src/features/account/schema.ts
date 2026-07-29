import { z } from 'zod'

export const editAccountSchema = z
  .object({
    username: z.string().trim().min(1, '用户名不能为空').max(40, '用户名不能超过 40 个字符'),
    oldPassword: z.string(),
    newPassword: z.string(),
  })
  .superRefine(({ oldPassword, newPassword }, context) => {
    if (oldPassword && !newPassword) {
      context.addIssue({
        code: 'custom',
        message: '请输入新密码',
        path: ['newPassword'],
      })
    }

    if (!oldPassword && newPassword) {
      context.addIssue({
        code: 'custom',
        message: '请输入旧密码',
        path: ['oldPassword'],
      })
    }
  })
  .transform(({ username, oldPassword, newPassword }) => ({
    username,
    oldPassword: oldPassword || undefined,
    newPassword: newPassword || undefined,
  }))

export type EditAccountFormInput = z.input<typeof editAccountSchema>
export type EditAccountInput = z.output<typeof editAccountSchema>
