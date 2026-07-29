import type { LoginResult } from '@/api/auth'

const AUTH_TOKEN_STORAGE_KEY = 'ai-workflow.auth.token'
const AUTH_USER_STORAGE_KEY = 'ai-workflow.auth.user'

export function saveAuthSession(session: LoginResult) {
  const { token, ...user } = session

  globalThis.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
  globalThis.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
}

export function hasAuthSession() {
  return Boolean(globalThis.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY))
}
