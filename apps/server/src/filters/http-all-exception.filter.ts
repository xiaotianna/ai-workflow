import { ApiResponse } from '@/common/interfaces/api-response.interface'
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'

@Catch()
// 全局异常过滤器（包括非200的http请求）
export class HttpAllException implements ExceptionFilter {
  private readonly logger = new Logger(HttpAllException.name)

  catch(exception: any, host: ArgumentsHost): void {
    const context = host.switchToHttp()
    const request = context.getRequest<ExpressRequest>()
    const response = context.getResponse<ExpressResponse>()

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR // 500
    const message = this.resolveMessage(exception)
    const logMessage = `${request.method} ${request.originalUrl} ${status} ${message}`
    if (exception instanceof Error) {
      this.logger.error(logMessage, exception.stack)
    } else {
      this.logger.error(logMessage)
    }
    const result: ApiResponse<null> = {
      code: status,
      message,
      data: null,
    }
    // 保留真实 HTTP 状态，不要统一写成 status(200)
    response.status(status).json(result)
  }

  private resolveMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) {
      return '服务器内部错误'
    }

    const exceptionResponse = exception.getResponse()

    if (typeof exceptionResponse === 'string') {
      return exceptionResponse
    }

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const message = exceptionResponse.message

      if (Array.isArray(message)) {
        return message.map(String).join(', ')
      }

      if (typeof message === 'string') {
        return message
      }
    }

    return exception.message
  }
}
