import { createInitialConfig } from '../../node/create-initial-config'
import { NODE_VARIABLE_RENDERER_TYPES } from '../../form/node-variable-form'
import type { NodeType } from '../../node/node-definition'
import { subWorkflowNodeDefinition } from './definition'
import { subWorkflowNodeForm } from './form'
import { subWorkflowNodeSchema } from './schema'

export {
  createSubWorkflowNodeVariables,
  type SubWorkflowTargetContract,
} from './create-sub-workflow-variables'
export {
  subWorkflowNodeSchema,
  subWorkflowReferenceSchema,
  type SubWorkflowNodeConfig,
  type SubWorkflowReference,
} from './schema'

export const subWorkflowNode = {
  schema: subWorkflowNodeSchema,
  definition: subWorkflowNodeDefinition,
  form: subWorkflowNodeForm,
  variableForm: {
    input: {
      label: '输入变量',
      description: '映射到所选子工作流开始节点的输入变量',
      renderer: NODE_VARIABLE_RENDERER_TYPES.INPUT_BINDINGS,
    },
  },
  createInitialConfig: () => createInitialConfig(subWorkflowNodeSchema),
} satisfies NodeType<typeof subWorkflowNodeSchema>
