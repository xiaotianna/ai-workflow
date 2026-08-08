import { Transform, Type } from 'class-transformer'
import { PLUGIN_PERMISSION_VALUES, type PluginPermission } from '@ai-workflow/plugin'
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export const PLUGIN_VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const
export type PluginVisibilityValue = (typeof PLUGIN_VISIBILITIES)[number]

export const PLUGIN_LIST_SCOPES = ['ALL', 'INSTALLED', 'USED', 'MINE'] as const
export type PluginListScope = (typeof PLUGIN_LIST_SCOPES)[number]

export const PLUGIN_LIST_SORTS = ['updated_desc', 'created_desc', 'name_asc'] as const
export type PluginListSort = (typeof PLUGIN_LIST_SORTS)[number]

export class ListPluginsDto {
  @IsOptional()
  @IsString({ message: '分页游标必须是字符串' })
  cursor?: string

  @Type(() => Number)
  @Max(50, { message: '每次最多加载 50 个插件' })
  @Min(1, { message: '每次至少加载 1 个插件' })
  @IsInt({ message: '加载条数必须是整数' })
  limit = 24

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(100, { message: '搜索关键词不能超过 100 个字符' })
  @IsString({ message: '搜索关键词必须是字符串' })
  @IsOptional()
  search?: string

  @IsIn(PLUGIN_LIST_SCOPES, { message: '不支持当前插件范围筛选' })
  @IsOptional()
  scope: PluginListScope = 'ALL'

  @IsIn(PLUGIN_LIST_SORTS, { message: '不支持当前排序方式' })
  @IsOptional()
  sort: PluginListSort = 'updated_desc'
}

export class PublishPluginDto {
  @IsIn(PLUGIN_VISIBILITIES, { message: '不支持当前插件可见范围' })
  visibility!: PluginVisibilityValue

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(5000, { message: '版本说明不能超过 5000 个字符' })
  @IsString({ message: '版本说明必须是字符串' })
  @IsOptional()
  changelog?: string
}

export class InstallPluginDto {
  @IsUUID('4', { message: '插件版本 ID 格式不正确' })
  versionId!: string

  @ArrayUnique({ message: '授权权限不能重复' })
  @IsIn(PLUGIN_PERMISSION_VALUES, {
    each: true,
    message: '包含不支持的插件权限',
  })
  @IsArray({ message: '授权权限必须是数组' })
  permissions!: PluginPermission[]
}
