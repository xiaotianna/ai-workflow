import type { AppApiAuthenticatedRequest } from '@/common/interfaces/app-api-auth-context.interface'
import { AppApiRepository } from '@/repositories/app-api.repository'
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common'
import type { Response } from 'express'
import { randomUUID } from 'node:crypto'
import { catchError, Observable, tap, throwError } from 'rxjs'

@Injectable()
export class AppApiCallLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AppApiCallLogInterceptor.name)

  constructor(private readonly appApiRepository: AppApiRepository) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AppApiAuthenticatedRequest>(),
      response = context.switchToHttp().getResponse<Response>(),
      startedAt = Date.now()
    let recorded = false

    const record = (statusCode: number, error?: unknown) => {
      if (recorded) return
      recorded = true
      const errorMessage = error instanceof Error && error.message ? error.message : undefined

      void this.appApiRepository
        .createApiCallLog({
          appId: request.appApiAuth.appId,
          apiKeyId: request.appApiAuth.apiKeyId,
          runId: request.appApiRunId,
          requestId: randomUUID(),
          method: request.method,
          path: request.originalUrl,
          statusCode,
          durationMs: Math.max(0, Date.now() - startedAt),
          clientIp: request.ip,
          userAgent: request.get('user-agent') ?? undefined,
          ...(errorMessage
            ? {
                errorCode: 'APP_API_REQUEST_FAILED',
                errorMessage,
              }
            : {}),
        })
        .catch((logError) => {
          this.logger.warn(
            `应用 API 调用日志写入失败：${logError instanceof Error ? logError.message : '未知错误'}`,
          )
        })
    }

    return next.handle().pipe(
      tap({ complete: () => record(response.statusCode) }),
      catchError((error: unknown) => {
        record(error instanceof HttpException ? error.getStatus() : 500, error)
        return throwError(() => error)
      }),
    )
  }
}
