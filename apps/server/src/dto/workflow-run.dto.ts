import { WorkflowRunMode } from '@/generated/prisma/client'
import { IsIn, IsObject, IsOptional, IsString, ValidateIf } from 'class-validator'

export const TEST_RUN_MODES = WorkflowRunMode
export type TestRunMode = WorkflowRunMode

export class CreateWorkflowTestRunDto {
  @IsIn(Object.values(TEST_RUN_MODES), { message: '测试运行模式无效' })
  mode!: TestRunMode

  @IsString({ message: '目标节点 ID 必须是字符串' })
  @ValidateIf((dto: CreateWorkflowTestRunDto) => dto.mode === TEST_RUN_MODES.SINGLE_NODE)
  targetNodeId?: string

  @IsObject({ message: '工作流定义必须是对象' })
  definition!: Record<string, unknown>

  @IsObject({ message: '工作流布局必须是对象' })
  layout!: Record<string, unknown>

  @IsObject({ message: '运行输入必须是对象' })
  @IsOptional()
  input?: Record<string, unknown>
}
