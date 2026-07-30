import { Transform, Type } from 'class-transformer'
import {
  Equals,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

export const STUDIO_APP_SORTS = ['updated_desc', 'created_desc', 'created_asc'] as const
export type StudioAppSort = (typeof STUDIO_APP_SORTS)[number]

export class ListStudioAppsDto {
  @IsOptional()
  @IsString({ message: '分页游标必须是字符串' })
  cursor?: string

  @Type(() => Number)
  @Max(50, { message: '每次最多加载 50 条应用' })
  @Min(1, { message: '每次至少加载 1 条应用' })
  @IsInt({ message: '加载条数必须是整数' })
  limit = 24

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(40, { message: '搜索关键词不能超过 40 个字符' })
  @IsString({ message: '搜索关键词必须是字符串' })
  @IsOptional()
  search?: string

  @IsIn(STUDIO_APP_SORTS, { message: '不支持当前排序方式' })
  @IsOptional()
  sort: StudioAppSort = 'updated_desc'
}

export class CreateStudioAppDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(40, { message: '应用名称不能超过 40 个字符' })
  @IsNotEmpty({ message: '应用名称不能为空' })
  @IsString({ message: '应用名称必须是字符串' })
  title!: string

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(32, { message: '应用图标不能超过 32 个字符' })
  @IsNotEmpty({ message: '应用图标不能为空' })
  @IsString({ message: '应用图标必须是字符串' })
  icon!: string

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(200, { message: '应用描述不能超过 200 个字符' })
  @IsString({ message: '应用描述必须是字符串' })
  @IsOptional()
  description?: string
}

export class UpdateStudioAppDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(40, { message: '应用名称不能超过 40 个字符' })
  @IsNotEmpty({ message: '应用名称不能为空' })
  @IsString({ message: '应用名称必须是字符串' })
  @IsOptional()
  title?: string

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(32, { message: '应用图标不能超过 32 个字符' })
  @IsNotEmpty({ message: '应用图标不能为空' })
  @IsString({ message: '应用图标必须是字符串' })
  @IsOptional()
  icon?: string

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(200, { message: '应用描述不能超过 200 个字符' })
  @IsString({ message: '应用描述必须是字符串' })
  @IsOptional()
  description?: string
}

export class StudioAppDslMetadataDto {
  @IsUUID('4', { message: 'DSL 应用 ID 格式无效' })
  id!: string

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(40, { message: 'DSL 应用名称不能超过 40 个字符' })
  @IsNotEmpty({ message: 'DSL 应用名称不能为空' })
  @IsString({ message: 'DSL 应用名称必须是字符串' })
  title!: string

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(200, { message: 'DSL 应用描述不能超过 200 个字符' })
  @IsString({ message: 'DSL 应用描述必须是字符串' })
  @IsOptional()
  description?: string | null

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(32, { message: 'DSL 应用图标不能超过 32 个字符' })
  @IsString({ message: 'DSL 应用图标必须是字符串' })
  @IsOptional()
  icon?: string | null
}

export class StudioAppDslWorkflowDto {
  @Min(1, { message: 'DSL 工作流结构版本必须大于 0' })
  @IsInt({ message: 'DSL 工作流结构版本必须是整数' })
  schemaVersion!: number

  @Min(1, { message: 'DSL 工作流修订号必须大于 0' })
  @IsInt({ message: 'DSL 工作流修订号必须是整数' })
  revision!: number

  @IsObject({ message: 'DSL 工作流定义必须是对象' })
  definition!: Record<string, unknown>

  @IsObject({ message: 'DSL 工作流布局必须是对象' })
  layout!: Record<string, unknown>
}

export class ImportStudioAppDslDto {
  @Equals(1, { message: '不支持当前 DSL 版本' })
  @IsInt({ message: 'DSL 版本必须是整数' })
  dslVersion!: number

  @Type(() => StudioAppDslMetadataDto)
  @ValidateNested()
  app!: StudioAppDslMetadataDto

  @Type(() => StudioAppDslWorkflowDto)
  @ValidateNested()
  workflow!: StudioAppDslWorkflowDto
}
