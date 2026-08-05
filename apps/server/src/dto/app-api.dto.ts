import { WorkflowRunStatus } from '@/generated/prisma/client'
import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class UpdateAppApiShareDto {
  @IsBoolean({ message: '分享状态必须是布尔值' })
  enabled!: boolean
}

export class ListAppApiWorkflowRunsDto {
  @IsOptional()
  @IsString({ message: '分页游标必须是字符串' })
  cursor?: string

  @Type(() => Number)
  @Max(50, { message: '每次最多加载 50 条运行记录' })
  @Min(1, { message: '每次至少加载 1 条运行记录' })
  @IsInt({ message: '加载条数必须是整数' })
  limit = 20

  @IsEnum(WorkflowRunStatus, { message: '运行状态无效' })
  @IsOptional()
  status?: WorkflowRunStatus

  @IsDateString({}, { message: '开始时间范围无效' })
  @IsOptional()
  from?: string

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(100, { message: '搜索内容不能超过 100 个字符' })
  @IsString({ message: '搜索内容必须是字符串' })
  @IsOptional()
  search?: string
}
