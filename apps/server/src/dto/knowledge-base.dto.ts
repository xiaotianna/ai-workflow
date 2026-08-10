import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export const KNOWLEDGE_BASE_SORTS = ['updated_desc', 'created_desc', 'created_asc'] as const
export type KnowledgeBaseSort = (typeof KNOWLEDGE_BASE_SORTS)[number]

export class ListKnowledgeBasesDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(40, { message: '搜索关键词不能超过 40 个字符' })
  @IsString({ message: '搜索关键词必须是字符串' })
  @IsOptional()
  search?: string

  @IsIn(KNOWLEDGE_BASE_SORTS, { message: '不支持当前排序方式' })
  @IsOptional()
  sort: KnowledgeBaseSort = 'updated_desc'
}

export class CreateKnowledgeBaseDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(40, { message: '知识库名称不能超过 40 个字符' })
  @IsNotEmpty({ message: '知识库名称不能为空' })
  @IsString({ message: '知识库名称必须是字符串' })
  title!: string

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(32, { message: '知识库图标不能超过 32 个字符' })
  @IsNotEmpty({ message: '知识库图标不能为空' })
  @IsString({ message: '知识库图标必须是字符串' })
  icon!: string

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(200, { message: '知识库描述不能超过 200 个字符' })
  @IsString({ message: '知识库描述必须是字符串' })
  @IsOptional()
  description?: string
}

export class UpdateKnowledgeBaseDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(40, { message: '知识库名称不能超过 40 个字符' })
  @IsNotEmpty({ message: '知识库名称不能为空' })
  @IsString({ message: '知识库名称必须是字符串' })
  @IsOptional()
  title?: string

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(32, { message: '知识库图标不能超过 32 个字符' })
  @IsNotEmpty({ message: '知识库图标不能为空' })
  @IsString({ message: '知识库图标必须是字符串' })
  @IsOptional()
  icon?: string

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(200, { message: '知识库描述不能超过 200 个字符' })
  @IsString({ message: '知识库描述必须是字符串' })
  @IsOptional()
  description?: string
}

export const KNOWLEDGE_SEGMENTATION_MODES = ['GENERAL', 'QA', 'PARENT_CHILD'] as const
export type KnowledgeSegmentationModeDto = (typeof KNOWLEDGE_SEGMENTATION_MODES)[number]

export const KNOWLEDGE_RETRIEVAL_PROFILES = ['HYBRID_ACCURATE', 'HYBRID_FAST'] as const
export type KnowledgeRetrievalProfileDto = (typeof KNOWLEDGE_RETRIEVAL_PROFILES)[number]

export class UpdateKnowledgeBaseSettingsDto {
  @IsIn(KNOWLEDGE_SEGMENTATION_MODES, { message: '不支持当前分段模式' })
  segmentationMode!: KnowledgeSegmentationModeDto

  @Max(4000, { message: '分段最大长度不能超过 4000' })
  @Min(100, { message: '分段最大长度不能小于 100' })
  @IsInt({ message: '分段最大长度必须是整数' })
  maxSegmentLength!: number

  @Min(0, { message: '重叠长度不能小于 0' })
  @IsInt({ message: '重叠长度必须是整数' })
  overlapLength!: number

  @IsBoolean({ message: '空白规范化配置无效' })
  normalizeWhitespace!: boolean

  @IsIn(KNOWLEDGE_RETRIEVAL_PROFILES, { message: '不支持当前检索画像' })
  retrievalProfile!: KnowledgeRetrievalProfileDto

  @Max(20, { message: '默认返回数量不能超过 20' })
  @Min(1, { message: '默认返回数量不能小于 1' })
  @IsInt({ message: '默认返回数量必须是整数' })
  retrievalTopK!: number
}

export class ListKnowledgeDocumentsDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(100, { message: '搜索关键词不能超过 100 个字符' })
  @IsString({ message: '搜索关键词必须是字符串' })
  @IsOptional()
  search?: string

  @Transform(({ value }) => Number(value))
  @Min(1, { message: '页码不能小于 1' })
  @IsInt({ message: '页码必须是整数' })
  page = 1

  @Transform(({ value }) => Number(value))
  @IsIn([10, 25, 50], { message: '不支持当前每页数量' })
  pageSize = 10
}

export class ListKnowledgeChunksDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(100, { message: '搜索关键词不能超过 100 个字符' })
  @IsString({ message: '搜索关键词必须是字符串' })
  @IsOptional()
  search?: string

  @Transform(({ value }) => Number(value))
  @Min(1, { message: '页码不能小于 1' })
  @IsInt({ message: '页码必须是整数' })
  page = 1

  @Transform(({ value }) => Number(value))
  @IsIn([10, 25, 50], { message: '不支持当前每页数量' })
  pageSize = 10
}

export class CreateKnowledgeDocumentsDto {
  @IsIn(KNOWLEDGE_SEGMENTATION_MODES, { message: '不支持当前分段模式' })
  segmentationMode!: KnowledgeSegmentationModeDto

  @Transform(({ value }) => Number(value))
  @Max(4000, { message: '分段最大长度不能超过 4000' })
  @Min(100, { message: '分段最大长度不能小于 100' })
  @IsInt({ message: '分段最大长度必须是整数' })
  maxSegmentLength!: number

  @Transform(({ value }) => Number(value))
  @Min(0, { message: '重叠长度不能小于 0' })
  @IsInt({ message: '重叠长度必须是整数' })
  overlapLength!: number

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean({ message: '空白规范化配置无效' })
  normalizeWhitespace!: boolean
}

export class UpdateKnowledgeDocumentDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(255, { message: '文档名称不能超过 255 个字符' })
  @IsNotEmpty({ message: '文档名称不能为空' })
  @IsString({ message: '文档名称必须是字符串' })
  @IsOptional()
  name?: string

  @IsBoolean({ message: '文档启用状态无效' })
  @IsOptional()
  enabled?: boolean
}
