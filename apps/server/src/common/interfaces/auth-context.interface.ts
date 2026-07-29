import type { Request } from 'express'

export interface AccessTokenPayload {
  sub: string
  jti: string
  iat?: number
  exp?: number
}

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string
    jti: string
  }
}
