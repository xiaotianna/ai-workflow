import { parse } from '@babel/parser'

import type { NodeOutputDefinition } from '../../node/workflow-node-schema'
import { DATA_TYPE_KINDS } from '../../port/data-types'

interface AstNode {
  type: string
  [key: string]: unknown
}

const FUNCTION_NODE_TYPES = new Set([
  'ArrowFunctionExpression',
  'FunctionDeclaration',
  'FunctionExpression',
  'ObjectMethod',
  'ClassMethod',
  'ClassPrivateMethod',
])

const OUTPUT_KEY_PATTERN = /^[a-zA-Z_]\w*$/

function isAstNode(value: unknown): value is AstNode {
  return typeof value === 'object' && value !== null && 'type' in value
}

function isIdentifier(node: unknown, name?: string): node is AstNode {
  return isAstNode(node) && node.type === 'Identifier' && (name === undefined || node.name === name)
}

function isFunctionNode(node: unknown): node is AstNode {
  return isAstNode(node) && FUNCTION_NODE_TYPES.has(node.type)
}

function findMainFunction(program: AstNode): AstNode | undefined {
  const body = Array.isArray(program.body) ? program.body : []
  let mainFunction: AstNode | undefined = undefined

  for (const programStatement of body) {
    if (!isAstNode(programStatement)) continue

    const statement =
      (programStatement.type === 'ExportNamedDeclaration' ||
        programStatement.type === 'ExportDefaultDeclaration') &&
      isAstNode(programStatement.declaration)
        ? programStatement.declaration
        : programStatement

    if (statement.type === 'FunctionDeclaration' && isIdentifier(statement.id, 'main')) {
      mainFunction = statement
      continue
    }

    if (statement.type === 'VariableDeclaration' && Array.isArray(statement.declarations)) {
      for (const declaration of statement.declarations) {
        if (
          isAstNode(declaration) &&
          isIdentifier(declaration.id, 'main') &&
          isFunctionNode(declaration.init)
        ) {
          mainFunction = declaration.init
        }
      }
      continue
    }

    const expression = statement.type === 'ExpressionStatement' ? statement.expression : undefined
    if (
      isAstNode(expression) &&
      expression.type === 'AssignmentExpression' &&
      isIdentifier(expression.left, 'main') &&
      isFunctionNode(expression.right)
    ) {
      mainFunction = expression.right
    }
  }

  return mainFunction
}

function getStaticPropertyKey(property: AstNode): string | undefined {
  if (property.type !== 'ObjectProperty') return undefined

  const key = property.key
  let value: unknown = undefined

  if (isIdentifier(key) && property.computed !== true) {
    value = key.name
  } else if (isAstNode(key) && key.type === 'StringLiteral') {
    value = key.value
  } else if (
    isAstNode(key) &&
    key.type === 'TemplateLiteral' &&
    Array.isArray(key.expressions) &&
    key.expressions.length === 0 &&
    Array.isArray(key.quasis)
  ) {
    const quasi = key.quasis[0]
    const quasiValue = isAstNode(quasi) ? quasi.value : undefined
    value =
      typeof quasiValue === 'object' && quasiValue !== null && 'cooked' in quasiValue
        ? quasiValue.cooked
        : undefined
  }

  return typeof value === 'string' && OUTPUT_KEY_PATTERN.test(value) ? value : undefined
}

function collectObjectKeys(objectExpression: AstNode, keys: string[], knownKeys: Set<string>) {
  const properties = Array.isArray(objectExpression.properties) ? objectExpression.properties : []

  for (const property of properties) {
    if (!isAstNode(property)) continue

    const key = getStaticPropertyKey(property)
    if (!key || knownKeys.has(key)) continue

    knownKeys.add(key)
    keys.push(key)
  }
}

function collectReturnedObjectKeys(
  node: AstNode,
  keys: string[],
  knownKeys: Set<string>,
  root = true,
) {
  if (!root && isFunctionNode(node)) return

  if (node.type === 'ReturnStatement') {
    if (isAstNode(node.argument) && node.argument.type === 'ObjectExpression') {
      collectObjectKeys(node.argument, keys, knownKeys)
    }
    return
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isAstNode(item)) collectReturnedObjectKeys(item, keys, knownKeys, false)
      }
    } else if (isAstNode(value)) {
      collectReturnedObjectKeys(value, keys, knownKeys, false)
    }
  }
}

/**
 * 静态提取 main 函数直接返回的对象字面量顶层 Key。
 * 语法尚未完成时返回 undefined，让编辑器保留最后一次有效输出定义。
 */
export function deriveCodeNodeOutputs(code: string): NodeOutputDefinition[] | undefined {
  let program: AstNode | undefined = undefined

  try {
    program = parse(code, { sourceType: 'module' }).program as unknown as AstNode
  } catch {
    return undefined
  }

  const mainFunction = findMainFunction(program)
  if (!mainFunction) return []

  const keys: string[] = []
  const knownKeys = new Set<string>()
  const body = mainFunction.body

  if (isAstNode(body) && body.type === 'ObjectExpression') {
    collectObjectKeys(body, keys, knownKeys)
  } else if (isAstNode(body)) {
    collectReturnedObjectKeys(body, keys, knownKeys)
  }

  return keys.map((key) => ({
    key,
    label: key,
    dataType: DATA_TYPE_KINDS.JSON,
  }))
}

/**
 * 代码返回字段由源码管理；用户显式配置了 value 的附加映射仍然保留。
 */
export function synchronizeCodeNodeOutputs(
  code: string,
  outputs: readonly NodeOutputDefinition[],
): NodeOutputDefinition[] {
  const derivedOutputs = deriveCodeNodeOutputs(code)
  if (!derivedOutputs) return [...outputs]

  const derivedKeys = new Set(derivedOutputs.map((output) => output.key))
  const mappedOutputs = outputs.filter(
    (output) => output.value !== undefined && !derivedKeys.has(output.key),
  )

  return [...derivedOutputs, ...mappedOutputs]
}
