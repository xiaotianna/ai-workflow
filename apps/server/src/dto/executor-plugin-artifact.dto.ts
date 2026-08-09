import { Transform } from 'class-transformer'
import { IsNotEmpty, IsString, IsUUID, Matches, MaxLength } from 'class-validator'

import { ExecutorCommandIdentityDto } from './executor-command.dto'

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

export class ResolveExecutorPluginArtifactDto extends ExecutorCommandIdentityDto {
  @IsUUID('4', { message: '插件版本 ID 格式无效' })
  pluginVersionId!: string

  @Matches(/^[a-f0-9]{64}$/i, { message: '插件产物摘要格式无效' })
  artifactDigest!: string

  @Transform(trimString)
  @MaxLength(512, { message: '插件 Executor 路径不能超过 512 个字符' })
  @Matches(/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\).+$/, {
    message: '插件 Executor 路径不安全',
  })
  @IsNotEmpty({ message: '插件 Executor 路径不能为空' })
  @IsString({ message: '插件 Executor 路径必须是字符串' })
  artifactPath!: string
}
