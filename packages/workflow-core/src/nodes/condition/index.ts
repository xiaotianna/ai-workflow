import type { z } from 'zod'
import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import type { PortDefinition } from '../../port/port-types'
import { conditionNodeDefinition } from './definition'
import { conditionNodeSchema } from './schema'
import { generateUuid } from '@ai-workflow/shared/utils/uuid'

export const conditionNode = {
  schema: conditionNodeSchema,
  definition: conditionNodeDefinition,
  createInitialConfig: () =>
    createInitialConfig(conditionNodeSchema, {
      conditions: [
        {
          portId: generateUuid(),
          conditionLabel: '条件 1',
          condition: '',
          isFallback: false,
        },
        {
          portId: generateUuid(),
          conditionLabel: '其他',
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
          description: condition.isFallback ? '其他条件均不满足时进入该分支' : condition.condition,
        },
      ]),
    ),
  }),
} satisfies NodeType<typeof conditionNodeSchema>

export type { ConditionNodeConfig } from './schema'
