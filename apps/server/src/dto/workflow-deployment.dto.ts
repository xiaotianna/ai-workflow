import { IsObject } from 'class-validator'

export class PublishWorkflowDto {
  @IsObject({ message: '工作流定义必须是对象' })
  definition!: Record<string, unknown>

  @IsObject({ message: '工作流布局必须是对象' })
  layout!: Record<string, unknown>
}
