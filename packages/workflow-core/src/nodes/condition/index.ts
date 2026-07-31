import type { z } from 'zod'
import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import type { PortDefinition } from '../../port/port-types'
import { CONDITION_LOGICAL_OPERATOR_KINDS } from './constant'
import { conditionNodeDefinition } from './definition'
import { conditionNodeForm } from './form'
import { conditionNodeSchema } from './schema'
import { generateUuid } from '@ai-workflow/shared/utils/uuid'

export const conditionNode = {
  schema: conditionNodeSchema,
  definition: conditionNodeDefinition,
  form: conditionNodeForm,
  createInitialConfig: () =>
    createInitialConfig(conditionNodeSchema, {
      conditions: [
        {
          portId: generateUuid(),
          conditionLabel: 'CASE1',
          rules: [],
          isFallback: false,
        },
        {
          portId: generateUuid(),
          conditionLabel: 'ELSE',
          rules: [],
          isFallback: true,
        },
      ],
    }),
  resolvePorts: (config: z.output<typeof conditionNodeSchema>) => ({
    // 固定输入端口
    inputs: conditionNodeDefinition.ports.inputs,
    // 动态输出端口，每个分支对应一个输出 Handle
    /**
     * 生成结构：
     *  outputs: {
          'condition-1': {  },
          'condition-2': {  },
          'condition-else': {  },
        },
     */
    outputs: Object.fromEntries(
      /**
       * 生成结构：
       *  [
       *    [{
      *        'condition-1',
              {
                label: '高优先级',
                dataType: DATA_TYPE_KINDS.JSON,
                description: 'priority >= 10',
              },
       *    }],
       *  [{...}], [{...}] ]
      */
      config.conditions.map((condition): [string, PortDefinition] => [
        condition.portId,
        {
          label: condition.conditionLabel,
          dataType: DATA_TYPE_KINDS.JSON,
          description: condition.isFallback
            ? '其他条件均不满足时进入该分支'
            : `需要${
                condition.logicalOperator === CONDITION_LOGICAL_OPERATOR_KINDS.AND ? '同时' : '任意'
              }满足 ${condition.rules.length} 个条件`,
        },
      ]),
    ),
  }),
} satisfies NodeType<typeof conditionNodeSchema>

export * from './constant'
export type {
  ConditionItem,
  ConditionItemInput,
  ConditionNodeConfig,
  ConditionNodeConfigInput,
  ConditionRule,
  ConditionRuleInput,
} from './schema'
