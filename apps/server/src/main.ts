import { NestFactory } from '@nestjs/core'
import { AppModule } from '@/app.module'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'node:path'
import cors from 'cors'
import { ValidationPipe } from '@nestjs/common'
import { ResponseInterceptor } from './interceptors/response.interceptor'
import { HttpAllException } from './filters/http-all-exception.filter'
import { AGENT_MAX_REQUEST_BYTES } from '@ai-workflow/agent-protocol'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  })

  app.useBodyParser('json', {
    limit: AGENT_MAX_REQUEST_BYTES,
    type: (request) =>
      request.method === 'POST' &&
      /^\/studio\/apps\/[^/]+\/agent\/runs\/?(?:\?.*)?$/.test(request.url ?? '') &&
      request.headers['content-type']?.split(';')[0]?.trim().toLowerCase() === 'application/json',
  })
  app.useBodyParser('json', { limit: '1mb' })

  // 用winston的provider去替换nest的logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))
  // 配置静态资源目录
  app.useStaticAssets(join(__dirname, '..', 'public/images'), {
    prefix: '/images/',
  })
  app.useStaticAssets(join(__dirname, '..', 'public/avatars'), {
    prefix: '/avatars/',
  })

  // 全局管道，过滤数据
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 过滤掉请求中不在dto的字段
      transform: true,
      stopAtFirstError: true, // 只返回dto的第一个错误，在写dto的时候注意装饰器的执行顺序，需要倒着写
    }),
  )
  // 全局拦截器，在请求成功后，统一处理成功响应格式
  app.useGlobalInterceptors(new ResponseInterceptor())
  // 请求异常过滤器
  app.useGlobalFilters(new HttpAllException())

  // 配置跨域
  app.use(cors())
  // 当进程关闭，NestJS 会触发 PrismaService.onModuleDestroy()
  app.enableShutdownHooks()

  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
