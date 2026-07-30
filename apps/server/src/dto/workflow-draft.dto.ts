import { IsInt, IsObject, Min } from 'class-validator'

export class SaveWorkflowDraftDto {
  @Min(1, { message: '工作流草稿修订号必须大于 0' })
  @IsInt({ message: '工作流草稿修订号必须是整数' })
  revision!: number

  @IsObject({ message: '工作流定义必须是对象' })
  definition!: Record<string, unknown>

  @IsObject({ message: '工作流布局必须是对象' })
  layout!: Record<string, unknown>
}
