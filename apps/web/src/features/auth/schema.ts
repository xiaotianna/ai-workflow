import { z } from 'zod'

export const authFormSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, '手机号不能为空')
    .regex(/^1[3-9]\d{9}$/, '请输入有效的中国大陆手机号'),
  password: z.string().min(1, '密码不能为空'),
})

export type AuthFormInput = z.input<typeof authFormSchema>
export type AuthFormValues = z.output<typeof authFormSchema>

export const AUTH_FORM_INITIAL_VALUES = {
  phone: '',
  password: '',
} satisfies AuthFormInput
