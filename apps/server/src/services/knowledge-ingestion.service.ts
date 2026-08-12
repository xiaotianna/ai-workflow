import { KnowledgeSourceStore } from '@/infra/knowledge/knowledge-source-store'
import { KnowledgeIngestionRepository } from '@/repositories/knowledge-ingestion.repository'
import { KnowledgeChunkerService } from '@/services/knowledge-chunker.service'
import { BadRequestException, Injectable } from '@nestjs/common'

@Injectable()
export class KnowledgeIngestionService {
  constructor(
    private readonly knowledgeIngestionRepository: KnowledgeIngestionRepository,
    private readonly knowledgeSourceStore: KnowledgeSourceStore,
    private readonly knowledgeChunkerService: KnowledgeChunkerService,
  ) {}

  materializeIndexBuild(
    knowledgeBaseIndexId: string,
  ): Promise<{ outcome: 'created' | 'stale'; versionCount: number }> {
    return this.knowledgeIngestionRepository.materializeIndexBuild(knowledgeBaseIndexId)
  }

  failIndexBuild(knowledgeBaseIndexId: string, errorMessage: string): Promise<void> {
    return this.knowledgeIngestionRepository.failIndexBuild(knowledgeBaseIndexId, errorMessage)
  }

  async preprocessDocumentVersion(
    documentVersionId: string,
    workerId: string,
    maxAttempts: number,
  ): Promise<'completed' | 'stale' | 'failed'> {
    const version = await this.knowledgeIngestionRepository.claimDocumentVersion(
      documentVersionId,
      workerId,
    )
    if (!version) return 'stale'

    try {
      const content = await this.knowledgeSourceStore.read(version.sourceObjectKey),
        text = await this.knowledgeChunkerService.parseText(content, version.sourceFileName),
        chunks = this.knowledgeChunkerService.chunk(text, {
          segmentationMode: version.segmentationMode,
          maxSegmentLength: version.maxSegmentLength,
          overlapLength: version.overlapLength,
          normalizeWhitespace: version.normalizeWhitespace,
        })
      if (!chunks.length) throw new BadRequestException('原文中没有可用的分段内容')

      return this.knowledgeIngestionRepository.finishPreprocessing({
        documentVersionId: version.id,
        attemptId: version.attemptId,
        textLength: text.length,
        chunks,
      })
    } catch (error) {
      const retryable = !(error instanceof BadRequestException) && version.attempt < maxAttempts
      await this.knowledgeIngestionRepository.failDocumentVersion({
        documentVersionId: version.id,
        attemptId: version.attemptId,
        errorCode: error instanceof BadRequestException ? 'SOURCE_INVALID' : 'PREPROCESSING_FAILED',
        errorMessage: getErrorMessage(error),
        retryable,
      })
      if (retryable) throw error
      return 'failed'
    }
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '未知错误'
}
