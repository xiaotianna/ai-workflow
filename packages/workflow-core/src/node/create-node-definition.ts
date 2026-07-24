import { DataType } from '../port/data-types'
import {
  DEFAULT_INPUT_PORT,
  DEFAULT_INPUT_PORT_ID,
  DEFAULT_OUTPUT_PORT,
  DEFAULT_OUTPUT_PORT_ID,
} from '../port/port-resets'
import { PortDefinition, PortMap } from '../port/port-types'
import { NodeDefinition } from './node-definition'

interface PortOptions extends Omit<PortDefinition, 'dataType'> {
  id?: string
  dataType?: DataType
}

// 标准化端口类型
type NormalizedPort = PortDefinition & { id: string }

// 把端口的简写，统一成包含id和默认配置的端口对象
const normalizePort = (
  port: string | PortOptions | false | undefined,
  defaultId: string,
  defaultDefinition: PortDefinition,
): false | NormalizedPort => {
  // 不需要端口的情况
  if (port === false) {
    return false
  }

  // 只传入了端口id
  if (typeof port === 'string') {
    return {
      id: port,
      ...defaultDefinition,
    }
  }

  // 传入了端口配置或者什么都没有传
  return {
    id: port?.id ?? defaultId,
    ...defaultDefinition,
    ...port,
  }
}

// 把normalizePort标准化的端口转为PortMap的格式
const createPortMap = (port: false | NormalizedPort): PortMap => {
  // 如果normalizePort返回的是false，没有端口的情况
  if (port === false) {
    return {}
  }

  // 有端口的情况
  const { id, dataType, ...definition } = port
  return {
    [id]: {
      dataType,
      ...definition,
    },
  }
}

// createNodeDefinition的参数，去掉ports字段，然后新增了inputPort、outputPort
interface CreateNodeDefinitionOptions extends Omit<NodeDefinition, 'ports'> {
  inputPort?: string | PortOptions | false
  outputPort?: string | PortOptions | false
}

/**
 * 给普通节点自动生成一进一出的ports，并为 Start、End、Condition 和自定义多端口节点提供轻量例外配置。
 * 不需要手写：
 *  ports: {
        inputs: {
            input: {},
        },
        outputs: {
            result: {},
        },
    }
  但是仅限于一个输入、一个输出端口，如果有多个端口，使用节点定义的resolvePorts
  ⚠️注意：如果要使用resolvePorts，需要把inputPort/outputPort设置为false
 */
export const createNodeDefinition = (options: CreateNodeDefinitionOptions): NodeDefinition => {
  const { inputPort, outputPort, ...definition } = options
  const normalizedInput = normalizePort(inputPort, DEFAULT_INPUT_PORT_ID, DEFAULT_INPUT_PORT)
  const normalizedOutput = normalizePort(outputPort, DEFAULT_OUTPUT_PORT_ID, DEFAULT_OUTPUT_PORT)

  return {
    ...definition,
    ports: {
      inputs: createPortMap(normalizedInput),
      outputs: createPortMap(normalizedOutput),
    },
  }
}
