const AUTH_TOKEN_STORAGE_KEY = 'ai-workflow.auth.token',
  AUTH_USER_STORAGE_KEY = 'ai-workflow.auth.user'

export interface AuthUser {
  phone: string
  username: string
}

interface AuthSession extends AuthUser {
  token: string
}

export function saveAuthSession({ token, phone, username }: AuthSession) {
  const user: AuthUser = { phone, username }

  globalThis.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
  globalThis.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
}

export function saveAuthUser(user: AuthUser) {
  globalThis.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
}

export function getAuthToken(): string | null {
  const token = globalThis.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim()
  return token || null
}

export function getAuthUser(): AuthUser | null {
  const value = globalThis.localStorage.getItem(AUTH_USER_STORAGE_KEY)

  if (!value) {
    return null
  }

  try {
    const user = JSON.parse(value) as Partial<AuthUser>

    if (typeof user.phone !== 'string' || typeof user.username !== 'string') {
      return null
    }

    return {
      phone: user.phone,
      username: user.username,
    }
  } catch {
    return null
  }
}

export function hasAuthSession() {
  return Boolean(getAuthToken())
}

export function clearAuthSession() {
  globalThis.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  globalThis.localStorage.removeItem(AUTH_USER_STORAGE_KEY)
}
