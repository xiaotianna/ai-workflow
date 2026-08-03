import { Transform } from 'class-transformer'
import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class RenameWorkflowVersionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(40, { message: '版本名称不能超过 40 个字符' })
  @IsNotEmpty({ message: '版本名称不能为空' })
  @IsString({ message: '版本名称必须是字符串' })
  name!: string
}
