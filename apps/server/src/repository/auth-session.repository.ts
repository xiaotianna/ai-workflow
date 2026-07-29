import { RedisService } from '@/infra/redis/redis.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class AuthSessionRepository {
  constructor(private readonly redis: RedisService) {}

  private getKey(jti: string): string {
    return `ai-workflow:auth:session:v1:${jti}`
  }

  async create(jti: string, userId: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.getKey(jti), userId, ttlSeconds)
  }

  async isActive(jti: string, userId: string): Promise<boolean> {
    const storedUserId = await this.redis.get(this.getKey(jti))
    return storedUserId === userId
  }

  async delete(jti: string): Promise<void> {
    await this.redis.delete(this.getKey(jti))
  }
}
