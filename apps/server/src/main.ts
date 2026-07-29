import { NestFactory } from '@nestjs/core'
import { AppModule } from '@/app.module'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'node:path'
import cors from 'cors'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  })

  // 用winston的provider去替换nest的logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))
  // 配置静态资源目录
  app.useStaticAssets(join(__dirname, '..', 'public/images'), {
    prefix: '/images/',
  })
  app.useStaticAssets(join(__dirname, '..', 'public/avatars'), {
    prefix: '/avatars/',
  })

  // 配置跨域
  app.use(cors())
  // 当进程关闭，NestJS 会触发 PrismaService.onModuleDestroy()
  app.enableShutdownHooks()

  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
