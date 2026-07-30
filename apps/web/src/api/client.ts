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
  (response) => {
    if (response.config.responseType === 'blob') {
      return response
    }

    const result = response.data as ApiResponse<unknown>
    return result.data as AxiosResponse
  },
  (error: unknown) => {
    if (!isAxiosError<ApiErrorResponse>(error)) {
      showToast('error', '请求失败，请稍后重试')
      return Promise.reject(error)
    }

    if (error.code === 'ERR_CANCELED') {
      return Promise.reject(error)
    }

    const status = error.response?.status
    const authorization = AxiosHeaders.from(error.config?.headers).get('Authorization')
    const isUnauthorized = status === 401 || status === 403

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
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return client.delete<ApiResponse<T>, T>(url, config)
  },

  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return client.get<ApiResponse<T>, T>(url, config)
  },

  post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
    return client.post<ApiResponse<T>, T, D>(url, data, config)
  },

  put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
    return client.put<ApiResponse<T>, T, D>(url, data, config)
  },

  patch<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
    return client.patch<ApiResponse<T>, T, D>(url, data, config)
  },

  getBlob(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<Blob>> {
    return client.get<Blob, AxiosResponse<Blob>>(url, {
      ...config,
      responseType: 'blob',
    })
  },
}
