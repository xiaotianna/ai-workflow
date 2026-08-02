import { generateUuid } from '@ai-workflow/shared/utils/uuid'
import { z } from 'zod'
import { variableValueSchema } from '../../variable/variable-value-schema'
import { errorHandlingSchema } from '../../node/node-error-handling'
import { HTTP_FORM_DATA_VALUE_TYPES, HTTP_METHODS, type HttpBodyType } from './constant'

const httpKeyValueEntryShape = {
  id: z.string().trim().min(1, '行 ID 不能为空'),
  key: variableValueSchema,
  value: variableValueSchema,
}

export const httpKeyValueEntrySchema = z.object(httpKeyValueEntryShape)

export const httpFormDataEntrySchema = z.object({
  ...httpKeyValueEntryShape,
  valueType: z.enum(HTTP_FORM_DATA_VALUE_TYPES),
})

export const httpRequestBodySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('none'),
  }),
  z.object({
    type: z.literal('form-data'),
    entries: z.array(httpFormDataEntrySchema).default(() => [createHttpFormDataEntry()]),
  }),
  z.object({
    type: z.literal('x-www-form-urlencoded'),
    entries: z.array(httpKeyValueEntrySchema).default(() => [createHttpKeyValueEntry()]),
  }),
  z.object({
    type: z.literal('json'),
    value: variableValueSchema,
  }),
  z.object({
    type: z.literal('raw'),
    value: variableValueSchema,
  }),
  z.object({
    type: z.literal('binary'),
    value: variableValueSchema,
  }),
])

export function createHttpRequestBody(type: HttpBodyType): HttpRequestBodyInput {
  if (type === 'form-data') {
    return { type, entries: [createHttpFormDataEntry()] }
  }

  if (type === 'x-www-form-urlencoded') {
    return { type, entries: [createHttpKeyValueEntry()] }
  }

  if (type === 'json' || type === 'raw' || type === 'binary') {
    return {
      type,
      value: { type: 'value', value: '' },
    }
  }

  return { type: 'none' }
}

export function createHttpKeyValueEntry(): HttpKeyValueEntry {
  return {
    id: generateUuid(),
    key: { type: 'value', value: '' },
    value: { type: 'value', value: '' },
  }
}

export function createHttpFormDataEntry(): HttpFormDataEntry {
  return {
    ...createHttpKeyValueEntry(),
    valueType: 'text',
  }
}

const httpUrlFormatSchema = z.string().url()

export const httpNodeSchema = z.object({
  url: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || httpUrlFormatSchema.safeParse(value).success,
      'URL 格式不正确',
    )
    .refine(
      (value) => value.length === 0 || /^https?:\/\//i.test(value),
      '请求地址只支持 HTTP 或 HTTPS',
    )
    .default(''),
  method: z.enum(HTTP_METHODS).default('GET'),
  connectionTimeout: z.number().positive('连接超时必须大于 0').default(30),
  headers: z.array(httpKeyValueEntrySchema).default(() => [createHttpKeyValueEntry()]),
  params: z.array(httpKeyValueEntrySchema).default(() => [createHttpKeyValueEntry()]),
  body: httpRequestBodySchema.default({ type: 'none' }),
  errorHandling: errorHandlingSchema,
})

export type HttpNodeConfig = z.output<typeof httpNodeSchema>
export type HttpNodeConfigInput = z.input<typeof httpNodeSchema>
export type HttpKeyValueEntry = z.output<typeof httpKeyValueEntrySchema>
export type HttpKeyValueEntryInput = z.input<typeof httpKeyValueEntrySchema>
export type HttpFormDataEntry = z.output<typeof httpFormDataEntrySchema>
export type HttpFormDataEntryInput = z.input<typeof httpFormDataEntrySchema>
export type HttpRequestBody = z.output<typeof httpRequestBodySchema>
export type HttpRequestBodyInput = z.input<typeof httpRequestBodySchema>
