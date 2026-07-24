export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

export type HttpMethod = (typeof HTTP_METHODS)[number]

export const HTTP_RESPONSE_TYPES = ['auto', 'json', 'text'] as const

export type HttpResponseType = (typeof HTTP_RESPONSE_TYPES)[number]
