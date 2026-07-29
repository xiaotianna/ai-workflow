import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import * as Joi from 'joi'

const nodeEnv = process.env.NODE_ENV ?? 'development'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${nodeEnv}.local`, `.env.${nodeEnv}`, '.env.local', '.env'],
      cache: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().port().default(3000),
        DATABASE_URL: Joi.string()
          .uri({
            scheme: ['postgresql', 'postgres'],
          })
          .required(),
        REDIS_URL: Joi.string()
          .uri({
            scheme: ['redis', 'rediss'],
          })
          .required(),
        JWT_SECRET: Joi.string().min(1).required(),
        JWT_EXPIRES_IN: Joi.string().default('7d'),
      }),
      validationOptions: {
        // 一次显示全部配置错误
        abortEarly: false,
        // 允许系统中存在 PATH、HOME 等其他环境变量
        allowUnknown: true,
      },
    }),
  ],
})
export class ENVConfigModule {}
