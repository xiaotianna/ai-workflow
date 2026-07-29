import { REDIS_URL } from '@/constant/env'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient } from 'redis'

type RedisClient = ReturnType<typeof createClient>

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private readonly client: RedisClient

  constructor(configService: ConfigService) {
    this.client = createClient({
      url: configService.getOrThrow<string>(REDIS_URL),
      // Redis 断线时不缓存业务命令，直接让调用方感知错误
      disableOfflineQueue: true,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries >= 5) {
            return new Error('Redis 重连次数已耗尽')
          }
          return Math.min(100 * 2 ** retries, 3000)
        },
      },
    })

    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis 客户端异常：${error.message}`)
    })

    this.client.on('ready', () => {
      this.logger.log('Redis 连接已就绪')
    })

    this.client.on('reconnecting', () => {
      this.logger.warn('Redis 正在重新连接')
    })

    this.client.on('end', () => {
      this.logger.log('Redis 连接已关闭')
    })
  }

  async onModuleInit() {
    await this.client.connect()
    await this.client.ping()
  }

  async onModuleDestroy() {
    if (!this.client.isOpen) {
      return
    }

    try {
      await this.client.close()
    } catch (error) {
      this.client.destroy()
      this.logger.warn(
        `Redis 连接未能正常关闭：${error instanceof Error ? error.message : '未知错误'}`,
      )
    }
  }

  ping(): Promise<string> {
    return this.client.ping()
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, {
      EX: ttlSeconds,
    })
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key)
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, value, {
      EX: ttlSeconds,
      NX: true,
    })

    return result === 'OK'
  }
}
