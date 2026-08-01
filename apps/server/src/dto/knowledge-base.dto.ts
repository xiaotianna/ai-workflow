import { Transform } from 'class-transformer'
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

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
