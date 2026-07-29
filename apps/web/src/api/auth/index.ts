import { create, isAxiosError } from 'axios'

interface ApiResponse<T> {
  code: number
  message: string
  data: T | null
}

interface LoginParams {
  phone: string
  password: string
}

export interface LoginResult {
  id: string
  phone: string
  username: string
  createdAt: string
  updatedAt: string
  token: string
}

const authApi = create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function login(values: LoginParams): Promise<LoginResult> {
  const response = await authApi.post<ApiResponse<LoginResult>>('/auth/login', values)

  if (!response.data.data) {
    throw new Error('登录响应数据为空')
  }

  return response.data.data
}

export function getLoginErrorMessage(error: unknown): string {
  if (isAxiosError<ApiResponse<null>>(error)) {
    const responseMessage = error.response?.data?.message

    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage
    }

    if (error.code === 'ERR_NETWORK') {
      return '无法连接到服务器，请检查网络后重试'
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return '登录失败，请稍后重试'
}
