/* eslint-disable import/no-nodejs-modules */

import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const MAX_ERROR_TEXT_BYTES = 8 * 1024

function errorText(error) {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  return String(error)
}

function failure(code, message) {
  const buffer = Buffer.from(message, 'utf8')
  return {
    status: 'FAILED',
    error: {
      code,
      message:
        buffer.byteLength <= MAX_ERROR_TEXT_BYTES
          ? message
          : buffer.subarray(0, MAX_ERROR_TEXT_BYTES).toString('utf8'),
      retryable: false,
    },
  }
}

function serializeSuccess(outputs, maxOutputBytes) {
  if (outputs === null || typeof outputs !== 'object' || Array.isArray(outputs)) {
    return failure('PLUGIN_EXECUTOR_RESULT_INVALID', '插件 Executor 必须返回 JSON 对象')
  }
  let serialized
  try {
    serialized = JSON.stringify(outputs)
  } catch (error) {
    return failure('PLUGIN_EXECUTOR_RESULT_INVALID', `插件执行结果无法序列化：${errorText(error)}`)
  }
  if (Buffer.byteLength(serialized, 'utf8') > maxOutputBytes) {
    return failure('PLUGIN_EXECUTOR_OUTPUT_TOO_LARGE', '插件执行结果超过平台大小限制')
  }
  return { status: 'SUCCEEDED', outputs }
}

async function executePlugin(sourcePath, request) {
  const module = await import(pathToFileURL(sourcePath).href)
  if (typeof module.default !== 'function') {
    throw Object.assign(new Error('插件 Executor 缺少默认函数导出'), {
      code: 'PLUGIN_EXECUTOR_INVALID',
    })
  }
  const result = await module.default({
    config: request.config ?? {},
    inputs: request.inputs ?? {},
    workflowRunId: request.context?.workflowRunId ?? '',
    nodeRunId: request.context?.nodeRunId ?? '',
    attempt: request.context?.attempt ?? 1,
    signal: new AbortController().signal,
  })
  if (result === null || typeof result !== 'object' || Array.isArray(result)) {
    throw Object.assign(new Error('插件 Executor 必须返回结果对象'), {
      code: 'PLUGIN_EXECUTOR_RESULT_INVALID',
    })
  }
  return result.outputs
}

async function main() {
  const [requestPath, sourcePath, resultPath] = process.argv.slice(2),
    request = JSON.parse(await readFile(requestPath, 'utf8'))
  let envelope
  try {
    const outputs = await executePlugin(sourcePath, request)
    envelope = serializeSuccess(await outputs, request.maxOutputBytes)
  } catch (error) {
    envelope = failure(
      typeof error?.code === 'string' ? error.code : 'PLUGIN_EXECUTOR_RUNTIME_ERROR',
      errorText(error),
    )
  }
  await writeFile(resultPath, JSON.stringify(envelope), {
    mode: 0o600,
    flag: 'wx',
  })
}

await main()
