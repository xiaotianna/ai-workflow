import type { Request } from 'express'

export interface AppApiAuthContext {
  appId: string
  apiKeyId: string
  ownerId: string
  workflowId: string
}

export interface AppApiAuthenticatedRequest extends Request {
  appApiAuth: AppApiAuthContext
  appApiRunId?: string
}
