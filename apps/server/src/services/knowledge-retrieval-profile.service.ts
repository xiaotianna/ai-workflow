import type { KnowledgeRetrievalProfileDto } from '@/dto/knowledge-base.dto'
import { Injectable } from '@nestjs/common'

export interface ResolvedKnowledgeRetrievalProfile {
  id: KnowledgeRetrievalProfileDto
  version: string
  candidateCount: number
  rerankCandidateCount: number
  rerank: boolean
  minimumRerankScore: number
  maxResultsPerDocument: number
}

const PROFILES = {
  HYBRID_ACCURATE: {
    id: 'HYBRID_ACCURATE',
    version: 'hybrid-accurate-v2',
    candidateCount: 100,
    rerankCandidateCount: 50,
    rerank: true,
    minimumRerankScore: 0.08,
    maxResultsPerDocument: 3,
  },
  HYBRID_FAST: {
    id: 'HYBRID_FAST',
    version: 'hybrid-fast-v1',
    candidateCount: 30,
    rerankCandidateCount: 0,
    rerank: false,
    minimumRerankScore: 0,
    maxResultsPerDocument: 4,
  },
} satisfies Record<KnowledgeRetrievalProfileDto, ResolvedKnowledgeRetrievalProfile>

@Injectable()
export class KnowledgeRetrievalProfileService {
  resolve(profiles: KnowledgeRetrievalProfileDto[]): ResolvedKnowledgeRetrievalProfile {
    const profile = profiles.includes('HYBRID_ACCURATE') ? 'HYBRID_ACCURATE' : 'HYBRID_FAST'
    return PROFILES[profile]
  }
}
