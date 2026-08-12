import {
  KNOWLEDGE_SOURCE_GC_BATCH_SIZE,
  KNOWLEDGE_SOURCE_GC_ENABLED,
  KNOWLEDGE_SOURCE_GC_GRACE_MS,
  KNOWLEDGE_SOURCE_GC_INTERVAL_MS,
} from '@/constant/env'
import { KnowledgeSourceStore } from '@/infra/knowledge/knowledge-source-store'
import { KnowledgeBaseRepository } from '@/repositories/knowledge-base.repository'
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class KnowledgeSourceGcScanner implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(KnowledgeSourceGcScanner.name)
  private readonly enabled: boolean
  private readonly intervalMs: number
  private readonly graceMs: number
  private readonly batchSize: number
  private continuationToken?: string
  private timer?: NodeJS.Timeout
  private scanning = false
  private stopping = false

  constructor(
    configService: ConfigService,
    private readonly knowledgeSourceStore: KnowledgeSourceStore,
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {
    this.enabled = configService.get<boolean>(KNOWLEDGE_SOURCE_GC_ENABLED) ?? false
    this.intervalMs = configService.get<number>(KNOWLEDGE_SOURCE_GC_INTERVAL_MS) ?? 900_000
    this.graceMs = configService.get<number>(KNOWLEDGE_SOURCE_GC_GRACE_MS) ?? 86_400_000
    this.batchSize = configService.get<number>(KNOWLEDGE_SOURCE_GC_BATCH_SIZE) ?? 500
  }

  onApplicationBootstrap(): void {
    if (!this.enabled) return
    this.timer = setInterval(() => void this.scan(), this.intervalMs)
    this.timer.unref()
    void this.scan()
  }

  onModuleDestroy(): void {
    this.stopping = true
    if (this.timer) clearInterval(this.timer)
  }

  private async scan(): Promise<void> {
    if (this.scanning || this.stopping) return
    this.scanning = true

    try {
      const page = await this.knowledgeSourceStore.listGcCandidates({
        before: new Date(Date.now() - this.graceMs),
        continuationToken: this.continuationToken,
        limit: this.batchSize,
      })
      this.continuationToken = page.continuationToken
      const storageKeys = page.items.map(({ storageKey }) => storageKey),
        referenced =
          await this.knowledgeBaseRepository.findReferencedSourceStorageKeys(storageKeys),
        removed = await Promise.all(
          storageKeys
            .filter((storageKey) => !referenced.has(storageKey))
            .map((storageKey) => this.knowledgeSourceStore.remove(storageKey)),
        ),
        removedCount = removed.filter(Boolean).length
      if (removedCount) this.logger.log(`已清理 ${removedCount} 个知识库孤儿原文件`)
    } catch (error) {
      this.logger.error(`知识库孤儿原文件扫描失败：${getErrorMessage(error)}`)
    } finally {
      this.scanning = false
    }
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '未知错误'
}
