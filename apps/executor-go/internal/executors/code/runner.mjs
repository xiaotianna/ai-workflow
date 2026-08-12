/* eslint-disable import/no-nodejs-modules */

import { readFile, realpath, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const MAIN_EXPORT_NAME = '__aiWorkflowMain_6f7dd58d'

// 携带稳定错误码供 Go 执行器区分用户错误和运行时错误
class CodeExecutionFailureError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'CodeExecutionFailureError'
    this.code = code
  }
}

function createFailure(code, message) {
  return new CodeExecutionFailureError(code, message)
}

function errorText(error) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }

  return String(error)
}

function errorStack(error) {
  if (!(error instanceof Error) || typeof error.stack !== 'string') return undefined

  return error.stack.slice(0, 8000)
}

function classifyFailure(error, stage) {
  if (error instanceof CodeExecutionFailureError) {
    return {
      code: error.code,
      message: error.message,
      stack: errorStack(error),
    }
  }

  const text = errorText(error),
    stack = errorStack(error)

  // 加载阶段负责识别导出 缺失依赖和 ESM 语法错误
  if (stage === 'load') {
    if (
      error instanceof SyntaxError &&
      (text.includes("Export 'main' is not defined") ||
        text.includes("does not provide an export named 'main'"))
    ) {
      return {
        code: 'CODE_MAIN_NOT_FOUND',
        message: 'JavaScript ESM 代码必须声明 main 函数',
        stack,
      }
    }

    if (error && typeof error === 'object' && error.code === 'ERR_MODULE_NOT_FOUND') {
      return {
        code: 'CODE_MODULE_NOT_FOUND',
        message: `加载 JavaScript ESM 模块失败：${text}`,
        stack,
      }
    }

    if (error instanceof SyntaxError) {
      return {
        code: 'CODE_SYNTAX_ERROR',
        message: `JavaScript ESM 语法错误：${text}`,
        stack,
      }
    }

    return {
      code: 'CODE_RUNTIME_ERROR',
      message: `加载 JavaScript ESM 模块失败：${text}`,
      stack,
    }
  }

  return {
    code: 'CODE_RUNTIME_ERROR',
    message: `JavaScript main 函数执行失败：${text}`,
    stack,
  }
}

export async function executeCodeModule(moduleUrl, inputs, maxOutputBytes) {
  let stage = 'load'

  try {
    // 动态导入让用户代码完整运行在 Node ESM 环境
    const userModule = await import(moduleUrl),
      main = userModule[MAIN_EXPORT_NAME]

    if (typeof main !== 'function') {
      throw createFailure('CODE_MAIN_NOT_FOUND', 'JavaScript ESM 代码必须声明 main 函数')
    }

    // await 同时兼容同步返回值和异步 Promise 返回值
    stage = 'main'
    const outputs = await main(inputs)

    // 节点输出协议只接受非空且非数组的对象
    if (outputs === null || typeof outputs !== 'object' || Array.isArray(outputs)) {
      throw createFailure('CODE_OUTPUT_INVALID', 'JavaScript main 函数必须返回 JSON 对象')
    }

    // 在 Node 侧完成序列化以尽早发现循环引用等非法输出
    let serializedOutputs = undefined
    try {
      serializedOutputs = JSON.stringify(outputs)
    } catch (error) {
      throw createFailure(
        'CODE_OUTPUT_INVALID',
        `JavaScript main 函数返回值无法序列化：${errorText(error)}`,
      )
    }

    if (serializedOutputs === undefined) {
      throw createFailure('CODE_OUTPUT_INVALID', 'JavaScript main 函数返回值不是有效 JSON 对象')
    }

    // 按 UTF8 字节数限制输出避免多字节文本绕过大小限制
    if (Buffer.byteLength(serializedOutputs, 'utf8') > maxOutputBytes) {
      throw createFailure('CODE_OUTPUT_TOO_LARGE', 'Code 节点输出超过 4 MiB 大小限制')
    }

    return `{"status":"SUCCEEDED","outputs":${serializedOutputs}}`
  } catch (error) {
    return JSON.stringify({
      status: 'FAILED',
      error: classifyFailure(error, stage),
    })
  }
}

async function runFromCommandLine() {
  // Go 通过固定位置参数传入用户模块 输入文件 结果文件和输出上限
  const userModulePath = process.argv[2],
    inputsPath = process.argv[3],
    resultPath = process.argv[4],
    rawMaxOutputBytes = process.argv[5],
    maxOutputBytes = Number(rawMaxOutputBytes)

  if (!userModulePath || !inputsPath || !resultPath || !Number.isSafeInteger(maxOutputBytes)) {
    throw new Error('Node Code Runner 启动参数无效')
  }

  const inputs = JSON.parse(await readFile(inputsPath, 'utf8')),
    payload = await executeCodeModule(pathToFileURL(userModulePath).href, inputs, maxOutputBytes)

  // 结果文件只允许首次创建避免覆盖同一次执行的既有结果
  await writeFile(resultPath, payload, { encoding: 'utf8', flag: 'wx' })
  process.exit(0)
}

async function isInvokedAsMainModule() {
  const invokedPath = process.argv[1]
  if (!invokedPath) return false

  // 真实路径归一化兼容 macOS 的 var 和 private var 软链接
  const [modulePath, executedPath] = await Promise.all([
    realpath(fileURLToPath(import.meta.url)),
    realpath(invokedPath),
  ])

  return modulePath === executedPath
}

if (await isInvokedAsMainModule()) {
  runFromCommandLine().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
