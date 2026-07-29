import { RedisService } from '@/infra/redis/redis.service'
import { Injectable } from '@nestjs/common'

interface CachedUser {
  id: string
  phone: string
  username: string
}

@Injectable()
export class UserCacheRepository {
  constructor(private readonly redis: RedisService) {}

  private getKey(userId: string): string {
    return `ai-workflow:user:${userId}`
  }

  async findById(userId: string): Promise<CachedUser | null> {
    const value = await this.redis.get(this.getKey(userId))

    if (!value) {
      return null
    }

    return JSON.parse(value) as CachedUser
  }

  async save(user: CachedUser): Promise<void> {
    await this.redis.set(this.getKey(user.id), JSON.stringify(user), 5 * 60)
  }

  async delete(userId: string): Promise<void> {
    await this.redis.delete(this.getKey(userId))
  }
}
