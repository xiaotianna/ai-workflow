import { Transform } from 'class-transformer'
import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

import { ExecutorCommandIdentityDto } from './executor-command.dto'

export class RetrieveExecutorKnowledgeDto extends ExecutorCommandIdentityDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(10_000, { message: '检索内容不能超过 10000 个字符' })
  @IsNotEmpty({ message: '检索内容不能为空' })
  @IsString({ message: '检索内容必须是字符串' })
  query!: string
}
