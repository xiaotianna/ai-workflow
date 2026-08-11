import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

export class UpdateKnowledgeApiAccessDto {
  @IsBoolean({ message: 'API 启用状态必须是布尔值' })
  enabled!: boolean
}

export class RetrieveKnowledgeApiDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(4000, { message: '检索内容不能超过 4000 个字符' })
  @MinLength(1, { message: '检索内容不能为空' })
  @IsString({ message: '检索内容必须是字符串' })
  query!: string

  @IsUUID('4', { each: true, message: '知识库 ID 无效' })
  @ArrayMaxSize(10, { message: '一次最多检索 10 个知识库' })
  @ArrayMinSize(1, { message: '至少选择一个知识库' })
  @IsArray({ message: '知识库 ID 必须是数组' })
  knowledgeBaseIds!: string[]

  @Type(() => Number)
  @Max(20, { message: '最多返回 20 条结果' })
  @Min(1, { message: '至少返回 1 条结果' })
  @IsInt({ message: '返回条数必须是整数' })
  @IsOptional()
  topK?: number
}
