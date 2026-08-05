import { AppApiService } from '@/services/app-api.service'
import type { PublicAppApiDocsVo } from '@/vo/app-api.vo'
import { BadRequestException, Controller, Get, Param } from '@nestjs/common'

@Controller('public/app-api')
export class PublicAppApiController {
  constructor(private readonly appApiService: AppApiService) {}

  @Get(':shareToken')
  getSharedDocs(@Param('shareToken') shareToken: string): Promise<PublicAppApiDocsVo> {
    const normalized = shareToken.trim()
    if (!normalized || normalized.length > 128) throw new BadRequestException('分享链接无效')
    return this.appApiService.getPublicDocs(normalized)
  }
}
