import {
  MODEL_PROVIDER_TYPES,
  MODEL_TYPES,
  type ModelProviderTypeValue,
  type ModelTypeValue,
} from '@/constant/model'
import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

export class ListModelGroupsDto {
  @IsIn(MODEL_TYPES, { message: '不支持当前模型类型' })
  @IsOptional()
  modelType?: ModelTypeValue
}

export class CreateConfiguredModelDto {
  @Transform(trimString)
  @MaxLength(100, { message: '模型 ID 不能超过 100 个字符' })
  @IsNotEmpty({ message: '模型 ID 不能为空' })
  @IsString({ message: '模型 ID 必须是字符串' })
  modelId!: string

  @Transform(trimString)
  @MaxLength(100, { message: '显示名称不能超过 100 个字符' })
  @IsString({ message: '显示名称必须是字符串' })
  @IsOptional()
  displayName?: string

  @IsBoolean({ message: '模型启用状态必须是布尔值' })
  enabled!: boolean
}

export class UpdateConfiguredModelDto extends CreateConfiguredModelDto {
  @IsUUID('4', { message: '模型配置 ID 格式无效' })
  @IsOptional()
  id?: string
}

class ModelGroupConfigurationDto {
  @Transform(trimString)
  @MaxLength(40, { message: '模型组名称不能超过 40 个字符' })
  @IsNotEmpty({ message: '模型组名称不能为空' })
  @IsString({ message: '模型组名称必须是字符串' })
  name!: string

  @IsIn(MODEL_PROVIDER_TYPES, { message: '不支持当前模型供应商' })
  providerType!: ModelProviderTypeValue

  @Transform(trimString)
  @MaxLength(300, { message: 'Base URL 不能超过 300 个字符' })
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: false,
    },
    { message: 'Base URL 需要包含正确的协议和地址' },
  )
  @IsOptional()
  baseUrl?: string | null
}

export class CreateModelGroupDto extends ModelGroupConfigurationDto {
  @IsIn(MODEL_TYPES, { message: '不支持当前模型类型' })
  modelType!: ModelTypeValue

  @Transform(trimString)
  @MaxLength(300, { message: 'Key 不能超过 300 个字符' })
  @IsNotEmpty({ message: 'Key 不能为空' })
  @IsString({ message: 'Key 必须是字符串' })
  @IsOptional()
  apiKey?: string

  @Type(() => CreateConfiguredModelDto)
  @ValidateNested({ each: true })
  @ArrayMaxSize(30, { message: '最多添加 30 个模型' })
  @ArrayMinSize(1, { message: '至少添加一个模型' })
  @IsArray({ message: '模型列表必须是数组' })
  models!: CreateConfiguredModelDto[]
}

export class UpdateModelGroupDto extends ModelGroupConfigurationDto {
  @Transform(trimString)
  @MaxLength(300, { message: 'Key 不能超过 300 个字符' })
  @IsNotEmpty({ message: 'Key 不能为空' })
  @IsString({ message: 'Key 必须是字符串' })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  apiKey?: string | null

  @Type(() => UpdateConfiguredModelDto)
  @ValidateNested({ each: true })
  @ArrayMaxSize(30, { message: '最多添加 30 个模型' })
  @ArrayMinSize(1, { message: '至少添加一个模型' })
  @IsArray({ message: '模型列表必须是数组' })
  models!: UpdateConfiguredModelDto[]
}

export class UpdateModelEnabledDto {
  @IsBoolean({ message: '启用状态必须是布尔值' })
  enabled!: boolean
}

export class TestModelConnectionDto {
  @IsIn(MODEL_PROVIDER_TYPES, { message: '不支持当前模型供应商' })
  providerType!: ModelProviderTypeValue

  @Transform(trimString)
  @MaxLength(300, { message: 'Base URL 不能超过 300 个字符' })
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: false,
    },
    { message: 'Base URL 需要包含正确的协议和地址' },
  )
  @IsOptional()
  baseUrl?: string | null

  @Transform(trimString)
  @MaxLength(300, { message: 'Key 不能超过 300 个字符' })
  @IsNotEmpty({ message: 'Key 不能为空' })
  @IsString({ message: 'Key 必须是字符串' })
  @IsOptional()
  apiKey?: string

  @IsUUID('4', { message: '模型组 ID 格式无效' })
  @IsOptional()
  credentialGroupId?: string
}
