import { showToast } from '@ai-workflow/ui/lib/toast'
import {
  AxiosHeaders,
  create,
  isAxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

interface ApiErrorResponse {
  message?: unknown
}

interface ApiClientAuthOptions {
  getAccessToken: () => string | null
  onUnauthorized: () => void
}

export interface SseMessage {
  event: string
  data: string
  id?: string
}

interface SseStreamOptions {
  signal?: AbortSignal
  onMessage: (message: SseMessage) => void
}

let authOptions: ApiClientAuthOptions | null = null

const client = create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

export function configureApiClient(options: ApiClientAuthOptions) {
  authOptions = options
}

client.interceptors.request.use((config) => {
  const token = authOptions?.getAccessToken()

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }

  return config
})

client.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!isAxiosError<ApiErrorResponse>(error)) {
      showToast('error', '请求失败，请稍后重试')
      return Promise.reject(error)
    }

    if (error.code === 'ERR_CANCELED') {
      return Promise.reject(error)
    }

    const status = error.response?.status,
      authorization = AxiosHeaders.from(error.config?.headers).get('Authorization'),
      isUnauthorized = status === 401 || status === 403

    if (isUnauthorized && authorization) {
      if (authOptions?.getAccessToken()) {
        showToast('error', getErrorMessage(error))
        authOptions.onUnauthorized()
      }

      return Promise.reject(error)
    }

    showToast('error', getErrorMessage(error))
    return Promise.reject(error)
  },
)

function getErrorMessage(error: {
  code?: string
  response?: {
    data: ApiErrorResponse
    status: number
  }
}): string {
  const responseMessage = error.response?.data?.message

  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage
  }

  if (error.code === 'ERR_NETWORK') {
    return '无法连接到服务器，请检查网络后重试'
  }

  if (error.response?.status === 401 || error.response?.status === 403) {
    return '登录状态已失效，请重新登录'
  }

  return '请求失败，请稍后重试'
}

export const apiClient = {
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await client.delete<ApiResponse<T>>(url, config)
    return response.data.data
  },

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await client.get<ApiResponse<T>>(url, config)
    return response.data.data
  },

  async post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
    const response = await client.post<ApiResponse<T>, AxiosResponse<ApiResponse<T>, D>, D>(
      url,
      data,
      config,
    )
    return response.data.data
  },

  async put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
    const response = await client.put<ApiResponse<T>, AxiosResponse<ApiResponse<T>, D>, D>(
      url,
      data,
      config,
    )
    return response.data.data
  },

  async patch<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
    const response = await client.patch<ApiResponse<T>, AxiosResponse<ApiResponse<T>, D>, D>(
      url,
      data,
      config,
    )
    return response.data.data
  },

  getBlob(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<Blob>> {
    return client.get<Blob, AxiosResponse<Blob>>(url, {
      ...config,
      responseType: 'blob',
    })
  },

  async postSse<D>(url: string, data: D, options: SseStreamOptions): Promise<void> {
    return fetchSseStream(
      url,
      {
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
      options,
    )
  },

  async getSse(url: string, options: SseStreamOptions): Promise<void> {
    return fetchSseStream(
      url,
      {
        method: 'GET',
      },
      options,
    )
  },
}

async function fetchSseStream(
  url: string,
  request: RequestInit,
  options: SseStreamOptions,
): Promise<void> {
  const token = authOptions?.getAccessToken(),
    headers = new Headers(request.headers)
  headers.set('Accept', 'text/event-stream')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(resolveApiUrl(url), {
    ...request,
    headers,
    signal: options.signal,
  })

  if (!response.ok) {
    const message = await readFetchErrorMessage(response)
    if ((response.status === 401 || response.status === 403) && token) {
      authOptions?.onUnauthorized()
    }
    throw new Error(message)
  }

  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    throw new Error('服务器没有返回有效的 SSE 事件流')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('当前浏览器无法读取 SSE 事件流')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })

      let boundary = findSseFrameBoundary(buffer)
      while (boundary) {
        const frame = buffer.slice(0, boundary.index)
        buffer = buffer.slice(boundary.index + boundary.length)
        const message = parseSseFrame(frame)
        if (message) options.onMessage(message)
        boundary = findSseFrameBoundary(buffer)
      }

      if (done) break
    }
  } catch (error) {
    try {
      await reader.cancel()
    } catch {
      // 请求已中止或连接已关闭时无需再次处理 reader 取消失败。
    }
    throw error
  }
}

function resolveApiUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url

  const baseUrl = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
  if (!baseUrl) return url
  return `${baseUrl}/${url.replace(/^\/+/, '')}`
}

function findSseFrameBoundary(value: string): { index: number; length: number } | undefined {
  const match = /\r?\n\r?\n/.exec(value)
  return match?.index === undefined ? undefined : { index: match.index, length: match[0].length }
}

function parseSseFrame(frame: string): SseMessage | undefined {
  let event = 'message',
    id: string | undefined = undefined
  const data: string[] = []

  for (const line of frame.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue
    const separatorIndex = line.indexOf(':'),
      field = separatorIndex === -1 ? line : line.slice(0, separatorIndex),
      rawValue = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1),
      value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue

    if (field === 'event') event = value
    if (field === 'id') id = value
    if (field === 'data') data.push(value)
  }

  if (data.length === 0) return undefined
  return {
    event,
    data: data.join('\n'),
    ...(id ? { id } : {}),
  }
}

async function readFetchErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown }
    if (typeof body.message === 'string' && body.message.trim()) return body.message
  } catch {
    // 非 JSON 错误响应使用下面的状态兜底文案。
  }

  if (response.status === 401 || response.status === 403) return '登录状态已失效，请重新登录'
  return `SSE 连接失败（${response.status}）`
}
