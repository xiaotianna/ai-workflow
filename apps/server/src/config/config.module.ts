import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import * as Joi from 'joi'

const nodeEnv = process.env.NODE_ENV ?? 'development'
const developmentPrivateModelHosts = 'localhost:11434,127.0.0.1:11434,[::1]:11434'

const modelCredentialKeySchema = Joi.string().custom((value: string, helpers) => {
  const decodedKey = Buffer.from(value, 'base64')

  if (decodedKey.length !== 32 || decodedKey.toString('base64') !== value) {
    return helpers.message({
      custom: 'MODEL_CREDENTIAL_ENCRYPTION_KEY 必须是 32 字节 Base64 字符串',
    })
  }

  return value
})

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
        MODEL_CREDENTIAL_ENCRYPTION_KEY:
          nodeEnv === 'production'
            ? modelCredentialKeySchema.required()
            : modelCredentialKeySchema.optional(),
        MODEL_CONNECTION_PRIVATE_HOSTS: Joi.string()
          .allow('')
          .default(nodeEnv === 'production' ? '' : developmentPrivateModelHosts),
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
