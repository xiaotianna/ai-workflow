#!/usr/bin/env node

const cliUrl = new URL('../dist/cli.js', import.meta.url)

try {
  await import(cliUrl.href)
} catch (error) {
  if (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ERR_MODULE_NOT_FOUND' &&
    'url' in error &&
    error.url === cliUrl.href
  ) {
    process.stderr.write('未找到 @ai-workflow/plugin-cli 构建产物，请先构建该 package。\n')
    process.exitCode = 1
  } else {
    throw error
  }
}
