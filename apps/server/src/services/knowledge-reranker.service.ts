import type { KnowledgeRetrievalDocumentVo } from '@/vo/knowledge-retrieval.vo'
import {
  normalizeKnowledgeSearchText,
  readKnowledgeSearchMetadata,
} from '@/utils/knowledge-search-text'
import { Injectable } from '@nestjs/common'

export interface KnowledgeRerankCandidate extends KnowledgeRetrievalDocumentVo {
  contentHash: string
  rrfScore: number
  rrfRank: number
  distanceMetric: 'COSINE' | 'EUCLIDEAN' | 'INNER_PRODUCT'
  bm25Rank?: number
  denseRank?: number
  bm25Score?: number
  denseScore?: number
}

export interface KnowledgeRerankResult extends KnowledgeRerankCandidate {
  rerankScore: number
}

@Injectable()
export class KnowledgeRerankerService {
  rerank(
    query: string,
    candidates: KnowledgeRerankCandidate[],
    minimumScore: number,
  ): KnowledgeRerankResult[] {
    const normalizedQuery = normalizeKnowledgeSearchText(query)
    const queryTerms = uniqueSearchTerms(normalizedQuery)
    const shortKeywordQuery = isShortKeywordQuery(normalizedQuery, queryTerms)

    return candidates
      .map((candidate) => ({
        ...candidate,
        rerankScore: calculateRerankScore(
          normalizedQuery,
          queryTerms,
          shortKeywordQuery,
          candidate,
        ),
      }))
      .filter(({ rerankScore }) => rerankScore >= minimumScore)
      .sort(
        (left, right) =>
          right.rerankScore - left.rerankScore ||
          right.rrfScore - left.rrfScore ||
          left.chunkId.localeCompare(right.chunkId),
      )
  }
}

function calculateRerankScore(
  normalizedQuery: string,
  queryTerms: string[],
  shortKeywordQuery: boolean,
  candidate: KnowledgeRerankCandidate,
): number {
  const searchMetadata = readKnowledgeSearchMetadata(candidate.metadata, candidate.content)
  const title = normalizeKnowledgeSearchText(searchMetadata.title ?? '')
  const titlePath = normalizeKnowledgeSearchText(searchMetadata.titlePath ?? '')
  const documentName = normalizeKnowledgeSearchText(candidate.documentName)
  const content = normalizeKnowledgeSearchText(candidate.content)
  const fields = [title, titlePath, documentName, content]

  if (shortKeywordQuery && !fields.some((value) => value.includes(normalizedQuery))) return 0

  const titlePhraseScore = phraseScore(title, normalizedQuery, 0.34, 0.29)
  const pathPhraseScore =
    titlePath === title ? 0 : phraseScore(titlePath, normalizedQuery, 0.22, 0.18)
  const filePhraseScore = phraseScore(documentName, normalizedQuery, 0.14, 0.11)
  const contentPhraseScore = phraseScore(content, normalizedQuery, 0.17, 0.14)
  const titleCoverage = termCoverage(title, queryTerms) * 0.18
  const contentCoverage = termCoverage(content, queryTerms) * 0.1
  const frequencyScore = Math.min(countOccurrences(content, normalizedQuery), 4) * 0.0125
  const lexicalScore =
    titlePhraseScore +
    pathPhraseScore +
    filePhraseScore +
    contentPhraseScore +
    titleCoverage +
    contentCoverage +
    frequencyScore
  const semanticScore = denseSemanticScore(candidate)

  return roundScore(Math.min(1, lexicalScore + semanticScore))
}

/**
 * Lucene k-NN 的原始 _score 由距离度量转换而来。这里先还原成统一的相关度，
 * 只让足够强的语义证据参与重排；RRF 仅用于同分候选的稳定排序。
 */
function denseSemanticScore(candidate: KnowledgeRerankCandidate): number {
  if (candidate.denseScore === undefined) return 0
  const relevance = normalizeDenseRelevance(candidate.denseScore, candidate.distanceMetric)
  const minimumRelevance = 0.4
  if (relevance <= minimumRelevance) return 0
  return ((relevance - minimumRelevance) / (1 - minimumRelevance)) * 0.18
}

function normalizeDenseRelevance(
  score: number,
  distanceMetric: KnowledgeRerankCandidate['distanceMetric'],
): number {
  if (!Number.isFinite(score) || score <= 0) return 0
  if (distanceMetric === 'COSINE') return clamp(2 * score - 1, 0, 1)
  if (distanceMetric === 'EUCLIDEAN') return clamp(score, 0, 1)

  const innerProduct = score > 1 ? score - 1 : 1 - 1 / score
  return clamp(innerProduct, 0, 1)
}

function isShortKeywordQuery(normalizedQuery: string, terms: string[]): boolean {
  if (!normalizedQuery || /[?？!！。]/u.test(normalizedQuery)) return false
  if (/\p{Script=Han}/u.test(normalizedQuery)) {
    if (/^(?:怎么|怎样|如何|为什么|为何|什么|哪里|是否|能否|请问|何时)/u.test(normalizedQuery)) {
      return false
    }
    return normalizedQuery.replace(/\s/gu, '').length <= 8
  }
  return normalizedQuery.length <= 32 && terms.length > 0 && terms.length <= 3
}

function phraseScore(
  value: string,
  query: string,
  exactWeight: number,
  containsWeight: number,
): number {
  if (!value || !query) return 0
  if (value === query) return exactWeight
  return value.includes(query) ? containsWeight : 0
}

function termCoverage(value: string, terms: string[]): number {
  if (!value || !terms.length) return 0
  return terms.filter((term) => value.includes(term)).length / terms.length
}

function uniqueSearchTerms(value: string): string[] {
  return [
    ...new Set(Array.from(value.matchAll(/[\p{Script=Han}]|[\p{L}\p{N}]+/gu), (match) => match[0])),
  ]
}

function countOccurrences(value: string, query: string): number {
  if (!value || !query) return 0
  let count = 0
  let fromIndex = 0
  while (fromIndex < value.length) {
    const index = value.indexOf(query, fromIndex)
    if (index === -1) break
    count += 1
    fromIndex = index + query.length
  }
  return count
}

function roundScore(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}
