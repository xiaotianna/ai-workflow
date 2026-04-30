import { registerNode } from '../registry'
import { chatNode } from './chat'

export * from './chat'

/**
 * nodes的导出配置作用：
 * - node-schema：在数据进入系统或执行前做校验/补默认值时用。
 *   场景：
 *      - 执行节点前确保参数类型正确
 *      - 用户在表单里提交节点参数后 schema.parse(...)
 * - node-definition：在渲染与编排层使用
 *   场景：
 *      - 画布里显示节点标题、图标、输入输出端口
 *      - 属性面板根据 inputs 渲染控件（textarea/select/slider）
 *      - 节点注册中心收集所有可用节点元信息
 */

export const nodes = [chatNode]

const setup = () => nodes.forEach((node) => registerNode(node.definition))

setup()
