import { apiClient } from '@/api/client'

interface LoginParams {
  phone: string
  password: string
}

interface UpdateCurrentUserParams {
  username: string
  oldPassword?: string
  newPassword?: string
}

export interface CurrentUser {
  phone: string
  username: string
}

export interface LoginResult extends CurrentUser {
  id: string
  createdAt: string
  updatedAt: string
  token: string
}

export async function login(values: LoginParams): Promise<LoginResult> {
  return apiClient.post<LoginResult, LoginParams>('/auth/login', values)
}

export async function getCurrentUser(signal?: AbortSignal): Promise<CurrentUser> {
  return apiClient.get<CurrentUser>('/auth/me', { signal })
}

export async function updateCurrentUser(values: UpdateCurrentUserParams): Promise<CurrentUser> {
  return apiClient.patch<CurrentUser, UpdateCurrentUserParams>('/auth/me', values)
}

export async function logout(): Promise<void> {
  return apiClient.post<void>('/auth/logout')
}
