import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import * as Joi from 'joi'

const nodeEnv = process.env.NODE_ENV ?? 'development',
  modelCredentialKeySchema = Joi.string().custom((value: string, helpers) => {
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
        RABBITMQ_URL: Joi.string()
          .uri({ scheme: ['amqp', 'amqps'] })
          .default('amqp://ai_workflow:ai_workflow_dev@127.0.0.1:5672/ai_workflow'),
        WORKFLOW_EXECUTOR_ROUTING_MODE: Joi.string()
          .valid('legacy', 'classified')
          .default('legacy'),
        EXECUTOR_INTERNAL_AUTH_TOKEN: Joi.string().min(32).allow('').default(''),
        EXECUTOR_REQUIRE_INTERNAL_AUTH: Joi.boolean().default(false),
        EXECUTOR_ENABLED_CLASSES: Joi.string().default(
          'trusted-compute,controlled-model,controlled-http,untrusted-sandbox',
        ),
        PLUGIN_ARTIFACT_DIRECTORY: Joi.string().trim().min(1).default('var/plugin-artifacts'),
        KNOWLEDGE_SOURCE_DIRECTORY: Joi.string().trim().min(1).default('var/knowledge-sources'),
        KNOWLEDGE_SOURCE_STORAGE_DRIVER: Joi.string()
          .valid('local', 's3')
          .default(nodeEnv === 'production' ? 's3' : 'local'),
        KNOWLEDGE_S3_ENDPOINT: Joi.string().uri().allow('').default(''),
        KNOWLEDGE_S3_REGION: Joi.string().trim().min(1).default('us-east-1'),
        KNOWLEDGE_S3_BUCKET: Joi.string().trim().min(3).optional(),
        KNOWLEDGE_S3_ACCESS_KEY_ID: Joi.string().trim().allow('').default(''),
        KNOWLEDGE_S3_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
        KNOWLEDGE_S3_FORCE_PATH_STYLE: Joi.boolean().default(false),
        KNOWLEDGE_SOURCE_GC_ENABLED: Joi.boolean().default(nodeEnv === 'production'),
        KNOWLEDGE_SOURCE_GC_INTERVAL_MS: Joi.number().integer().min(60_000).default(900_000),
        KNOWLEDGE_SOURCE_GC_GRACE_MS: Joi.number().integer().min(3_600_000).default(86_400_000),
        KNOWLEDGE_SOURCE_GC_BATCH_SIZE: Joi.number().integer().min(1).max(1000).default(500),
        OPENSEARCH_URL: Joi.string()
          .uri({ scheme: ['http', 'https'] })
          .default('http://127.0.0.1:9200'),
        OPENSEARCH_USERNAME: Joi.string().allow('').default(''),
        OPENSEARCH_PASSWORD: Joi.string().allow('').default(''),
        OPENSEARCH_TLS_REJECT_UNAUTHORIZED: Joi.boolean().default(true),
      }).custom((value: Record<string, unknown>, helpers) => {
        if (value.KNOWLEDGE_SOURCE_STORAGE_DRIVER === 's3' && !value.KNOWLEDGE_S3_BUCKET) {
          return helpers.message({
            custom: 'S3 存储必须配置 KNOWLEDGE_S3_BUCKET',
          })
        }
        const hasAccessKey = Boolean(value.KNOWLEDGE_S3_ACCESS_KEY_ID),
          hasSecretKey = Boolean(value.KNOWLEDGE_S3_SECRET_ACCESS_KEY)
        if (hasAccessKey !== hasSecretKey) {
          return helpers.message({
            custom: 'S3 静态凭证必须同时配置 Access Key 和 Secret Key',
          })
        }
        const hasOpenSearchUsername = Boolean(value.OPENSEARCH_USERNAME),
          hasOpenSearchPassword = Boolean(value.OPENSEARCH_PASSWORD)
        if (hasOpenSearchUsername !== hasOpenSearchPassword) {
          return helpers.message({
            custom: 'OpenSearch 用户名和密码必须成对配置',
          })
        }
        return value
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
