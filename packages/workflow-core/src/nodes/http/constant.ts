export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

export type HttpMethod = (typeof HTTP_METHODS)[number]

export const HTTP_RESPONSE_TYPES = ['auto', 'json', 'text'] as const

export type HttpResponseType = (typeof HTTP_RESPONSE_TYPES)[number]

export const HTTP_BODY_TYPES = [
  'none',
  'form-data',
  'x-www-form-urlencoded',
  'json',
  'raw',
  'binary',
] as const

export type HttpBodyType = (typeof HTTP_BODY_TYPES)[number]

export const HTTP_FORM_DATA_VALUE_TYPES = ['text', 'file'] as const

export type HttpFormDataValueType = (typeof HTTP_FORM_DATA_VALUE_TYPES)[number]
