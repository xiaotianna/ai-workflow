import { Transform } from 'class-transformer'
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator'

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

export class ResolveExecutorModelDto {
  @IsUUID('4', { message: 'Command ID 格式无效' })
  commandId!: string

  @IsUUID('4', { message: 'Run ID 格式无效' })
  runId!: string

  @IsUUID('4', { message: 'NodeRun ID 格式无效' })
  nodeRunId!: string

  @Transform(trimString)
  @MaxLength(200, { message: '节点 ID 不能超过 200 个字符' })
  @IsNotEmpty({ message: '节点 ID 不能为空' })
  @IsString({ message: '节点 ID 必须是字符串' })
  nodeId!: string

  @Transform(trimString)
  @MaxLength(500, { message: 'Execution Key 不能超过 500 个字符' })
  @IsNotEmpty({ message: 'Execution Key 不能为空' })
  @IsString({ message: 'Execution Key 必须是字符串' })
  executionKey!: string

  @IsUUID('4', { message: 'Lease Token 格式无效' })
  leaseToken!: string
}
