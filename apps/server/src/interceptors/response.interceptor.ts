import { ApiResponse } from '@/common/interfaces/api-response.interface'
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import type { Response as ExpressResponse } from 'express'

@Injectable()
// 成功响应拦截器
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse<ExpressResponse>()
    return next.handle().pipe(
      map((data) => ({
        code: response.statusCode,
        message: 'success',
        data: data ?? null,
      })),
    )
  }
}
